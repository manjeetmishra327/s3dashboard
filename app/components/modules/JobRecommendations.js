'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Zap } from 'lucide-react';


const MatchProgressBar = ({ score }) => {
  return (
    <div className="w-full bg-slate-200/70 rounded-full h-2 dark:bg-white/10">
      <div className="bg-white/30 h-2 rounded-full transition-all duration-500" style={{ width: `${score}%` }}></div>
    </div>
  );
};

const JobCard = ({ job, isTop }) => {
  const overlapItems =
    (job?.job_highlights?.Qualifications && Array.isArray(job.job_highlights.Qualifications) && job.job_highlights.Qualifications) ||
    (job?.job_highlights?.Responsibilities && Array.isArray(job.job_highlights.Responsibilities) && job.job_highlights.Responsibilities) ||
    [];
  const overlapBadges = overlapItems.slice(0, 3);

  return (
    <Card className={`group overflow-hidden transition-all duration-300 ease-in-out bg-[var(--card-bg)] border-[var(--card-border)] hover:bg-[var(--elevated-bg)] hover:border-[var(--elevated-border)] hover:shadow-[var(--shadow-soft)] ${isTop ? 'ring-1 ring-[var(--accent-primary)]/20 shadow-[var(--shadow-soft)]' : ''}`}>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 md:flex-[1.35]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-white/5 border border-white/10 text-white/70">
                <Briefcase className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base md:text-lg font-semibold text-white/90 truncate">
                  {job.title}
                </CardTitle>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="text-white/70">{job.company}</span>
                  <span className="text-white/30">•</span>
                  <span className="text-white/55">{job.location}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="md:flex-[0.9] flex flex-col gap-2 md:items-center md:justify-center">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--accent-primary)]/35 bg-[var(--accent-primary-light)] text-[var(--accent-primary)] font-semibold">
                {job.match}%
              </div>
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-white/45">Match score</div>
                <div className="mt-1">
                  <MatchProgressBar score={job.match} />
                </div>
              </div>
            </div>

            {overlapBadges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {overlapBadges.map((b, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-white/5 border border-white/10 text-white/70">
                    {String(b).slice(0, 36)}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          <div className="md:flex-[0.65] flex items-center justify-between md:justify-end gap-3">
            <div className="text-xs text-white/45 hidden md:block">via {job.via}</div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/5 text-white/85 hover:bg-white/10">
                <a href={job.apply_link} target="_blank" rel="noopener noreferrer">Apply</a>
              </Button>
              <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10">
                <a href={job.apply_link} target="_blank" rel="noopener noreferrer">View</a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SkeletonCard = () => (
  <Card className="flex flex-col h-full">
    <CardHeader className="pb-4">
      <div className="w-2/3 h-6 mb-2 bg-slate-200 rounded animate-pulse dark:bg-slate-700"></div>
      <div className="w-1/2 h-4 bg-slate-200 rounded animate-pulse dark:bg-slate-700"></div>
    </CardHeader>
    <CardContent>
      <div className="w-full h-4 mt-4 bg-slate-200 rounded animate-pulse dark:bg-slate-700"></div>
      <div className="w-5/6 h-4 mt-2 bg-slate-200 rounded animate-pulse dark:bg-slate-700"></div>
      <div className="w-3/4 h-4 mt-2 bg-slate-200 rounded animate-pulse dark:bg-slate-700"></div>
    </CardContent>
    <CardFooter className="flex justify-between">
      <div className="w-24 h-9 bg-slate-200 rounded animate-pulse dark:bg-slate-700"></div>
      <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse dark:bg-slate-700"></div>
    </CardFooter>
  </Card>
);

export default function JobRecommendations() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => (b?.match ?? 0) - (a?.match ?? 0));
  }, [jobs]);

  const matchQuality = useMemo(() => {
    const top = sortedJobs?.[0]?.match ?? 0;
    if (top >= 85) return 'High';
    if (top >= 70) return 'Medium';
    return 'Low';
  }, [sortedJobs]);

  const fetchJobs = async (currentPage) => {
    if (currentPage === 1) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const response = await fetch('/api/jobs/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText: 'dummy resume text for now',
          role: 'mern developer',
          location: 'India',
          page: currentPage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch job recommendations');
      }

      const data = await response.json();
      
      if (currentPage === 1) {
        setJobs(data);
      } else {
        setJobs(prevJobs => [...prevJobs, ...data]);
      }
      
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchJobs(1);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchJobs(nextPage);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-transparent">
      <div className="max-w-screen-xl mx-auto">
        <header className="p-6 mb-8 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-subtle)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-semibold text-white/95">AI Matched Jobs</h1>
              <p className="mt-1 text-sm md:text-base text-white/60">Based on your resume analysis and semantic similarity</p>
            </div>
            <div className="flex items-center gap-3 sm:justify-end">
              <div className="px-3 py-2 rounded-[var(--radius-md)] border border-white/10 bg-white/5">
                <div className="text-[11px] uppercase tracking-wide text-white/45">Match quality</div>
                <div className="mt-0.5 text-sm font-semibold text-white/85">{matchQuality}</div>
              </div>
              <div className="px-3 py-2 rounded-[var(--radius-md)] border border-white/10 bg-white/5">
                <div className="text-[11px] uppercase tracking-wide text-white/45">Jobs found</div>
                <div className="mt-0.5 text-sm font-semibold text-white/85">{sortedJobs.length}</div>
              </div>
            </div>
          </div>
        </header>


        
        <main>
          {loading && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
          {!loading && jobs.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4">
                {sortedJobs.map((job, idx) => <JobCard key={job.job_id} job={job} isTop={idx === 0} />)}
              </div>
              <div className="flex justify-center mt-8">
                <Button onClick={handleLoadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            </>
          )}
          {!loading && !error && jobs.length === 0 && (
            <div className="py-16 text-center bg-[var(--card-bg)] border border-dashed border-[var(--card-border)] rounded-[var(--radius-lg)]">
              <h3 className="text-xl font-semibold text-white/90">No strong matches found</h3>
              <p className="mt-2 text-white/55">Try improving your resume score, then re-run matching for better semantic alignment.</p>
            </div>
          )}
        </main>

        
        {error && (
          <div className="py-16 text-center bg-red-50 border border-dashed rounded-lg border-red-300 dark:bg-red-900/20 dark:border-red-700">
            <Zap className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-xl font-semibold text-red-800 dark:text-red-200">An Error Occurred</h3>
            <p className="mt-2 text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}