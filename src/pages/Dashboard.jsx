import React from 'react';
import AssistantChatSurface from '@/components/assistant/AssistantChatSurface';
import PageShell from '@/components/shared/PageShell';
import useUserProfile from '@/hooks/useUserProfile';

export default function Dashboard() {
  const { profile } = useUserProfile();

  return (
    <PageShell maxWidth="max-w-5xl" contentClassName="min-h-[calc(100dvh-7rem)] flex items-center">
      <AssistantChatSurface profile={profile} className="w-full" />
    </PageShell>
  );
}
