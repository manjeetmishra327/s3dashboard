'use client';

import { EmptyState } from '@/components/ui/EmptyState';

export default function AIAssistant() {
  return (
    <EmptyState
      icon="user"
      title="AI Assistant"
      description="Your AI assistant will appear here once it is connected to FastAPI"
    />
  );
}