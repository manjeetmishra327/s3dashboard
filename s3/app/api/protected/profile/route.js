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

    // Verify JWT token directly
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('Token verified directly in profile API:', decoded);
    } catch (error) {
      console.error('JWT verification failed in profile API:', error.message);
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Connect to MongoDB
    const client = new MongoClient(uri);
    await client.connect();

    const db = DB_NAME ? client.db(DB_NAME) : client.db();
    const usersCollection = db.collection('users');

    // Get user profile - convert string userId to ObjectId
    const userProfile = await usersCollection.findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    );

    await client.close();

    if (!userProfile) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Convert ObjectId to string for JSON serialization
    const userForResponse = {
      ...userProfile,
      _id: userProfile._id.toString()
    };

    return NextResponse.json({
      user: userForResponse
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
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

    // Verify JWT token directly
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('JWT verification failed in profile API PUT:', error.message);
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const updateData = await request.json();

    // Connect to MongoDB
    const client = new MongoClient(uri);
    await client.connect();

    const db = DB_NAME ? client.db(DB_NAME) : client.db();
    const usersCollection = db.collection('users');

    // Update user profile
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(decoded.userId) },
      { 
        $set: { 
          ...updateData,
          updatedAt: new Date()
        } 
      }
    );

    await client.close();

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
