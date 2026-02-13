import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || undefined;

export async function GET(request) {
  let client;
  try {
    if (!MONGODB_URI) {
      return NextResponse.json({ message: 'MONGODB_URI is not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = MONGODB_DB ? client.db(MONGODB_DB) : client.db();
    const usersCollection = db.collection('users');

    const query = role ? { role: role.toString().trim().toLowerCase() } : {};

    const users = await usersCollection
      .find(query, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    const safeUsers = users.map((u) => ({
      ...u,
      _id: u?._id?.toString?.() || u?._id,
    }));

    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  } finally {
    if (client) {
      try {
        await client.close();
      } catch {}
    }
  }
}
