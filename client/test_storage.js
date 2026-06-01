import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadString } from "firebase/storage";
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY.replace(/"/g, ''),
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN.replace(/"/g, ''),
  projectId: process.env.VITE_FIREBASE_PROJECT_ID.replace(/"/g, ''),
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET.replace(/"/g, ''),
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID.replace(/"/g, ''),
  appId: process.env.VITE_FIREBASE_APP_ID.replace(/"/g, '')
};

console.log("Connecting to Storage for project:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function test() {
  try {
    const storageRef = ref(storage, 'test_image.txt');
    await uploadString(storageRef, 'test');
    console.log("SUCCESS! Storage upload works.");
  } catch (e) {
    console.error("ERROR:", e.message);
  }
  process.exit(0);
}

test();
