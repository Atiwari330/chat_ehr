'use client';

import { useParams } from 'next/navigation';
import type { User } from 'next-auth';
import Link from 'next/link';
import useSWR from 'swr';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { LoaderIcon, UserIcon } from '@/components/icons';
import { fetcher } from '@/lib/utils';
import { Patient } from '@/lib/db/schema';

export function SidebarPatientList({ user }: { user: User | undefined }) {
  const { id } = useParams();
  const { setOpenMobile } = useSidebar();

  const { data, error, isLoading } = useSWR<Patient[]>(
    user ? '/api/patient' : null,
    fetcher
  );

  if (!user) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Login to view and add patients!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
          Patients
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                key={item}
                className="rounded-md h-8 flex gap-2 px-2 items-center"
              >
                <div
                  className="h-4 rounded-md flex-1 max-w-[--skeleton-width] bg-sidebar-accent-foreground/10"
                  style={{
                    '--skeleton-width': `${item}%`,
                  } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (error) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-red-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Error loading patients. Please try again.
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (!data || data.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            No patients added yet. Click the "Add New Patient" button to get started.
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
        Patients
      </div>
      <SidebarGroupContent>
        <SidebarMenu>
          <div className="flex flex-col gap-1">
            {data.map((patient) => (
              <SidebarMenuItem key={patient.id}>
                <SidebarMenuButton asChild isActive={id === `patient-${patient.id}`}>
                  <Link
                    href={`/chat/patient-${patient.id}`}
                    onClick={() => setOpenMobile(false)}
                    className="flex items-center gap-2"
                  >
                    <UserIcon />
                    <span>{patient.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </div>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
