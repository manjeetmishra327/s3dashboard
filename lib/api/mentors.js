export async function fetchMentors(userId) {
  // TODO: Connect to FastAPI /api/mentors after AI profile is built
  const res = await fetch(`/api/mentors?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) return [];
  return res.json();
}
