import type { FirebaseOptions } from "firebase/app";

/**
 * Real online play (different devices) needs a free Firebase project:
 *
 *   1. Go to https://console.firebase.google.com -> Add project (any name,
 *      Analytics off is fine).
 *   2. In the project: Build -> Realtime Database -> Create Database ->
 *      choose a region -> Start in locked mode.
 *   3. In the database's Rules tab, paste and publish:
 *        {
 *          "rules": {
 *            "rooms": {
 *              "$code": { ".read": true, ".write": true }
 *            }
 *          }
 *        }
 *      (Rooms are unguessable 6-char codes; this keeps everything else in
 *      the database locked while letting players sync their game rooms.)
 *   4. Project settings (gear icon) -> Your apps -> Web app (</>) ->
 *      register -> copy the `firebaseConfig` object it shows you.
 *   5. Paste that object below in place of `null`.
 *
 * While this is null, online mode still works between tabs/windows on ONE
 * device (great for trying it out) -- it just can't reach other devices.
 * The Firebase web config is safe to commit: it's a public identifier, not
 * a secret; access control lives in the database rules.
 */
export const FIREBASE_CONFIG: FirebaseOptions | null = null;
