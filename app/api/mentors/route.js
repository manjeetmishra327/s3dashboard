export async function GET() {
  // TODO: Forward to FastAPI AI mentor matcher
  const BACKEND = process.env.BACKEND_URL;
  if (!BACKEND) {
    return Response.json([]);
  }

  try {
    const res = await fetch(`${BACKEND}/mentors`);
    return Response.json(await res.json(), { status: res.status });
  } catch {
    return Response.json([]);
  }
}
