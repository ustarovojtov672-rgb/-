import { BetterAuthJazzProvider } from "@/components/better-auth-jazz-provider";
import { JazzSyncProvider } from "@/components/jazz-sync-provider";
import { NutritionDiary } from "@/components/nutrition-diary";

export default function Home() {
  return (
    <JazzSyncProvider>
      <BetterAuthJazzProvider>
        <NutritionDiary />
      </BetterAuthJazzProvider>
    </JazzSyncProvider>
  );
}
