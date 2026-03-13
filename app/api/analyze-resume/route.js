import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // TODO: Forward to FastAPI resume analyzer
    const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';
    const body = await request.json();
    const res = await fetch(`${BACKEND}/resume/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });

  } catch (error) {
    console.error('Error in AI analysis:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze resume' },
      { status: 500 }
    );
  }
}
