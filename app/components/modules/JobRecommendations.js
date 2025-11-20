'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Briefcase, Heart, ChevronDown, Search, BarChart2, BrainCircuit, Star, Zap, FileText, FileCheck, ListFilter, ArrowUpDown } from 'lucide-react';


const MatchProgressBar = ({ score }) => {
  const scoreColor = score > 90 ? 'bg-emerald-500' : score > 80 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="w-full bg-slate-200 rounded-full h-2 dark:bg-slate-700">
      <div className={`${scoreColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${score}%` }}></div>
    </div>
  );
};

const JobCard = ({ job }) => (
  <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out border-slate-200 hover:border-blue-500 hover:shadow-lg dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-500">
    <CardHeader className="pb-4">
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="flex items-center text-lg font-bold text-slate-800 dark:text-slate-100">
            <Briefcase className="w-5 h-5 mr-3 text-blue-500" />
            {job.title}
          </CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">{job.company}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{job.location}</p>
        </div>
        <div className="flex flex-col items-center pl-2">
          <div className={`text-2xl font-bold ${job.match > 90 ? 'text-emerald-500' : 'text-amber-500'}`}>
            {job.match}%
          </div>
          <p className="text-xs text-slate-500">Match</p>
        </div>
      </div>
      <MatchProgressBar score={job.match} />
    </CardHeader>
    <CardContent className="flex-grow">
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{job.description}</p>
    </CardContent>
    <CardFooter className="flex justify-between pt-4 mt-auto bg-slate-50 dark:bg-slate-800/50">
      <Button asChild variant="default" size="sm">
        <a href={job.apply_link} target="_blank" rel="noopener noreferrer">Apply Now</a>
      </Button>
      <p className="text-xs text-slate-500 dark:text-slate-400">via {job.via}</p>
    </CardFooter>
  </Card>
);

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

  const FilterDropdown = ({ title, options, category }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          {title} <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white dark:bg-slate-800">
        <DropdownMenuLabel className="text-slate-700 dark:text-slate-200">{title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map(option => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={filters[category].includes(option)}
            onCheckedChange={() => handleFilterChange(category, option)}
            className="text-slate-700 dark:text-slate-200"
          >
            {option}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-screen p-4 bg-slate-50 sm:p-6 lg:p-8 dark:bg-slate-900">
      <div className="max-w-screen-xl mx-auto">
        <header className="p-6 mb-8 text-center bg-white border rounded-lg shadow-sm border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          <h1 className="flex items-center justify-center text-3xl font-bold text-slate-800 md:text-4xl dark:text-slate-100">
            AI Job Recommendations <Zap className="w-8 h-8 ml-3 text-amber-500" />
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Find jobs that match your resume and skills.</p>
        </header>


        
        <main>
          {loading && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
          {!loading && jobs.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.map(job => <JobCard key={job.job_id} job={job} />)}
              </div>
              <div className="flex justify-center mt-8">
                <Button onClick={handleLoadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            </>
          )}
          {!loading && !error && jobs.length === 0 && (
            <div className="py-16 text-center bg-white border border-dashed rounded-lg border-slate-300 dark:bg-slate-800 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">No recommendations found</h3>
              <p className="mt-2 text-slate-500">We couldn't find any job recommendations for you at the moment.</p>
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