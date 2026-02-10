import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || undefined; // optional explicit DB name
const COLLECTION = process.env.RESUME_COLLECTION || 'resumes';

export async function POST(request) {
  let client;
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      userId,
      fileName,
      fileSize,
      mimeType,
      analysis,
      score,
      scoreBreakdown,
      penalties,
      breakdownCounts,
      parseDurationMs,
      createdAt
    } = body;

    if (!MONGODB_URI) {
      return NextResponse.json({ error: 'MONGODB_URI is not configured' }, { status: 500 });
    }

    client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = MONGODB_DB ? client.db(MONGODB_DB) : client.db();
    const collection = db.collection(COLLECTION);

    const doc = {
      userId: userId ? (() => { try { return new ObjectId(userId); } catch { return userId; } })() : null,
      fileName: fileName || null,
      fileSize: fileSize || null,
      fileType: mimeType || null,
      analysis: analysis || {},
      score: typeof score === 'number' ? score : null,
      scoreBreakdown: Array.isArray(scoreBreakdown) ? scoreBreakdown : [],
      penalties: Array.isArray(penalties) ? penalties : [],
      breakdownCounts: breakdownCounts || {},
      parseDurationMs: typeof parseDurationMs === 'number' ? parseDurationMs : null,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(doc);

    return NextResponse.json({ success: true, id: result.insertedId }, { status: 201 });
  } catch (e) {
    console.error('Error storing resume analysis:', e);
    return NextResponse.json({ error: 'Failed to store resume analysis' }, { status: 500 });
  } finally {
    if (client) {
      try { await client.close(); } catch {}
    }
  }
}


