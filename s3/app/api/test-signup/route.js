import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB;

export async function POST() {
  try {
    const client = new MongoClient(uri);
    await client.connect();

    const db = DB_NAME ? client.db(DB_NAME) : client.db();
    const usersCollection = db.collection('users');

    // Check if test user already exists
    const existingUser = await usersCollection.findOne({ email: 'test@example.com' });
    if (existingUser) {
      await client.close();
      return NextResponse.json({
        message: 'Test user already exists',
        email: 'test@example.com',
        password: 'test123'
      });
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('test123', 12);
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      phone: '1234567890',
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

    const result = await usersCollection.insertOne(testUser);
    await client.close();

    return NextResponse.json({
      message: 'Test user created successfully',
      email: 'test@example.com',
      password: 'test123',
      userId: result.insertedId
    });

  } catch (error) {
    console.error('Test signup error:', error);
    return NextResponse.json({
      message: 'Error creating test user',
      error: error.message
    }, { status: 500 });
  }
}
