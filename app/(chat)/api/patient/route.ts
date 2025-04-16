import { auth } from '@/app/(auth)/auth';
import {
  createPatient,
  getPatientsByUserId,
  getPatientById,
} from '@/lib/db/queries';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { name, dateOfBirth, gender } = await request.json();

    // Basic validation
    if (!name || !dateOfBirth || !gender) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: name, dateOfBirth, and gender are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create the patient record
    const patient = await createPatient({
      name,
      dateOfBirth: new Date(dateOfBirth),
      gender, 
      userId: session.user.id,
    });

    // Return the created patient with status 201
    return new Response(JSON.stringify(patient), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create patient' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Check if an ID is provided in the URL to get a specific patient
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (id) {
      // Get specific patient by ID
      const patient = await getPatientById({ id });
      
      if (!patient) {
        return new Response('Patient not found', { status: 404 });
      }
      
      // Ensure the user can only access their own patients
      if (patient.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 403 });
      }
      
      return new Response(JSON.stringify(patient), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Get all patients for the user if no ID is provided
    const patients = await getPatientsByUserId({
      userId: session.user.id,
    });

    return new Response(JSON.stringify(patients), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch patients' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
