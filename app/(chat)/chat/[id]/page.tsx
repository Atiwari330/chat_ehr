import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { PatientChatWrapper } from '@/components/patient-chat-wrapper';
import { getChatById, getMessagesByChatId, getPatientById } from '@/lib/db/queries';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { DBMessage } from '@/lib/db/schema';
import { Attachment, UIMessage } from 'ai';
import { generateUUID } from '@/lib/utils';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const session = await auth();
  
  // Check if this is a patient chat (ID starts with 'patient-')
  const isPatientChat = id.startsWith('patient-');
  let patientId = null;
  let patient = null;
  let chat = null;
  let messagesFromDb: DBMessage[] = [];
  
  if (isPatientChat) {
    // Extract the real patient UUID by removing 'patient-' prefix
    patientId = id.replace('patient-', '');
    
    try {
      // Fetch patient data using the clean UUID
      patient = await getPatientById({ id: patientId });
      
      if (!patient) {
        return notFound();
      }
      
      // Security check - ensure user can only access their own patients
      if (!session || !session.user || patient.userId !== session.user.id) {
        return notFound();
      }
      
      // For patient chats, we don't fetch an existing chat - we'll use a temporary ID
      // This avoids the UUID format error when querying with 'patient-{uuid}'
    } catch (error) {
      console.error('Error fetching patient:', error);
      return notFound();
    }
  } else {
    // For regular chats, fetch the chat and messages as normal
    try {
      chat = await getChatById({ id });
      
      if (!chat) {
        return notFound();
      }
      
      // Security check for regular chats
      if (chat.visibility === 'private') {
        if (!session || !session.user) {
          return notFound();
        }
        
        if (session.user.id !== chat.userId) {
          return notFound();
        }
      }
      
      // Fetch messages for regular chats
      messagesFromDb = await getMessagesByChatId({ id });
    } catch (error) {
      console.error('Error fetching chat:', error);
      return notFound();
    }
  }

  function convertToUIMessages(messages: Array<DBMessage>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage['parts'],
      role: message.role as UIMessage['role'],
      content: '',
      createdAt: message.createdAt,
      experimental_attachments:
        (message.attachments as Array<Attachment>) ?? [],
    }));
  }

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get('chat-model');
  const defaultModel = DEFAULT_CHAT_MODEL;
  
  // For patient chats, use patient settings; for regular chats, use chat settings
  const visibilityType = chat ? chat.visibility : 'private';
  const isReadonly = chat ? session?.user?.id !== chat.userId : false;
  
  // For patient chats, we'll use the patient ID as the chat ID to keep things simple
  // This ensures patient chats are unique per patient
  const chatId = isPatientChat ? patientId! : id;

  if (!chatModelFromCookie) {
    return (
      <>
        <PatientChatWrapper
          id={chatId}
          initialMessages={convertToUIMessages(messagesFromDb)}
          selectedChatModel={defaultModel}
          selectedVisibilityType={visibilityType}
          isReadonly={isReadonly}
          patientData={patient}
        />
        <DataStreamHandler id={isPatientChat ? id : chatId} />
      </>
    );
  }

  return (
    <>
      <PatientChatWrapper
        id={chatId}
        initialMessages={convertToUIMessages(messagesFromDb)}
        selectedChatModel={chatModelFromCookie.value}
        selectedVisibilityType={visibilityType}
        isReadonly={isReadonly}
        patientData={patient}
      />
      <DataStreamHandler id={isPatientChat ? id : chatId} />
    </>
  );
}
