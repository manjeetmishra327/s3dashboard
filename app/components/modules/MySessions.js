'use client';

import { EmptyState } from '@/components/ui/EmptyState';

export default function MySessions() {
  return (
    <EmptyState
      icon="trending-up"
      title="No sessions yet"
      description="Your upcoming mentorship sessions will appear here once your AI profile is complete"
    />
  );
}
