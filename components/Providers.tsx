"use client";

import { ReactNode } from "react";
import { ProfileProvider } from "@/components/profile/ProfileContext";
import { LanguageProvider } from "@/components/i18n/LanguageContext";

/** Client-side context providers that wrap the whole app. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <ProfileProvider>{children}</ProfileProvider>
    </LanguageProvider>
  );
}
