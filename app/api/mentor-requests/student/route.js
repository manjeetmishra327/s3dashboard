import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { requireAuth } from '../../_utils/auth';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || undefined;

const COLLECTION = 'mentorRequests';

function safeObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

async function attachUserDetails(db, requests) {
  const usersCollection = db.collection('users');

  const ids = new Set();
  for (const r of requests) {
    if (r?.mentorId) ids.add(r.mentorId.toString());
    if (r?.studentId) ids.add(r.studentId.toString());
  }

  const objectIds = [...ids]
    .map((id) => safeObjectId(id))
    .filter(Boolean);

  if (objectIds.length === 0) return requests;

  const users = await usersCollection
    .find({ _id: { $in: objectIds } }, { projection: { password: 0 } })
    .toArray();

  const byId = new Map(users.map((u) => [u._id.toString(), { ...u, _id: u._id.toString() }]));

  return requests.map((r) => {
    const mentor = r?.mentorId ? byId.get(r.mentorId.toString()) : null;
    const student = r?.studentId ? byId.get(r.studentId.toString()) : null;
    return {
      ...r,
      _id: r?._id?.toString?.() || r?._id,
      mentorId: r?.mentorId?.toString?.() || r?.mentorId,
      studentId: r?.studentId?.toString?.() || r?.studentId,
      mentor,
      student,
    };
  });
}

export async function GET(request) {
  let client;
  try {
    if (!MONGODB_URI) {
      return NextResponse.json({ message: 'MONGODB_URI is not configured' }, { status: 500 });
    }

    const { user, response } = requireAuth(request);
    if (response) return response;

    const studentIdObj = safeObjectId(user?.userId);
    if (!studentIdObj) {
      return NextResponse.json({ message: 'Invalid user id' }, { status: 400 });
    }

    client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = MONGODB_DB ? client.db(MONGODB_DB) : client.db();
    const collection = db.collection(COLLECTION);

    const requests = await collection.find({ studentId: studentIdObj }).sort({ createdAt: -1 }).toArray();
    const hydrated = await attachUserDetails(db, requests);

    return NextResponse.json({ requests: hydrated });
  } catch (error) {
    console.error('Mentor requests student GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  } finally {
    if (client) {
      try {
        await client.close();
      } catch {}
    }
  }
}
