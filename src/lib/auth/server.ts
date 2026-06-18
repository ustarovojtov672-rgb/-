import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { jazzPlugin } from "jazz-tools/better-auth/auth/server";
import { JazzBetterAuthDatabaseAdapter } from "jazz-tools/better-auth/database-adapter";

import { authEnv } from "@/lib/auth/env";

export const auth = betterAuth({
  baseURL: authEnv.betterAuthUrl,
  secret: authEnv.betterAuthSecret,
  trustedOrigins: [authEnv.betterAuthUrl],
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
