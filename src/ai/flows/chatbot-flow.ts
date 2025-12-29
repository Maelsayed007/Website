'use server';
/**
 * @fileOverview A customer support chatbot flow for Amieira Getaways.
 *
 * - chat - A function that handles a single turn in a chat conversation.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define schemas at the top level
const ChatInputSchema = z.object({
  message: z.string().describe("The user's message to the chatbot."),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  response: z.string().describe("The chatbot's response to the user."),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

// Define the prompt at the top level
const chatbotPrompt = ai.definePrompt({
  name: 'chatbotPrompt',
  input: { schema: ChatInputSchema },
  output: { schema: ChatOutputSchema },
  prompt: `You are a friendly and helpful customer support chatbot for a company called "Amieira Getaways".

Your goal is to answer user questions about the company's offerings, which include:
- Houseboat rentals on the Alqueva lake in Portugal.
- A lakeside restaurant.
- Daily boat travel excursions.

Keep your answers concise and helpful. If you don't know the answer, politely say that you don't have that information and suggest they contact the company directly through the contact page.

User's message: {{{message}}}
`,
});

// Define the flow at the top level
const chatbotFlow = ai.defineFlow(
  {
    name: 'chatbotFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const { output } = await chatbotPrompt(input);
    return output!;
  }
);

// Export only the async wrapper function
export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatbotFlow(input);
}
