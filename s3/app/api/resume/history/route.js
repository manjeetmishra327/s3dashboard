import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB;
const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request) {
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
      console.error('JWT verification failed in resume history:', error.message);
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Connect to MongoDB
    const client = new MongoClient(uri);
    await client.connect();

    const db = DB_NAME ? client.db(DB_NAME) : client.db();
    const resumesCollection = db.collection('resumes');

    // Get user's resume history
    const resumes = await resumesCollection
      .find({ userId: new ObjectId(decoded.userId) })
      .sort({ uploadedAt: -1 })
      .toArray();

    await client.close();

    // Convert ObjectIds to strings for JSON serialization
    const serializedResumes = resumes.map(resume => ({
      ...resume,
      _id: resume._id.toString(),
      userId: resume.userId.toString()
    }));

    return NextResponse.json({
      resumes: serializedResumes
    });

  } catch (error) {
    console.error('Resume history fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

