export async function parseResume(file) {
  // TODO: Connect to FastAPI /api/resume/parse
  const formData = new FormData();
  formData.append('resume', file);
  const res = await fetch('/api/resume/parse', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Resume parsing failed');
  return res.json();
}
