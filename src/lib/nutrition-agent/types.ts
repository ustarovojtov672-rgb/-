import type {
  NutritionProfileData,
  NutritionTargets,
} from "@/lib/nutrition/targets";
import type {
  MealMemorySnapshot,
  PreviousMealSnapshot,
} from "@/lib/nutrition-agent/memory";
import type { NutritionAgentGoal } from "@/lib/nutrition-agent/prompt";

export type NutritionAgentInput = {
  apiKey?: string;
  description: string;
  photoFile: File | null;
  profile: NutritionProfileData;
  goal: NutritionAgentGoal;
  targets: NutritionTargets;
  mealMemory: MealMemorySnapshot[];
  previousMeals: PreviousMealSnapshot[];
};

export type NutritionAgentRuntime = "pi" | "openai";
