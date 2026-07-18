import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { FIREBASE_CONFIG } from "@/lib/multiplayer/firebaseConfig";

/** One shared Firebase app for every feature (multiplayer transport, auth,
 * cloud profiles). initializeApp throws if called twice, so both the
 * transport and the auth layer must go through this memoized getter.
 * Returns null when no config is set (device-only mode / local dev). */
export function getFirebaseApp(): FirebaseApp | null {
  if (!FIREBASE_CONFIG) return null;
  return getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
}

export function isFirebaseConfigured(): boolean {
  return FIREBASE_CONFIG !== null;
}
