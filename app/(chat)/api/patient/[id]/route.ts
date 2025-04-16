import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getPatientById } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return new NextResponse('Patient ID is required', { status: 400 });
    }

    const patient = await getPatientById({ id });
    
    if (!patient) {
      return new NextResponse('Patient not found', { status: 404 });
    }

    // Ensure the user can only access their own patients
    if (patient.userId !== session.user.id) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    return NextResponse.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
