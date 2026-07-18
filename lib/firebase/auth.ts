import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { getFirebaseApp } from "./app";

export type { User };

function authOrNull() {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export async function signInWithGoogle(): Promise<void> {
  const auth = authOrNull();
  if (!auth) throw new Error("Firebase is not configured");
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutUser(): Promise<void> {
  const auth = authOrNull();
  if (auth) await signOut(auth);
}

/** Subscribe to sign-in state. Fires null immediately when Firebase isn't
 * configured (guest-only mode). */
export function subscribeAuth(callback: (user: User | null) => void): () => void {
  const auth = authOrNull();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
