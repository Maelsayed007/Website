'use server';
/**
 * @fileOverview An AI agent for generating restaurant menu descriptions.
 *
 * - suggestRestaurantMenuDescriptions - A function that handles the generation of menu descriptions.
 * - SuggestRestaurantMenuDescriptionsInput - The input type for the suggestRestaurantMenuDescriptions function.
 * - SuggestRestaurantMenuDescriptionsOutput - The return type for the suggestRestaurantMenuDescriptions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRestaurantMenuDescriptionsInputSchema = z.object({
  dishName: z.string().describe('The name of the dish.'),
  ingredients: z.string().describe('A comma-separated list of the dish\'s ingredients.'),
  cuisineStyle: z.string().describe('The cuisine style of the dish (e.g., Italian, French, Portuguese).'),
});
export type SuggestRestaurantMenuDescriptionsInput = z.infer<typeof SuggestRestaurantMenuDescriptionsInputSchema>;

const SuggestRestaurantMenuDescriptionsOutputSchema = z.object({
  description: z.string().describe('An appealing and informative description of the menu item.'),
});
export type SuggestRestaurantMenuDescriptionsOutput = z.infer<typeof SuggestRestaurantMenuDescriptionsOutputSchema>;

export async function suggestRestaurantMenuDescriptions(input: SuggestRestaurantMenuDescriptionsInput): Promise<SuggestRestaurantMenuDescriptionsOutput> {
  return suggestRestaurantMenuDescriptionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRestaurantMenuDescriptionsPrompt',
  input: {schema: SuggestRestaurantMenuDescriptionsInputSchema},
  output: {schema: SuggestRestaurantMenuDescriptionsOutputSchema},
  prompt: `You are a creative chef specializing in creating mouth-watering menu descriptions.

  Based on the provided dish name, ingredients, and cuisine style, generate a description that entices customers.

  Dish Name: {{{dishName}}}
  Ingredients: {{{ingredients}}}
  Cuisine Style: {{{cuisineStyle}}}

  Description:`,
});

const suggestRestaurantMenuDescriptionsFlow = ai.defineFlow(
  {
    name: 'suggestRestaurantMenuDescriptionsFlow',
    inputSchema: SuggestRestaurantMenuDescriptionsInputSchema,
    outputSchema: SuggestRestaurantMenuDescriptionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
