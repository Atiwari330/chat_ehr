import {
  UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import { auth } from '@/app/(auth)/auth';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
  getPatientById,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
      patientId,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
      patientId?: string;
    } = await request.json();

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Patient context retrieval and security check
    let patient = null;
    let patientContextString = ''; // Initialize an empty context string

    if (patientId) {
      try {
        // For debugging
        console.log(`Attempting to fetch patient data for ID: ${patientId}`);

        patient = await getPatientById({ id: patientId });

        // For debugging
        console.log('Fetched patient:', patient);

        // Security check - verify patient exists and belongs to the current user
        if (!patient || patient.userId !== session.user.id) {
          // Security warning - attempted access to non-existent or unauthorized patient
          console.warn(
            `Security warning: User ${session.user.id} attempted to access patient ${patientId} ` +
            `which ${!patient ? 'does not exist' : 'belongs to another user'}`
          );
          patient = null; // Ensure we don't use this patient data
        } else {
          console.log('Patient authorization successful');

          // Format date of birth for better readability
          const dob = new Date(patient.dateOfBirth);
          const formattedDOB = dob.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          // Create a well-formatted patient context string
          patientContextString = `
Current Patient Context:
Name: ${patient.name}
Date of Birth: ${formattedDOB}
Gender: ${patient.gender}
Patient ID: ${patient.id}
---
Remember this patient context for your responses. Refer to the patient by name and consider their specific details when providing information.

          `;

          console.log('Created patient context string for prompt');
        }
      } catch (error) {
        console.error('Error fetching patient data:', error);
        patient = null;
      }
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await saveChat({ id, userId: session.user.id, title });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    return createDataStreamResponse({
      execute: (dataStream) => {
        // Get the base system prompt
        const baseSystemPrompt = systemPrompt({ selectedChatModel });
        
        // Create the final system prompt by prepending patient context if available
        const finalSystemPrompt = patientContextString 
          ? patientContextString + baseSystemPrompt 
          : baseSystemPrompt;
        
        // For debugging
        if (patientContextString) {
          console.log('Using enhanced system prompt with patient context');
        }
        
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: finalSystemPrompt, // Use the enhanced prompt when available
          messages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (_) {
                console.error('Failed to save chat');
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 404,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}
