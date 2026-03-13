'use client';

import { EmptyState } from '@/components/ui/EmptyState';


export default function JobRecommendations() {
  return (
    <EmptyState
      icon="briefcase"
      title="No job matches yet"
      description="Upload your resume to get AI-powered job matches"
      action={{ label: 'Upload Resume', href: '/profile' }}
    />
  );
}