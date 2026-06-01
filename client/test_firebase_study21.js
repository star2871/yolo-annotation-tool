import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDSAIEVR_5wKhw2gumkpYXm2urtIY47pYI",
  authDomain: "study21.firebaseapp.com",
  projectId: "study21",
  storageBucket: "study21.appspot.com",
  messagingSenderId: "422619551959",
  appId: "1:422619551959:web:09862523b64bc6f9fdb892"
};

console.log("Connecting to project:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    const snapshot = await getDocs(collection(db, 'images'));
    console.log("SUCCESS! Images count:", snapshot.docs.length);
  } catch (e) {
    console.error("ERROR:", e.message);
  }
  process.exit(0);
}

test();
