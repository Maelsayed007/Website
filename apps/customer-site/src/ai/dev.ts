
import { config } from 'dotenv';
config();

// Connect AI flows
import '@/ai/flows/generate-houseboat-descriptions.ts';
import '@/ai/flows/suggest-restaurant-menu-descriptions.ts';
import '@/ai/flows/chatbot-flow.ts';
