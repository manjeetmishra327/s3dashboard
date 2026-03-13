import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // TODO: Forward to FastAPI resume parser
    const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';
    const body = await request.formData();
    const res = await fetch(`${BACKEND}/resume/parse`, {
      method: 'POST',
      body,
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (error) {
    console.error('Error processing resume:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process resume' },
      { status: 500 }
    );
  }
}
