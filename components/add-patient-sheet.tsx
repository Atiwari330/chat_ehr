'use client';

import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface AddPatientSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function AddPatientSheet({ open, onOpenChange, trigger }: AddPatientSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState({
    patientName: '',
    dateOfBirth: '',
    gender: '',
  });
  const { mutate } = useSWRConfig();
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Use controlled props if provided, or internal state otherwise
  const isOpen = open !== undefined ? open : sheetOpen;
  const setIsOpen = onOpenChange || setSheetOpen;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormValues(prev => ({
      ...prev,
      gender: value
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formValues.patientName,
          dateOfBirth: formValues.dateOfBirth,
          gender: formValues.gender,
        }),
      });

      if (response.ok) {
        toast.success('Patient added successfully!');
        // Reset form and close sheet
        setFormValues({
          patientName: '',
          dateOfBirth: '',
          gender: '',
        });
        setIsOpen(false);
        // Refresh patient list
        mutate('/api/patient');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Something went wrong');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {trigger && (
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
      )}
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add New Patient</SheetTitle>
          <SheetDescription>
            Enter the patient's basic demographic information.
          </SheetDescription>
        </SheetHeader>
        <form id="patientForm" className="space-y-6 py-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="patientName">Patient Name</Label>
            <Input
              id="patientName"
              name="patientName"
              placeholder="Full name"
              required
              value={formValues.patientName}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              required
              value={formValues.dateOfBirth}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select 
              name="gender" 
              required 
              value={formValues.gender}
              onValueChange={handleSelectChange}
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        <SheetFooter className="pt-4">
          <SheetClose asChild>
            <Button variant="outline" type="button" disabled={isSubmitting}>Cancel</Button>
          </SheetClose>
          <Button 
            type="submit" 
            form="patientForm" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
