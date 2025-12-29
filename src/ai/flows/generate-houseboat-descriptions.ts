
'use server';

/**
 * @fileOverview AI-powered houseboat description generator.
 *
 * - generateHouseboatDescription - A function that generates houseboat descriptions based on boat details.
 * - GenerateHouseboatDescriptionInput - The input type for the generateHouseboatDescription function.
 * - GenerateHouseboatDescriptionOutput - The return type for the generateHouseboatDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateHouseboatDescriptionInputSchema = z.object({
  boatName: z.string().describe('The name of the houseboat.'),
  capacity: z.number().describe('The optimal capacity of the houseboat.'),
  features: z.string().describe('Key features of the houseboat, such as number of bedrooms, bathrooms, and special amenities, separated by commas.'),
});
export type GenerateHouseboatDescriptionInput = z.infer<typeof GenerateHouseboatDescriptionInputSchema>;

const GenerateHouseboatDescriptionOutputSchema = z.object({
  description: z.string().describe('A compelling, client-facing marketing description of the houseboat, written in a single paragraph. It should be engaging and highlight the key features and benefits for a luxury getaway.'),
});
export type GenerateHouseboatDescriptionOutput = z.infer<typeof GenerateHouseboatDescriptionOutputSchema>;

export async function generateHouseboatDescription(
  input: GenerateHouseboatDescriptionInput
): Promise<GenerateHouseboatDescriptionOutput> {
  return generateHouseboatDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateHouseboatDescriptionPrompt',
  input: {schema: GenerateHouseboatDescriptionInputSchema},
  output: {schema: GenerateHouseboatDescriptionOutputSchema},
  prompt: `You are a marketing expert specializing in crafting engaging descriptions for luxury houseboat rentals. Your tone should be inviting, elegant, and focused on the experience.

  Create a single-paragraph description for the houseboat named "{{boatName}}". 
  
  This model is ideal for {{capacity}} guests.
  It features: {{features}}.

  Highlight its best qualities and the unique experience it offers. Do not list the features; instead, weave them into a narrative about comfort, luxury, and adventure.
  `,
});

const generateHouseboatDescriptionFlow = ai.defineFlow(
  {
    name: 'generateHouseboatDescriptionFlow',
    inputSchema: GenerateHouseboatDescriptionInputSchema,
    outputSchema: GenerateHouseboatDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
