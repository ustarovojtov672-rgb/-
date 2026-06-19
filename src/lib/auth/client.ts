"use client";

import { createAuthClient } from "better-auth/client";
import type { BetterAuthClientPlugin } from "better-auth/client";
import { jazzPluginClient } from "jazz-tools/better-auth/auth/client";

const configuredBetterAuthUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.trim();

if (!configuredBetterAuthUrl) {
  throw new Error("NEXT_PUBLIC_BETTER_AUTH_URL is required for Better Auth.");
}

if (
  !configuredBetterAuthUrl.startsWith("http://") &&
  !configuredBetterAuthUrl.startsWith("https://")
) {
  throw new Error("NEXT_PUBLIC_BETTER_AUTH_URL must start with http:// or https://.");
}

export const authClient = createAuthClient({
  baseURL: resolveBetterAuthUrl(configuredBetterAuthUrl),
  plugins: [jazzPluginClient() as unknown as BetterAuthClientPlugin],
});

function resolveBetterAuthUrl(configuredUrl: string) {
  if (typeof window === "undefined") {
    return configuredUrl;
  }

  const configured = new URL(configuredUrl);
  const current = new URL(window.location.origin);

  if (
    configured.protocol === current.protocol &&
    configured.port === current.port &&
    isLoopbackHost(configured.hostname) &&
    isLoopbackHost(current.hostname)
  ) {
    return current.origin;
  }

  return configuredUrl;
}

function isLoopbackHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "");

  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}
