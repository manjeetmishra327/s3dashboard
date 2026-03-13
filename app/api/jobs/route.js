export async function GET() {
  // TODO: Forward to FastAPI AI job matcher
  const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';
  const res = await fetch(`${BACKEND}/jobs`);
  return Response.json(await res.json());
}
