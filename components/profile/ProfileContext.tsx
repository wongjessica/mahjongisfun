"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { GameState } from "@/lib/mahjong/state";
import { isFirebaseConfigured } from "@/lib/firebase/app";
import { getSavedIcon } from "@/components/setup/IconPicker";
import { getSavedPlayerName } from "@/components/online/useOnlineRoom";
import { loadLocalProfile, saveLocalProfile } from "@/lib/profile/localStore";
import { setCurrentUid } from "@/lib/profile/session";
import { EMPTY_PROFILE, Profile, applyRoundToProfile } from "@/lib/profile/types";

export interface AuthUser {
  uid: string;
  name: string;
  photoURL: string | null;
}

interface ProfileContextValue {
  /** null = signed out (guest); undefined = still resolving auth. */
  user: AuthUser | null | undefined;
  profile: Profile;
  /** True when Google sign-in is even possible (Firebase configured). */
  canSignIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Persist a finished round's wallet + stats (cloud if signed in, else
   * localStorage). Safe to call once per round. */
  recordRound: (state: GameState, seat: number, isOnline: boolean) => void;
  /** Record online co-players (uid -> name) as friends, signed-in only. */
  recordFriends: (friends: Record<string, string>) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(isFirebaseConfigured() ? undefined : null);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const profileRef = useRef<Profile>(EMPTY_PROFILE);
  const userRef = useRef<AuthUser | null | undefined>(user);
  // Lazily-loaded firebase helpers (kept out of the guest bundle path).
  const cloud = useRef<null | typeof import("@/lib/firebase/profileDb")>(null);
  const auth = useRef<null | typeof import("@/lib/firebase/auth")>(null);

  const applyProfile = useCallback((p: Profile) => {
    profileRef.current = p;
    setProfile(p);
  }, []);

  // Guest profile from localStorage on mount.
  useEffect(() => {
    applyProfile(loadLocalProfile());
  }, [applyProfile]);

  // Subscribe to auth (only if Firebase is configured).
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    let unsubProfile: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      auth.current = await import("@/lib/firebase/auth");
      cloud.current = await import("@/lib/firebase/profileDb");
      if (cancelled) return;

      auth.current.subscribeAuth((u) => {
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
        if (!u) {
          setCurrentUid(null);
          setUser(null);
          userRef.current = null;
          applyProfile(loadLocalProfile());
          return;
        }
        const authUser: AuthUser = { uid: u.uid, name: u.displayName ?? "Player", photoURL: u.photoURL ?? null };
        setCurrentUid(u.uid);
        setUser(authUser);
        userRef.current = authUser;

        // Capture the guest profile to migrate on very first sign-in.
        const guest = loadLocalProfile();
        let seeded = false;
        unsubProfile = cloud.current!.subscribeProfile(u.uid, (cloudProfile) => {
          if (cloudProfile) {
            applyProfile(cloudProfile);
            return;
          }
          // No cloud record yet: seed it from the guest wallet/stats once,
          // so signing in never wipes progress made as a guest.
          if (seeded) return;
          seeded = true;
          const initial: Profile = { ...guest, friends: {} };
          applyProfile(initial);
          void cloud.current!.writeProfile(u.uid, {
            wallet: initial.wallet,
            stats: initial.stats,
            identity: { name: authUser.name, photoURL: authUser.photoURL, icon: getSavedIcon() },
          });
        });
      });
    })();

    return () => {
      cancelled = true;
      if (unsubProfile) unsubProfile();
    };
  }, [applyProfile]);

  const signIn = useCallback(async () => {
    if (!auth.current) auth.current = await import("@/lib/firebase/auth");
    await auth.current.signInWithGoogle();
  }, []);

  const signOut = useCallback(async () => {
    if (!auth.current) auth.current = await import("@/lib/firebase/auth");
    await auth.current.signOutUser();
  }, []);

  const recordRound = useCallback(
    (state: GameState, seat: number, isOnline: boolean) => {
      const { wallet, stats } = applyRoundToProfile(profileRef.current, state, seat, isOnline);
      const next: Profile = { ...profileRef.current, wallet, stats };
      applyProfile(next);
      const u = userRef.current;
      if (u && cloud.current) {
        void cloud.current.writeProfile(u.uid, { wallet, stats });
      } else {
        saveLocalProfile(next);
      }
    },
    [applyProfile]
  );

  const recordFriends = useCallback((friends: Record<string, string>) => {
    const u = userRef.current;
    if (!u || !cloud.current) return;
    const merged = { ...profileRef.current.friends, ...friends };
    delete merged[u.uid];
    applyProfile({ ...profileRef.current, friends: merged });
    void cloud.current.addFriends(u.uid, friends);
  }, [applyProfile]);

  // Keep the cloud display name/icon fresh if the guest changed their icon.
  useEffect(() => {
    if (!user || !cloud.current) return;
    void cloud.current.writeProfile(user.uid, {
      identity: { name: user.name, photoURL: user.photoURL, icon: getSavedIcon() || getSavedPlayerName() || "🙂" },
    });
  }, [user]);

  return (
    <ProfileContext.Provider
      value={{
        user,
        profile,
        canSignIn: isFirebaseConfigured(),
        signIn,
        signOut,
        recordRound,
        recordFriends,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");
  return ctx;
}
