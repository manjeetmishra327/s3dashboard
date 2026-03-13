export async function fetchJobs(userId) {
  // TODO: Connect to FastAPI /api/jobs after AI profile is built
  const res = await fetch(`/api/jobs?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) return [];
  return res.json();
}
