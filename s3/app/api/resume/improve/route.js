import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

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
      console.error('JWT verification failed in resume improve:', error.message);
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { resumeId } = await request.json();
    
    if (!resumeId) {
      return NextResponse.json(
        { message: 'Resume ID is required' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const client = new MongoClient(uri);
    await client.connect();

    const db = DB_NAME ? client.db(DB_NAME) : client.db();
    const resumesCollection = db.collection('resumes');

    // Get the resume data
    const resume = await resumesCollection.findOne({
      _id: new ObjectId(resumeId),
      userId: new ObjectId(decoded.userId)
    });

    if (!resume) {
      await client.close();
      return NextResponse.json(
        { message: 'Resume not found' },
        { status: 404 }
      );
    }

    await client.close();

    // Call Python service for AI improvements
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    
    try {
      const pythonResponse = await fetch(`${pythonServiceUrl}/improve-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume_text: resume.analysis?.experience || '',
          skills: resume.analysis?.skills || [],
          ats_score: resume.analysis?.atsScore || 0,
          current_suggestions: resume.analysis?.suggestions || []
        }),
      });

      if (!pythonResponse.ok) {
        throw new Error('Python service failed to improve resume');
      }

      const improvementResult = await pythonResponse.json();

      return NextResponse.json({
        message: 'Resume improvement suggestions generated',
        improvements: improvementResult
      });

    } catch (pythonError) {
      console.error('Python service error:', pythonError);
      
      // Return fallback improvements if Python service fails
      const fallbackImprovements = {
        missingSkills: ['Python', 'Cloud Computing', 'Machine Learning', 'Docker', 'Kubernetes'],
        betterPhrasing: [
          'Use action verbs like "developed", "implemented", "led"',
          'Quantify achievements with numbers and percentages',
          'Add specific technologies and tools used',
          'Include project outcomes and business impact'
        ],
        atsTips: [
          'Use standard section headers (Experience, Education, Skills)',
          'Include relevant keywords from job descriptions',
          'Avoid graphics, tables, or complex formatting',
          'Use consistent date formats',
          'Include a professional summary section'
        ],
        industryTips: [
          'Add relevant certifications and courses',
          'Include GitHub profile or portfolio links',
          'Mention specific projects and their impact',
          'Add soft skills relevant to your field'
        ],
        overallScore: Math.min(100, (resume.analysis?.atsScore || 0) + 15),
        summary: 'Your resume has good potential. Focus on adding more technical depth, quantifiable achievements, and industry-relevant keywords to improve your ATS score.'
      };

      return NextResponse.json({
        message: 'Resume improvement suggestions generated (basic analysis)',
        improvements: fallbackImprovements
      });
    }

  } catch (error) {
    console.error('Resume improve error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

