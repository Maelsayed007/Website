import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// Initialize Firebase App on the server if it hasn't been already.
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const firestore = getFirestore(getApp());

export { firestore };
