"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import type { Attachment, UIMessage } from 'ai';

import { Chat } from '@/components/chat';
import { PatientContextPanel } from '@/components/patient-context-panel';
import { fetcher } from '@/lib/utils';
import type { Patient } from '@/lib/db/schema';
import type { VisibilityType } from './visibility-selector';

interface PatientChatWrapperProps {
  id: string;
  initialMessages: Array<UIMessage>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  patientData?: Patient | null; // Server-rendered patient data
}

export function PatientChatWrapper({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
  patientData,
}: PatientChatWrapperProps) {
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId');
  
  // Fetch the selected patient if patientId is provided and we don't already have server-rendered data
  const { data: patientFromQuery, error } = useSWR<Patient>(
    !patientData && patientId ? `/api/patient?id=${patientId}` : null,
    fetcher
  );
  
  // Use server-rendered data if available, otherwise use client-fetched data
  const patient = patientData || patientFromQuery;

  return (
    <div className="flex flex-col w-full h-full relative">
      {/* Patient Context Panel at the top */}
      {patient && (
        <div className="sticky top-16 z-10 bg-background px-4 pt-2 pb-0 w-full md:max-w-3xl mx-auto">
          <PatientContextPanel patient={patient} />
        </div>
      )}
      
      {/* Error message if patient data fails to load */}
      {patientId && !patient && error && (
        <div className="px-4 pt-2 pb-2 w-full md:max-w-3xl mx-auto">
          <div className="p-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
            Unable to load patient information. Please try again.
          </div>
        </div>
      )}
      
      {/* Chat interface below */}
      <Chat
        id={id}
        initialMessages={initialMessages}
        selectedChatModel={selectedChatModel}
        selectedVisibilityType={selectedVisibilityType}
        isReadonly={isReadonly}
        patientId={patient?.id} // Pass patient ID to Chat component if available
      />
    </div>
  );
}
