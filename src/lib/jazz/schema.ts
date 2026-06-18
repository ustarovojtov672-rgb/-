import { co, z } from "jazz-tools";

import {
  calculateNutritionTargets,
  defaultNutritionProfile,
  targetDiff,
} from "@/lib/nutrition/targets";

type MigratableRoot = {
  $isLoaded: boolean;
  $jazz: {
    has: (key: string) => boolean;
    set: (key: string, value: unknown) => void;
  };
};

export const NutritionUserProfile = co.map({
  biologicalSex: z.enum(["female", "male"]),
  ageYears: z.number(),
  heightCentimeters: z.number(),
  weightKilograms: z.number(),
  activityLevel: z.enum(["low", "medium", "high"]),
});

export const NutritionGoal = co.map({
  mode: z.enum(["balance", "cut", "bulk"]),
  dailyCaloriesKcal: z.number(),
  proteinGrams: z.number(),
  fatGrams: z.number(),
  carbsGrams: z.number(),
  fiberGrams: z.number(),
  ironMilligrams: z.number(),
  potassiumMilligrams: z.number(),
});

export const MealEntry = co.map({
  source: z.enum(["text", "photo", "text-photo"]),
  title: z.string(),
  detail: z.string(),
  photoName: z.string().optional(),
  photo: co.image().optional(),
  eatenAtIso: z.string(),
  caloriesKcal: z.number(),
  proteinGrams: z.number(),
  carbsGrams: z.number(),
  fatGrams: z.number(),
  fiberGrams: z.number(),
  ironMilligrams: z.number(),
  potassiumMilligrams: z.number(),
  confidencePercent: z.number().optional(),
  recommendation: z.string().optional(),
  portionAssumption: z.string().optional(),
  agentSummary: z.string().optional(),
  usedToolsSummary: z.string().optional(),
  identifiedFoodsSummary: z.string().optional(),
  evidenceSummary: z.string().optional(),
  confidenceSignalsSummary: z.string().optional(),
  sourceUrls: z.string().optional(),
  needsUserReview: z.boolean().optional(),
});

export const MealEntries = co.list(MealEntry);

export const MealMemoryEntry = co.map({
  normalizedTitle: z.string(),
  title: z.string(),
  detail: z.string(),
  lastSeenAtIso: z.string(),
  timesConfirmed: z.number(),
  caloriesKcal: z.number(),
  proteinGrams: z.number(),
  carbsGrams: z.number(),
  fatGrams: z.number(),
  fiberGrams: z.number(),
  ironMilligrams: z.number(),
  potassiumMilligrams: z.number(),
  portionAssumption: z.string().optional(),
  identifiedFoodsSummary: z.string().optional(),
});

export const MealMemoryEntries = co.list(MealMemoryEntry);

export const NutritionJournal = co.map({
  dateIso: z.string(),
  goal: NutritionGoal,
  meals: MealEntries,
});

export const NutritionAccount = co
  .account({
    profile: co.profile({
      name: z.string(),
    }),
    root: co.map({
      userProfile: NutritionUserProfile.optional(),
      journal: NutritionJournal,
      mealMemory: MealMemoryEntries.optional(),
    }),
  })
  .withMigration(async (account, creationProps) => {
    if (!account.$jazz.has("profile")) {
      account.$jazz.set("profile", {
        name: creationProps?.name ?? "Локальный пользователь",
      });
    }

    if (!account.$jazz.has("root")) {
      account.$jazz.set("root", {
        userProfile: createInitialUserProfile(),
        journal: createInitialJournal(),
        mealMemory: [],
      });
    }

    const root = (await account.$jazz.refs.root?.load()) as
      | MigratableRoot
      | undefined;

    if (root?.$isLoaded && !root.$jazz.has("userProfile")) {
      root.$jazz.set("userProfile", createInitialUserProfile());
    }

    if (root?.$isLoaded && !root.$jazz.has("mealMemory")) {
      root.$jazz.set("mealMemory", []);
    }
  });

function createInitialUserProfile() {
  return defaultNutritionProfile;
}

function createInitialJournal() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const targets = calculateNutritionTargets(defaultNutritionProfile, "cut");

  return {
    dateIso: today,
    goal: {
      mode: "cut" as const,
      ...targetDiff(targets),
    },
    meals: [
      {
        source: "text" as const,
        title: "Овсянка, банан, кофе с молоком",
        detail: "Плотный завтрак, много углеводов и калия.",
        eatenAtIso: atTime(today, 9, 20),
        caloriesKcal: 510,
        proteinGrams: 18,
        fatGrams: 14,
        carbsGrams: 82,
        fiberGrams: 10,
        ironMilligrams: 2.6,
        potassiumMilligrams: 780,
      },
      {
        source: "text-photo" as const,
        title: "Курица, рис, салат",
        detail: "Хороший белок, клетчатка пока ниже дневной цели.",
        photoName: "lunch-plate.jpg",
        eatenAtIso: atTime(today, 13, 45),
        caloriesKcal: 690,
        proteinGrams: 48,
        fatGrams: 19,
        carbsGrams: 78,
        fiberGrams: 8,
        ironMilligrams: 3.2,
        potassiumMilligrams: 920,
      },
      {
        source: "text" as const,
        title: "Греческий йогурт и ягоды",
        detail: "Легкий перекус с белком, мало железа.",
        eatenAtIso: atTime(today, 17, 10),
        caloriesKcal: 260,
        proteinGrams: 22,
        fatGrams: 6,
        carbsGrams: 31,
        fiberGrams: 4,
        ironMilligrams: 0.9,
        potassiumMilligrams: 390,
      },
    ],
  };
}

function atTime(dateIso: string, hours: number, minutes: number) {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}
