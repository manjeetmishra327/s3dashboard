'use client';

import { EmptyState } from '@/components/ui/EmptyState';

export default function StudentRequests() {
  return (
    <EmptyState
      icon="users"
      title="No student requests yet"
      description="Student mentorship requests will appear here once your AI profile is complete"
    />
  );
}
