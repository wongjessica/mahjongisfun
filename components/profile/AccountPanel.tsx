"use client";

import { useState } from "react";
import { useProfile } from "./ProfileContext";
import { StatsModal } from "./StatsModal";

/** Sign-in row on the setup screen: signed out shows "Sign in with Google
 * (save your stats)"; signed in shows the account + a Stats/Leaderboard
 * button. Hidden entirely if Firebase auth isn't configured. */
export function AccountPanel() {
  const { user, canSignIn, signIn, signOut } = useProfile();
  const [busy, setBusy] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canSignIn) return null;

  const doSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn();
    } catch {
      setError("Sign-in was cancelled or blocked. Try again?");
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <>
        <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2">
          <span className="flex min-w-0 items-center gap-2">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                {user.name.charAt(0)}
              </span>
            )}
            <span className="truncate text-sm font-semibold text-slate-700">{user.name}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setStatsOpen(true)}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
            >
              📊 Stats
            </button>
            <button onClick={() => void signOut()} className="text-xs font-medium text-slate-400 underline hover:text-slate-600">
              Sign out
            </button>
          </span>
        </div>
        {statsOpen && <StatsModal onClose={() => setStatsOpen(false)} />}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={doSignIn}
        disabled={busy}
        className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 disabled:opacity-60"
      >
        <GoogleG />
        {busy ? "Signing in…" : "Sign in with Google"}
        <span className="text-xs font-normal text-slate-400">· save your stats</span>
      </button>
      {error && <p className="text-center text-xs text-rose-500">{error}</p>}
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
