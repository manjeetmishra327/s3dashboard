import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // TODO: Forward to FastAPI resume suggestions
    const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';
    const body = await request.json();
    const res = await fetch(`${BACKEND}/resume/suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: request.headers.get('authorization') || '',
      },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
