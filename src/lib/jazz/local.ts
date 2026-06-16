import { NutritionAccount } from "@/lib/jazz/schema";

export const localJazzConfig = {
  AccountSchema: NutritionAccount,
  authSecretStorageKey: "prilozyxa-calories-local-jazz",
  defaultProfileName: "Локальный пользователь",
  guestMode: false,
  storage: "indexedDB",
  sync: {
    peer: "wss://cloud.jazz.tools",
    when: "never",
  },
} as const;
