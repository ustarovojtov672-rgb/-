import { NutritionAccount } from "@/lib/jazz/schema";

type JazzSyncPeer = `ws://${string}` | `wss://${string}`;

const defaultJazzSyncPeer: JazzSyncPeer = "ws://127.0.0.1:4200";

export const jazzSyncConfig = {
  AccountSchema: NutritionAccount,
  authSecretStorageKey: "prilozyxa-calories-local-jazz",
  defaultProfileName: "Пользователь",
  guestMode: false,
  storage: "indexedDB",
  sync: {
    peer: readJazzSyncPeer(),
    when: "always",
  },
} as const;

function readJazzSyncPeer(): JazzSyncPeer {
  const peer = process.env.NEXT_PUBLIC_JAZZ_SYNC_PEER ?? defaultJazzSyncPeer;

  if (peer.startsWith("ws://") || peer.startsWith("wss://")) {
    return peer as JazzSyncPeer;
  }

  throw new Error(
    `NEXT_PUBLIC_JAZZ_SYNC_PEER должен начинаться с ws:// или wss://, сейчас: ${peer}.`,
  );
}
