export async function GET() {
  // TODO: Forward to FastAPI progress tracker
  const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';
  const res = await fetch(`${BACKEND}/progress`);
  return Response.json(await res.json());
}
