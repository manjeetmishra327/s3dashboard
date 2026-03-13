'use client';

import { EmptyState } from '@/components/ui/EmptyState';

export default function ProgressTracker() {
  return (
    <EmptyState
      icon="trending-up"
      title="Progress Tracker"
      description="Your learning roadmap and skill progress will appear\n               here once your AI profile is complete"
      action={{ label: 'Build Your Profile', href: '/profile' }}
    />
  );
}