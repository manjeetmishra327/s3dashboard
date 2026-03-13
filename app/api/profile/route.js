export async function GET() {
  // TODO: Forward to FastAPI AI profile engine
  const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';
  const res = await fetch(`${BACKEND}/profile`);
  return Response.json(await res.json());
}
