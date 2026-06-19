import { co, z } from "jazz-tools";

import {
  calculateNutritionTargets,
  defaultNutritionProfile,
  targetDiff,
  type GoalId,
  type NutritionProfileData,
} from "@/lib/nutrition/targets";

type MigratableRoot = {
  $isLoaded: boolean;
  journals?: { $isLoaded: boolean; length: number };
  $jazz: {
    has: (key: string) => boolean;
    set: (key: string, value: unknown) => void;
    refs: {
      journal?: {
        load: (options?: unknown) => Promise<unknown>;
      };
      journals?: {
        load: (options?: unknown) => Promise<unknown>;
      };
    };
  };
};

type MigratableJournal = {
  $isLoaded: boolean;
  meals?: Array<{
    title?: string;
    confidencePercent?: number;
    agentSummary?: string;
    photo?: unknown;
  }>;
};

type MigratableJournals = {
  $isLoaded: boolean;
  length: number;
  [Symbol.iterator]: () => IterableIterator<MigratableJournal>;
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

export const NutritionJournals = co.list(NutritionJournal);

export const NutritionAccount = co
  .account({
    profile: co.profile({
      name: z.string(),
    }),
    root: co.map({
      userProfile: NutritionUserProfile.optional(),
      journal: NutritionJournal.optional(),
      journals: NutritionJournals.optional(),
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
        journals: createInitialJournals(),
        mealMemory: [],
      });
    }

    const root = (await account.$jazz.refs.root?.load()) as
      | MigratableRoot
      | undefined;

    if (root?.$isLoaded && !root.$jazz.has("userProfile")) {
      root.$jazz.set("userProfile", createInitialUserProfile());
    }

    if (root?.$isLoaded && !root.$jazz.has("journals")) {
      const legacyJournal = await loadLegacyJournal(root);

      root.$jazz.set("journals", createMigratedJournals(legacyJournal));
    }

    if (root?.$isLoaded && root.$jazz.has("journals")) {
      const journals = await loadMigratedJournals(root);

      if (isStarterJournalList(journals)) {
        root.$jazz.set("journals", createInitialJournals());
      }
    }

    if (root?.$isLoaded && !root.$jazz.has("mealMemory")) {
      root.$jazz.set("mealMemory", []);
    }
  });

function createInitialUserProfile() {
  return defaultNutritionProfile;
}

function createInitialJournal() {
  return createNutritionJournal({
    dateIso: todayDateIso(),
    profile: defaultNutritionProfile,
    goalId: "cut",
  });
}

export function createNutritionJournal({
  dateIso,
  profile,
  goalId,
}: {
  dateIso: string;
  profile: NutritionProfileData;
  goalId: GoalId;
}): Parameters<typeof NutritionJournal.create>[0] {
  const targets = calculateNutritionTargets(profile, goalId);

  return {
    dateIso,
    goal: {
      mode: goalId,
      ...targetDiff(targets),
    },
    meals: [],
  };
}

function createInitialJournalValue() {
  return NutritionJournal.create(createInitialJournal());
}

function createInitialJournals() {
  return NutritionJournals.create([createInitialJournalValue()]);
}

function createMigratedJournals(legacyJournal: MigratableJournal | undefined) {
  const journals =
    legacyJournal && !isStarterJournal(legacyJournal)
      ? [legacyJournal]
      : [createInitialJournalValue()];

  return NutritionJournals.create(
    journals as Parameters<typeof NutritionJournals.create>[0],
  );
}

export function todayDateIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function loadLegacyJournal(root: MigratableRoot) {
  if (!root.$jazz.has("journal")) {
    return undefined;
  }

  return (await root.$jazz.refs.journal?.load({
    resolve: {
      goal: true,
      meals: { $each: true },
    },
  })) as MigratableJournal | undefined;
}

async function loadMigratedJournals(root: MigratableRoot) {
  if (!root.$jazz.has("journals")) {
    return undefined;
  }

  return (await root.$jazz.refs.journals?.load({
    resolve: {
      $each: {
        goal: true,
        meals: { $each: true },
      },
    },
  })) as MigratableJournals | undefined;
}

function isStarterJournalList(journals: MigratableJournals | undefined) {
  if (!journals?.$isLoaded || journals.length !== 1) {
    return false;
  }

  const [journal] = Array.from(journals);

  return Boolean(journal && isStarterJournal(journal));
}

function isStarterJournal(journal: MigratableJournal) {
  if (!journal.$isLoaded || !Array.isArray(journal.meals)) {
    return false;
  }

  const starterTitles = new Set([
    "Овсянка, банан, кофе с молоком",
    "Курица, рис, салат",
    "Греческий йогурт и ягоды",
  ]);

  return (
    journal.meals.length === starterTitles.size &&
    journal.meals.every(
      (meal) =>
        meal.title &&
        starterTitles.has(meal.title) &&
        meal.confidencePercent === undefined &&
        meal.agentSummary === undefined &&
        meal.photo === undefined,
    )
  );
}
