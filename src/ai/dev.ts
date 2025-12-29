
import { config } from 'dotenv';
config();

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Connect to the local Firestore emulator in the dev environment.
const firebaseApp = initializeApp(firebaseConfig);
connectFirestoreEmulator(getFirestore(firebaseApp), '127.0.0.1', 8080);


import '@/ai/flows/generate-houseboat-descriptions.ts';
import '@/ai/flows/suggest-restaurant-menu-descriptions.ts';
import '@/ai/flows/chatbot-flow.ts';
