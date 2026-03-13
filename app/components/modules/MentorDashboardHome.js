'use client';

import { EmptyState } from '@/components/ui/EmptyState';

export default function MentorDashboardHome({ user }) {
  return (
    <EmptyState
      icon="users"
      title="Mentor Dashboard"
      description="Your mentor workspace will appear here once your AI profile is complete"
    />
  );
}
