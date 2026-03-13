'use client';

import { EmptyState } from '@/components/ui/EmptyState';

export default function Availability() {
  return (
    <EmptyState
      icon="trending-up"
      title="Availability"
      description="Your availability settings will appear here once your AI profile is complete"
    />
  );
}
