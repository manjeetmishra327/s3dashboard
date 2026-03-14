import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // TODO: Forward to FastAPI resume improvement engine
    const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';
    const body = await request.json();
    const res = await fetch(`${BACKEND}/resume/improve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: request.headers.get('authorization') || '',
      },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });

  } catch (error) {
    console.error('Resume improve error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

