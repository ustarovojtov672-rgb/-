import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { jazzPlugin } from "jazz-tools/better-auth/auth/server";
import { JazzBetterAuthDatabaseAdapter } from "jazz-tools/better-auth/database-adapter";

import { authEnv } from "@/lib/auth/env";

export const auth = betterAuth({
  baseURL: authEnv.betterAuthUrl,
  secret: authEnv.betterAuthSecret,
  trustedOrigins: trustedAuthOrigins(authEnv.betterAuthUrl),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
  },
  database: JazzBetterAuthDatabaseAdapter({
    syncServer: authEnv.jazzAuthSyncPeer,
    accountID: authEnv.jazzAuthWorkerAccount,
    accountSecret: authEnv.jazzAuthWorkerSecret,
  }),
  plugins: [jazzPlugin(), nextCookies()],
});

function trustedAuthOrigins(baseUrl: string) {
  const url = new URL(baseUrl);
  const origins = new Set([url.origin]);

  if (isLoopbackHost(url.hostname)) {
    const port = url.port ? `:${url.port}` : "";

    origins.add(`${url.protocol}//localhost${port}`);
    origins.add(`${url.protocol}//127.0.0.1${port}`);
    origins.add(`${url.protocol}//[::1]${port}`);
  }

  return Array.from(origins);
}

function isLoopbackHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "");

  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}
