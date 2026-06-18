import { NutritionAccount } from "@/lib/jazz/schema";

type JazzSyncPeer = `ws://${string}` | `wss://${string}`;

export const jazzSyncConfig = {
  AccountSchema: NutritionAccount,
  authSecretStorageKey: "prilozyxa-calories-better-auth-jazz",
  defaultProfileName: "Пользователь",
  guestMode: false,
  storage: "indexedDB",
  sync: {
    peer: readJazzSyncPeer(),
    when: "always",
  },
} as const;

function readJazzSyncPeer(): JazzSyncPeer {
  const peer = process.env.NEXT_PUBLIC_JAZZ_SYNC_PEER?.trim();

  if (!peer) {
    throw new Error("NEXT_PUBLIC_JAZZ_SYNC_PEER обязателен для Jazz sync.");
  }

  if (peer.startsWith("ws://") || peer.startsWith("wss://")) {
    return peer as JazzSyncPeer;
  }

  throw new Error(
    `NEXT_PUBLIC_JAZZ_SYNC_PEER должен начинаться с ws:// или wss://, сейчас: ${peer}.`,
  );
}
