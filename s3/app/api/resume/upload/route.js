import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB;
const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { message: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { message: 'Token required' },
        { status: 401 }
      );
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('JWT verification failed in resume upload:', error.message);
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('resume');
    
    if (!file) {
      return NextResponse.json(
        { message: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Invalid file type. Please upload PDF, DOC, or DOCX files only.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const fileName = `${decoded.userId}_${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file to disk
    fs.writeFileSync(filePath, buffer);

    // Call Python microservice for parsing
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    
    try {
      const pythonResponse = await fetch(`${pythonServiceUrl}/parse-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath,
          file_type: file.type
        }),
      });

      if (!pythonResponse.ok) {
        throw new Error('Python service failed to parse resume');
      }

      const analysisResult = await pythonResponse.json();

      // Connect to MongoDB
      const client = new MongoClient(uri);
      await client.connect();

      const db = DB_NAME ? client.db(DB_NAME) : client.db();
      const resumesCollection = db.collection('resumes');

      // Store resume data in MongoDB
      const resumeData = {
        userId: new ObjectId(decoded.userId),
        fileName: file.name,
        filePath: filePath,
        fileSize: file.size,
        fileType: file.type,
        analysis: analysisResult,
        uploadedAt: new Date(),
        createdAt: new Date()
      };

      const result = await resumesCollection.insertOne(resumeData);

      await client.close();

      // Clean up file after processing (optional - you might want to keep it)
      // fs.unlinkSync(filePath);

      return NextResponse.json({
        message: 'Resume uploaded and analyzed successfully',
        resumeId: result.insertedId,
        analysis: analysisResult
      });

    } catch (pythonError) {
      console.error('Python service error:', pythonError);
      
      // If Python service fails, return a basic analysis
      const fallbackAnalysis = {
        atsScore: 75,
        skills: ['General Skills'],
        missingSkills: ['Specific technical skills'],
        experience: 'Experience information not available',
        education: 'Education information not available',
        strengths: ['Resume uploaded successfully'],
        suggestions: ['Consider adding more specific details to your resume'],
        error: 'Advanced parsing temporarily unavailable'
      };

      // Still save to database with fallback analysis
      const client = new MongoClient(uri);
      await client.connect();

      const db = DB_NAME ? client.db(DB_NAME) : client.db();
      const resumesCollection = db.collection('resumes');

      const resumeData = {
        userId: new ObjectId(decoded.userId),
        fileName: file.name,
        filePath: filePath,
        fileSize: file.size,
        fileType: file.type,
        analysis: fallbackAnalysis,
        uploadedAt: new Date(),
        createdAt: new Date()
      };

      const result = await resumesCollection.insertOne(resumeData);
      await client.close();

      return NextResponse.json({
        message: 'Resume uploaded successfully (basic analysis only)',
        resumeId: result.insertedId,
        analysis: fallbackAnalysis
      });
    }

  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

