"use client";

import { createAuthClient } from "better-auth/client";
import type { BetterAuthClientPlugin } from "better-auth/client";
import { jazzPluginClient } from "jazz-tools/better-auth/auth/client";

const betterAuthUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.trim();

if (!betterAuthUrl) {
  throw new Error("NEXT_PUBLIC_BETTER_AUTH_URL is required for Better Auth.");
}

if (
  !betterAuthUrl.startsWith("http://") &&
  !betterAuthUrl.startsWith("https://")
) {
  throw new Error("NEXT_PUBLIC_BETTER_AUTH_URL must start with http:// or https://.");
}

export const authClient = createAuthClient({
  baseURL: betterAuthUrl,
  plugins: [jazzPluginClient() as unknown as BetterAuthClientPlugin],
});
