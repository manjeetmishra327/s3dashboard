import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB;

export async function POST(request) {
  try {
    const { name, email, password, phone } = await request.json();

    // Validate input
    if (!name || !email || !password || !phone) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const client = new MongoClient(uri);
    await client.connect();

    const db = DB_NAME ? client.db(DB_NAME) : client.db();
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      await client.close();
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = {
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'Student',
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: {
        avatar: null,
        bio: '',
        skills: [],
        experience: [],
        education: []
      }
    };

    const result = await usersCollection.insertOne(newUser);

    await client.close();

    return NextResponse.json(
      { 
        message: 'User created successfully',
        userId: result.insertedId 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
