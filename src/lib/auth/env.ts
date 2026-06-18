type WebSocketUrl = `ws://${string}` | `wss://${string}`;
type HttpUrl = `http://${string}` | `https://${string}`;

export const authEnv = {
  betterAuthSecret: readRequiredEnv("BETTER_AUTH_SECRET"),
  betterAuthUrl: readHttpUrl("BETTER_AUTH_URL"),
  jazzAuthSyncPeer: readWebSocketUrl("JAZZ_AUTH_SYNC_PEER"),
  jazzAuthWorkerAccount: readRequiredEnv("JAZZ_AUTH_WORKER_ACCOUNT"),
  jazzAuthWorkerSecret: readRequiredEnv("JAZZ_AUTH_WORKER_SECRET"),
} as const;

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for Better Auth.`);
  }

  return value;
}

function readHttpUrl(name: string): HttpUrl {
  const value = readRequiredEnv(name);

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value as HttpUrl;
  }

  throw new Error(`${name} must start with http:// or https://.`);
}

function readWebSocketUrl(name: string): WebSocketUrl {
  const value = readRequiredEnv(name);

  if (value.startsWith("ws://") || value.startsWith("wss://")) {
    return value as WebSocketUrl;
  }

  throw new Error(`${name} must start with ws:// or wss://.`);
}
