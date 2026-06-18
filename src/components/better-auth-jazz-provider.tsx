"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "jazz-tools/better-auth/auth/react";

import { authClient } from "@/lib/auth/client";

type JazzAuthProviderClient = Parameters<typeof AuthProvider>[0]["betterAuthClient"];

export function BetterAuthJazzProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider
      betterAuthClient={authClient as unknown as JazzAuthProviderClient}
    >
      {children}
    </AuthProvider>
  );
}
