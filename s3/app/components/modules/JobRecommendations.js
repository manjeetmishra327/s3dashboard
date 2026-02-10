'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Briefcase, Heart, ChevronDown, Search, BarChart2, BrainCircuit, Star, Zap, FileText, FileCheck, ListFilter, ArrowUpDown } from 'lucide-react';

// Enhanced dummy data
const dummyJobs = [
  {
    id: 1, title: 'Backend Developer', company: 'Innovatech Solutions', matchScore: 92, description: 'Design and implement scalable backend services for our cloud platform. Work with Node.js, MongoDB, and Kubernetes.', applyLink: '#', tags: ['#Remote', '#FullTime', '#Node.js'], domain: 'Software', location: 'Remote', experience: 'Mid-Level', datePosted: '2023-10-28T10:00:00Z'
  },
  {
    id: 2, title: 'Data Scientist', company: 'DataDriven Inc.', matchScore: 88, description: 'Analyze large datasets to extract meaningful insights and build predictive models. Experience with Python, TensorFlow, and SQL required.', applyLink: '#', tags: ['#Onsite', '#FullTime', '#Python'], domain: 'Data', location: 'Onsite', experience: 'Senior', datePosted: '2023-10-29T14:30:00Z'
  },
  {
    id: 3, title: 'Frontend Engineer', company: 'Creative Minds Studio', matchScore: 85, description: 'Join our team to build beautiful and responsive user interfaces with React and Next.js. Strong CSS skills are a must.', applyLink: '#', tags: ['#Remote', '#Contract', '#React'], domain: 'Software', location: 'Remote', experience: 'Entry-Level', datePosted: '2023-10-25T09:00:00Z'
  },
  {
    id: 4, title: 'UX/UI Designer', company: 'PixelPerfect Co.', matchScore: 78, description: 'Create intuitive and visually appealing designs for our mobile and web applications. Proficiency in Figma and Adobe XD is essential.', applyLink: '#', tags: ['#FullTime', '#Design'], domain: 'Design', location: 'Onsite', experience: 'Mid-Level', datePosted: '2023-10-27T11:00:00Z'
  },
  {
    id: 5, title: 'DevOps Engineer', company: 'CloudFlow', matchScore: 95, description: 'Manage and automate our CI/CD pipelines and cloud infrastructure on AWS. Experience with Docker and Terraform is crucial.', applyLink: '#', tags: ['#Remote', '#FullTime', '#AWS'], domain: 'Software', location: 'Remote', experience: 'Senior', datePosted: '2023-10-30T16:00:00Z'
  },
];

const MatchProgressBar = ({ score }) => {
  const scoreColor = score > 85 ? 'bg-emerald-500' : score > 75 ? 'bg-amber-500' : 'bg-rose-500';
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
        </div>
        <div className="flex flex-col items-center pl-2">
          <div className={`text-2xl font-bold ${job.matchScore > 85 ? 'text-emerald-500' : 'text-amber-500'}`}>
            {job.matchScore}%
          </div>
          <p className="text-xs text-slate-500">Match</p>
        </div>
      </div>
      <MatchProgressBar score={job.matchScore} />
    </CardHeader>
    <CardContent className="flex-grow">
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{job.description}</p>
      <div className="flex flex-wrap gap-2">
        {job.tags.map(tag => <Badge key={tag} variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{tag}</Badge>)}
      </div>
    </CardContent>
    <CardFooter className="flex justify-between pt-4 bg-slate-50 dark:bg-slate-800/50">
      <Button variant="default" size="sm" onClick={() => window.open(job.applyLink, '_blank')}>Apply Now</Button>
      <Button variant="ghost" size="icon">
        <Heart className="w-5 h-5 text-slate-500 transition-colors hover:text-red-500 hover:fill-current" />
      </Button>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    domain: [],
    location: [],
    experience: [],
  });
  const [sortBy, setSortBy] = useState('matchScore');

  useEffect(() => {
    const timer = setTimeout(() => {
      setJobs(dummyJobs);
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleFilterChange = (category, value) => {
    setFilters(prev => {
      const newValues = prev[category].includes(value)
        ? prev[category].filter(item => item !== value)
        : [...prev[category], value];
      return { ...prev, [category]: newValues };
    });
  };

  const filteredAndSortedJobs = useMemo(() => {
    return jobs
      .filter(job => {
        // Search filter
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = searchLower === '' ||
          job.title.toLowerCase().includes(searchLower) ||
          job.company.toLowerCase().includes(searchLower) ||
          job.description.toLowerCase().includes(searchLower);

        // Checkbox filters
        const matchesDomain = filters.domain.length === 0 || filters.domain.includes(job.domain);
        const matchesLocation = filters.location.length === 0 || filters.location.includes(job.location);
        const matchesExperience = filters.experience.length === 0 || filters.experience.includes(job.experience);

        return matchesSearch && matchesDomain && matchesLocation && matchesExperience;
      })
      .sort((a, b) => {
        if (sortBy === 'matchScore') {
          return b.matchScore - a.matchScore;
        }
        if (sortBy === 'datePosted') {
          return new Date(b.datePosted) - new Date(a.datePosted);
        }
        return 0;
      });
  }, [jobs, searchQuery, filters, sortBy]);

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

        <Card className="mb-8 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <CardHeader className="flex-row items-center gap-4">
            <FileCheck className="w-8 h-8 text-blue-600" />
            <div>
              <CardTitle className="text-base font-semibold text-blue-800 dark:text-blue-200">Showing recommendations for:</CardTitle>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Mohit_Kumar_Mishra_Resume.pdf</p>
            </div>
          </CardHeader>
        </Card>

        {/* Filter and Search Bar */}
        <div className="p-4 mb-8 bg-white border rounded-lg shadow-sm border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          <div className="grid items-center gap-4 md:grid-cols-3">
            <div className="relative md:col-span-1">
              <Search className="absolute w-5 h-5 text-slate-400 left-3 top-1/2 -translate-y-1/2" />
              <Input 
                placeholder="Search by role, company..." 
                className="pl-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 md:col-span-2 md:justify-end">
              <FilterDropdown title="Domain" options={['Software', 'Data', 'Design']} category="domain" />
              <FilterDropdown title="Location" options={['Remote', 'Onsite']} category="location" />
              <FilterDropdown title="Experience" options={['Entry-Level', 'Mid-Level', 'Senior']} category="experience" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <ArrowUpDown className="w-4 h-4" /> Sort By
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white dark:bg-slate-800">
                  <DropdownMenuItem onSelect={() => setSortBy('matchScore')} className="text-slate-700 dark:text-slate-200">Match Score</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSortBy('datePosted')} className="text-slate-700 dark:text-slate-200">Date Posted</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <main>
          {loading && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
          {!loading && jobs.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedJobs.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          )}
          {!loading && filteredAndSortedJobs.length === 0 && (
            <div className="py-16 text-center bg-white border border-dashed rounded-lg border-slate-300 dark:bg-slate-800 dark:border-slate-700">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">No recommendations found</h3>
              <p className="mt-2 text-slate-500">Try adjusting your filters or search query.</p>
            </div>
          )}
        </main>

        {jobs.length > 0 && (
          <section className="p-6 mt-12 bg-white border rounded-lg shadow-sm border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <h2 className="flex items-center text-2xl font-bold text-slate-800 dark:text-slate-100"><BrainCircuit className="w-6 h-6 mr-3 text-blue-500" /> Your Career Insights</h2>
            <div className="grid gap-6 mt-4 md:grid-cols-2">
              <div className="flex items-center p-4 rounded-lg bg-slate-100 dark:bg-slate-700">
                <BarChart2 className="w-8 h-8 mr-4 text-blue-500" />
                <p className="text-slate-700 dark:text-slate-200">You have a <strong>25% better match</strong> for Backend roles.</p>
              </div>
              <div className="flex items-center p-4 rounded-lg bg-slate-100 dark:bg-slate-700">
                <Star className="w-8 h-8 mr-4 text-amber-500" />
                <p className="text-slate-700 dark:text-slate-200">Top Skills Matched: <strong>Node.js, MongoDB, React.js</strong></p>
              </div>
            </div>
          </section>
        )}

        {jobs.length > 0 && (
          <footer className="mt-8 text-center">
            <Button variant="secondary">Load More</Button>
          </footer>
        )}
      </div>
    </div>
  );
}