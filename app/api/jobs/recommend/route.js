// app/api/jobs/recommend/route.js
import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// Gemini embeddings endpoint
const GEMINI_EMBED_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent';

// JSearch endpoint (RapidAPI)
const JSEARCH_URL = 'https://jsearch.p.rapidapi.com/search';

// ---------- 1. GEMINI: get embedding for a given text ----------
async function getEmbedding(text) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const res = await fetch(GEMINI_EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(
      `Gemini embeddings request failed: ${res.status} ${res.statusText} - ${errorBody}`,
    );
  }

  const data = await res.json();

  // data.embedding.values OR data.embeddings[0].values
  const values =
    data.embedding?.values || data.embeddings?.[0]?.values;

  if (!values || !Array.isArray(values)) {
    throw new Error('Unexpected embedding format from Gemini API');
  }

  return values;
}

// ---------- 2. COSINE SIMILARITY ----------
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  if (normA === 0 || normB === 0) return 0;

  return dot / (normA * normB);
}

// ---------- 3. FETCH REAL JOBS FROM JSEARCH ----------
async function fetchJobsFromJSearch(query, location = '', page = 1) {
  if (!RAPIDAPI_KEY) {
    throw new Error('RAPIDAPI_KEY is not configured.');
  }

  const url = new URL(JSEARCH_URL);
  // basic search query – you can customize later:
  url.searchParams.set('query', query); // e.g. "mern developer in india"
  url.searchParams.set('page', page.toString());
  url.searchParams.set('num_pages', '1'); // 1 page = up to 10 jobs
  // optional filters:
  // url.searchParams.set('date_posted', 'week'); // today | 3days | week | month

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(
      `JSearch request failed: ${res.status} ${res.statusText} - ${errorBody}`,
    );
  }

  const data = await res.json();

  const jobs = data?.data || [];

  // Normalize into a simpler shape for your frontend
  return jobs.map((job) => ({
    job_id: job.job_id,
    title: job.job_title,
    company: job.employer_name,
    location: job.job_city
      ? `${job.job_city}, ${job.job_country}` 
      : job.job_country || 'Not specified',
    description: job.job_description,
    employment_type: job.job_employment_type,
    apply_link: job.job_apply_link,
    via: job.job_publisher,
    posted_at: job.job_posted_at || job.job_posted_at_datetime_utc,
    // you can add salary fields later
  }));
}

// ---------- 4. MAIN ROUTE: POST /api/jobs/recommend ----------
export async function POST(request) {
  try {
    const body = await request.json();

    const resumeText = body?.resumeText;
    const rolePreference = body?.role || ''; // optional – from UI later
    const locationPreference = body?.location || '';
    const page = body?.page || 1;

    if (!resumeText || typeof resumeText !== 'string') {
      return NextResponse.json(
        { error: 'resumeText (string) is required in request body.' },
        { status: 400 },
      );
    }

    // 1️⃣ Generate embedding for resume
    const resumeEmbedding = await getEmbedding(resumeText);

    // 2️⃣ Build a search query for JSearch
    // Very simple for now: use rolePreference if provided,
    // else default to "software developer".
    let searchQuery = 'software developer';
    if (rolePreference && typeof rolePreference === 'string') {
      searchQuery = rolePreference;
    }
    if (locationPreference) {
      searchQuery += ` in ${locationPreference}`;
    }

    // 3️⃣ Fetch real jobs from JSearch
    const jobs = await fetchJobsFromJSearch(searchQuery, locationPreference, page);

    if (!jobs.length) {
      return NextResponse.json(
        { jobs: [], message: 'No jobs found for this query.' },
        { status: 200 },
      );
    }

    // 4️⃣ Get embeddings for each job description
    const jobEmbeddings = await Promise.all(
      jobs.map((job) => getEmbedding(job.description || job.title)),
    );

    // 5️⃣ Compute similarity and build final recommendations
    const recommendations = jobs.map((job, index) => {
      const sim = cosineSimilarity(resumeEmbedding, jobEmbeddings[index]);
      return {
        ...job,
        match: Math.round(sim * 100), // percentage
      };
    });

    // 6️⃣ Sort by match score and send top 5
    const topRecommendations = recommendations
      .sort((a, b) => b.match - a.match)
      .slice(0, 5);

    return NextResponse.json(topRecommendations, { status: 200 });
  } catch (error) {
    console.error('Error in /api/jobs/recommend:', error);
    return NextResponse.json(
      {
        error: error.message || 'An unexpected error occurred.',
      },
      { status: 500 },
    );
  }
}