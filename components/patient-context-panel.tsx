import * as React from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/lib/utils';
import { Patient } from '@/lib/db/schema';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChevronDownIcon } from '@/components/icons';

interface PatientContextPanelProps {
  patient: Patient | null;
  className?: string;
}

export function PatientContextPanel({
  patient,
  className,
}: PatientContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!patient) {
    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const formattedDateOfBirth = patient.dateOfBirth
    ? format(new Date(patient.dateOfBirth), 'MMMM d, yyyy')
    : 'Not available';
    
  const variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0,
    },
    expanded: {
      height: 'auto',
      opacity: 1,
      marginTop: '0.5rem',
      marginBottom: '0.25rem',
    },
  };

  return (
    <Card className={cn('w-full shadow-sm border-slate-200 dark:border-slate-700', className)}>
      <CardHeader className="p-3 pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base font-medium">{patient.name}</CardTitle>
            <CardDescription className="text-xs">
              {formattedDateOfBirth} · {patient.gender}
            </CardDescription>
          </div>
          <button
            onClick={toggleExpanded}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={isExpanded ? 'Collapse patient info' : 'Expand patient info'}
          >
            <div className={cn(
              'transition-transform duration-200',
              isExpanded ? 'transform rotate-180' : ''
            )}>
              <ChevronDownIcon size={18} />
            </div>
          </button>
        </div>
      </CardHeader>
      
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="patient-details"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <CardContent className="px-3 py-2">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-medium text-muted-foreground">Date of Birth</h4>
                    <p className="text-xs">{formattedDateOfBirth}</p>
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-medium text-muted-foreground">Gender</h4>
                    <p className="text-xs">{patient.gender}</p>
                  </div>
                </div>
                
                <div className="space-y-0.5">
                  <h4 className="text-xs font-medium text-muted-foreground">Patient ID</h4>
                  <p className="text-xs font-mono">{patient.id}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="px-3 pt-0 pb-2">
              <div className="w-full flex justify-end">
                <button 
                  className="text-xs text-primary hover:underline"
                  onClick={() => {}}
                >
                  View full profile
                </button>
              </div>
            </CardFooter>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
