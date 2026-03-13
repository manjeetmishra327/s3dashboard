export async function POST(req) {
  // TODO: Forward to FastAPI resume parser
  const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';
  const body = await req.formData();
  const res = await fetch(`${BACKEND}/resume/parse`, {
    method: 'POST',
    body,
  });
  return Response.json(await res.json());
}
