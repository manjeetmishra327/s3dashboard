export async function GET() {
  // TODO: Forward to FastAPI AI job matcher
  const BACKEND = process.env.BACKEND_URL;
  if (!BACKEND) {
    return Response.json([]);
  }

  try {
    const res = await fetch(`${BACKEND}/jobs`);
    return Response.json(await res.json(), { status: res.status });
  } catch {
    return Response.json([]);
  }
}
