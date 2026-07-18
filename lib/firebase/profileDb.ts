import { get, getDatabase, onValue, ref, update } from "firebase/database";
import { getFirebaseApp } from "./app";
import { Profile, normalizeProfile } from "@/lib/profile/types";

function dbOrNull() {
  const app = getFirebaseApp();
  return app ? getDatabase(app) : null;
}

export interface CloudIdentity {
  name: string;
  photoURL: string | null;
  icon: string;
}

/** Live subscription to a user's cloud profile. */
export function subscribeProfile(uid: string, callback: (profile: Profile | null) => void): () => void {
  const db = dbOrNull();
  if (!db) {
    callback(null);
    return () => {};
  }
  return onValue(
    ref(db, `users/${uid}`),
    (snap) => callback(snap.exists() ? normalizeProfile(snap.val()) : null),
    // Permission-denied (e.g. before the /users DB rules are published) must
    // not spam the console or break sign-in -- fall back to null (guest
    // data stays authoritative).
    () => callback(null)
  );
}

/** Merge fields into a user's cloud record (never a full overwrite, so
 * concurrent updates to different keys don't clobber each other). */
export async function writeProfile(
  uid: string,
  patch: { wallet?: Profile["wallet"]; stats?: Profile["stats"]; identity?: CloudIdentity }
): Promise<void> {
  const db = dbOrNull();
  if (!db) return;
  const flat: Record<string, unknown> = {};
  if (patch.wallet) flat["wallet"] = patch.wallet;
  if (patch.stats) flat["stats"] = patch.stats;
  if (patch.identity) {
    flat["name"] = patch.identity.name;
    flat["icon"] = patch.identity.icon;
    if (patch.identity.photoURL) flat["photoURL"] = patch.identity.photoURL;
  }
  // Swallow permission-denied so a not-yet-configured /users rule never
  // surfaces as an unhandled rejection.
  await update(ref(db, `users/${uid}`), flat).catch(() => {});
}

/** Record co-players as mutual-ish friends: writes each `friends/<uid>` entry
 * on THIS user's record (the other clients write their own). */
export async function addFriends(uid: string, friends: Record<string, string>): Promise<void> {
  const db = dbOrNull();
  if (!db || Object.keys(friends).length === 0) return;
  const flat: Record<string, string> = {};
  for (const [fid, name] of Object.entries(friends)) {
    if (fid && fid !== uid) flat[`friends/${fid}`] = name;
  }
  if (Object.keys(flat).length > 0) await update(ref(db, `users/${uid}`), flat).catch(() => {});
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  icon: string;
  photoURL: string | null;
  online: number;
  wins: number;
  handsPlayed: number;
  isSelf: boolean;
}

/** One-shot read of this user plus everyone in their friends list, for the
 * leaderboard. Missing/failed reads are skipped rather than fatal. */
export async function readLeaderboard(uid: string): Promise<LeaderboardEntry[]> {
  const db = dbOrNull();
  if (!db) return [];
  const selfSnap = await get(ref(db, `users/${uid}`));
  const self = selfSnap.val() as (Profile & CloudIdentity) | null;
  const friendUids = Object.keys(self?.friends ?? {});

  const entries: LeaderboardEntry[] = [];
  const toRead = [uid, ...friendUids];
  await Promise.all(
    toRead.map(async (id) => {
      try {
        const snap = id === uid ? selfSnap : await get(ref(db, `users/${id}`));
        const v = snap.val() as (Profile & CloudIdentity) | null;
        if (!v) return;
        entries.push({
          uid: id,
          name: String(v.name ?? "Player"),
          icon: String(v.icon ?? "🙂"),
          photoURL: (v.photoURL as string) ?? null,
          online: Number(v.wallet?.online ?? 0) || 0,
          wins: Number(v.stats?.wins ?? 0) || 0,
          handsPlayed: Number(v.stats?.handsPlayed ?? 0) || 0,
          isSelf: id === uid,
        });
      } catch {
        // Unreadable friend record -- skip it.
      }
    })
  );
  return entries.sort((a, b) => b.online - a.online);
}
