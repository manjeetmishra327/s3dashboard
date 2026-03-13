import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // TODO: Forward to FastAPI resume upload
    const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';
    const body = await request.formData();
    const res = await fetch(`${BACKEND}/resume/upload`, {
      method: 'POST',
      headers: {
        authorization: request.headers.get('authorization') || '',
      },
      body,
    });
    return NextResponse.json(await res.json(), { status: res.status });

  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

