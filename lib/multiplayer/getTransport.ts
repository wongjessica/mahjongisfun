import { FIREBASE_CONFIG } from "./firebaseConfig";
import { LocalTransport } from "./localTransport";
import { RoomTransport } from "./transport";

let cached: RoomTransport | null = null;

export function isOnlineAcrossDevices(): boolean {
  return FIREBASE_CONFIG !== null;
}

/** Firebase when configured (real cross-device play), otherwise the
 * same-device LocalTransport. Lazy + dynamic so the Firebase SDK is only
 * pulled into the client when a config actually exists. */
export async function getTransport(): Promise<RoomTransport> {
  if (cached) return cached;
  if (FIREBASE_CONFIG) {
    const { FirebaseTransport } = await import("./firebaseTransport");
    cached = new FirebaseTransport();
  } else {
    cached = new LocalTransport();
  }
  return cached;
}
