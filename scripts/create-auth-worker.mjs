import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { WebSocket } from "ws";
import { createWebSocketPeer } from "cojson-transport-ws";
import { WasmCrypto } from "cojson/crypto/WasmCrypto";
import { Account, isControlledAccount } from "jazz-tools";

const envPath = resolve(process.cwd(), ".env.local");
const env = readEnvFile(envPath);
const syncPeer =
  process.env.JAZZ_AUTH_SYNC_PEER ??
  process.env.NEXT_PUBLIC_JAZZ_SYNC_PEER ??
  env.JAZZ_AUTH_SYNC_PEER ??
  env.NEXT_PUBLIC_JAZZ_SYNC_PEER;
const betterAuthUrl = process.env.BETTER_AUTH_URL ?? env.BETTER_AUTH_URL;
const publicBetterAuthUrl =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? env.NEXT_PUBLIC_BETTER_AUTH_URL;

assertPresent(syncPeer, "JAZZ_AUTH_SYNC_PEER or NEXT_PUBLIC_JAZZ_SYNC_PEER");
assertPresent(betterAuthUrl, "BETTER_AUTH_URL");
assertPresent(publicBetterAuthUrl, "NEXT_PUBLIC_BETTER_AUTH_URL");
assertWebSocketUrl(syncPeer, "JAZZ_AUTH_SYNC_PEER");
assertHttpUrl(betterAuthUrl, "BETTER_AUTH_URL");
assertHttpUrl(publicBetterAuthUrl, "NEXT_PUBLIC_BETTER_AUTH_URL");

if (env.JAZZ_AUTH_WORKER_ACCOUNT && env.JAZZ_AUTH_WORKER_SECRET) {
  console.log("Auth worker already exists in .env.local.");
  process.exit(0);
}

const crypto = await WasmCrypto.create();
const websocket = new WebSocket(syncPeer);
const peer = createWebSocketPeer({
  id: "auth-worker-setup",
  role: "server",
  websocket,
});

const account = await Account.create({
  creationProps: { name: "Prilozyxa Auth Worker" },
  peers: [peer],
  crypto,
});

if (!isControlledAccount(account)) {
  throw new Error("Created auth worker account is not controlled.");
}

await account.$jazz.waitForAllCoValuesSync({ timeout: 10_000 });

const nextEnv = {
  ...env,
  NEXT_PUBLIC_JAZZ_SYNC_PEER: env.NEXT_PUBLIC_JAZZ_SYNC_PEER ?? syncPeer,
  JAZZ_AUTH_SYNC_PEER: syncPeer,
  BETTER_AUTH_URL: betterAuthUrl,
  NEXT_PUBLIC_BETTER_AUTH_URL: publicBetterAuthUrl,
  BETTER_AUTH_SECRET:
    env.BETTER_AUTH_SECRET ?? randomBytes(32).toString("base64url"),
  JAZZ_AUTH_WORKER_ACCOUNT: account.$jazz.id,
  JAZZ_AUTH_WORKER_SECRET:
    account.$jazz.raw.core.node.getCurrentAgent().agentSecret,
};

writeFileSync(envPath, formatEnv(nextEnv), { encoding: "utf8" });

peer.outgoing.close();
peer.incoming.close();
websocket.close();

console.log("Auth worker created and .env.local updated.");

function readEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  const result = {};
  const source = readFileSync(path, "utf8");

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    result[key] = unquote(value);
  }

  return result;
}

function formatEnv(values) {
  return `${Object.entries(values)
    .map(([key, value]) => `${key}=${quoteIfNeeded(value)}`)
    .join("\n")}\n`;
}

function quoteIfNeeded(value) {
  if (/[\s#"'`]/.test(value)) {
    return JSON.stringify(value);
  }

  return value;
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function assertWebSocketUrl(value, name) {
  if (!value.startsWith("ws://") && !value.startsWith("wss://")) {
    throw new Error(`${name} must start with ws:// or wss://.`);
  }
}

function assertHttpUrl(value, name) {
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    throw new Error(`${name} must start with http:// or https://.`);
  }
}

function assertPresent(value, name) {
  if (!value) {
    throw new Error(`${name} is required in .env.local.`);
  }
}
