export async function GET() {
  // TODO: Forward to FastAPI AI mentor matcher
  const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';
  const res = await fetch(`${BACKEND}/mentors`);
  return Response.json(await res.json());
}
