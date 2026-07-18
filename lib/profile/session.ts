/** The signed-in user's uid, mirrored here by ProfileProvider so non-React
 * code (e.g. the online player-identity helper) can read it synchronously
 * without threading the auth context everywhere. Null when signed out. */
let currentUid: string | null = null;

export function setCurrentUid(uid: string | null): void {
  currentUid = uid;
}

export function getCurrentUid(): string | null {
  return currentUid;
}
