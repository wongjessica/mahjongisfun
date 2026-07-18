"use client";

import { ReactNode } from "react";
import { ProfileProvider } from "@/components/profile/ProfileContext";

/** Client-side context providers that wrap the whole app. */
export function Providers({ children }: { children: ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>;
}
