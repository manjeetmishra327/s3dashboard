import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET() {
  try {
    console.log('Testing MongoDB connection...');
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB;
    const hasEnv = typeof uri === 'string' && uri.length > 0;
    console.log('MONGODB_URI present:', hasEnv ? 'yes' : 'no');
    if (!hasEnv) {
      return NextResponse.json({
        message: 'MongoDB connection failed',
        error: 'MONGODB_URI is not set. Add it to .env.local and restart the server.',
        debug: {
          envKeys: Object.keys(process.env).filter(k => k.includes('MONGODB') || k.includes('MONGO')),
          cwd: process.cwd()
        }
      }, { status: 500 });
    }

    const client = new MongoClient(uri);
    await client.connect();
    
    console.log('MongoDB connection successful');
    
    const db = dbName ? client.db(dbName) : client.db();
    const collections = await db.listCollections().toArray();
    
    await client.close();
    
    return NextResponse.json({
      message: 'MongoDB connection successful',
      collections: collections.map(col => col.name)
    });
    
  } catch (error) {
    console.error('MongoDB test error:', error);
    
    return NextResponse.json({
      message: 'MongoDB connection failed',
      error: error.message
    }, { status: 500 });
  }
}
