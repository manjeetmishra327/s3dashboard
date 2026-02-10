import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB;
const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const client = new MongoClient(uri);
    await client.connect();

    const db = DB_NAME ? client.db(DB_NAME) : client.db();
    const usersCollection = db.collection('users');

    // Find user by email
    const user = await usersCollection.findOne({ email });
    if (!user) {
      await client.close();
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await client.close();
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    await client.close();

    // Return user data (without password) and token
    const { password: _, ...userWithoutPassword } = user;
    
    // Convert ObjectId to string for JSON serialization
    const userForResponse = {
      ...userWithoutPassword,
      _id: userWithoutPassword._id.toString()
    };

    return NextResponse.json({
      message: 'Login successful',
      token,
      user: userForResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Check if it's a MongoDB connection error
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return NextResponse.json(
        { message: 'Database connection failed. Please try again later.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
