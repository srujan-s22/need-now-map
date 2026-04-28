import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

// Validate using the already-resolved config object, NOT dynamic process.env lookups
function isPresent(val: string): boolean {
  return val.trim().length > 0;
}

export const hasFirebaseConfig =
  isPresent(firebaseConfig.apiKey) &&
  isPresent(firebaseConfig.authDomain) &&
  isPresent(firebaseConfig.projectId) &&
  isPresent(firebaseConfig.storageBucket) &&
  isPresent(firebaseConfig.messagingSenderId) &&
  isPresent(firebaseConfig.appId);

// Dev-only console warning when config is missing
if (!hasFirebaseConfig) {
  const missing = Object.entries(firebaseConfig)
    .filter(([, v]) => !isPresent(v))
    .map(([k]) => k);

  console.warn(
    `⚠️ Firebase is not configured. Missing values for: ${missing.join(", ")}\n\n` +
    `To enable live Firestore sync:\n` +
    `  1. Copy .env.example to .env.local\n` +
    `  2. Fill in your Firebase project values from https://console.firebase.google.com\n` +
    `  3. Restart the dev server (npm run dev)\n\n` +
    `The app will run in local demo mode until Firebase is configured.`
  );
}

let db: Firestore | null = null;

try {
  if (hasFirebaseConfig) {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
  db = null;
}

export { db };
