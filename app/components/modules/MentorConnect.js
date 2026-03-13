'use client';

import { EmptyState } from '@/components/ui/EmptyState';

export default function MentorConnect() {
  return (
    <EmptyState
      icon="users"
      title="No mentor matches yet"
      description="Complete your AI profile to get matched with mentors"
    />
  );
}