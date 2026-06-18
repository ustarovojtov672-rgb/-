"use client";

import {
  useCallback,
  useEffect,
  useSyncExternalStore,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  Apple,
  ArrowRight,
  Beef,
  Bot,
  Camera,
  CheckCircle2,
  CircleAlert,
  Cloud,
  Flame,
  ImagePlus,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquareText,
  Plus,
  Database,
  RefreshCw,
  Salad,
  Send,
  Sparkles,
  Target,
  Trash2,
  Utensils,
  UserRound,
  Wheat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Image as JazzImage,
  useAccount,
  useSyncConnectionStatus,
} from "jazz-tools/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth/client";
import { MealEntry, MealMemoryEntry, NutritionAccount } from "@/lib/jazz/schema";
import {
  mealAnalysisToolLabels,
  type MealAgentStatusResponse,
  type MealAnalysisResponse,
  type MealAnalysisResult,
  type MealAnalysisTool,
} from "@/lib/nutrition/meal-analysis";
import type { MealMemorySnapshot } from "@/lib/nutrition-agent/memory";
import {
  activityLabels,
  biologicalSexLabels,
  calculateNutritionTargets,
  goalLabels,
  targetDiff,
  type ActivityLevel,
  type BiologicalSex,
  type GoalId,
  type NutritionProfileData,
  type NutritionTargets,
} from "@/lib/nutrition/targets";
import { cn } from "@/lib/utils";

type MealSource = "text" | "photo" | "text-photo";
type AuthMode = "sign-in" | "sign-up";
type AnalysisPhase =
  | "idle"
  | "checking"
  | "analyzing"
  | "review"
  | "failed"
  | "saving";

type Goal = {
  id: GoalId;
  label: string;
  description: string;
};

type GoalWithTargets = Goal & {
  targets: NutritionTargets;
};

type MealDraft = {
  source: MealSource;
  title: string;
  detail: string;
  photoName?: string;
  eatenAtIso: string;
  caloriesKcal: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  fiberGrams: number;
  ironMilligrams: number;
  potassiumMilligrams: number;
  confidencePercent?: number;
  recommendation?: string;
  portionAssumption?: string;
  agentSummary?: string;
  usedToolsSummary?: string;
  identifiedFoodsSummary?: string;
  evidenceSummary?: string;
  confidenceSignalsSummary?: string;
  sourceUrls?: string;
  needsUserReview?: boolean;
};

type BetterAuthSessionState = {
  data?: {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
    } | null;
  } | null;
  isPending: boolean;
};

type ReviewNumberField =
  | "caloriesKcal"
  | "proteinGrams"
  | "fatGrams"
  | "carbsGrams"
  | "fiberGrams"
  | "ironMilligrams"
  | "potassiumMilligrams";

type NutrientGapId =
  | "protein"
  | "fat"
  | "carbs"
  | "fiber"
  | "iron"
  | "potassium";

type NutrientGap = {
  id: NutrientGapId;
  label: string;
  current: number;
  target: number;
  unit: string;
  remaining: number;
  completion: number;
  advice: string;
  products: string[];
};

type MealProfile = {
  match: string[];
  title: string;
  detail: string;
  icon: LucideIcon;
  color: string;
  values: Pick<
    MealDraft,
    | "caloriesKcal"
    | "proteinGrams"
    | "fatGrams"
    | "carbsGrams"
    | "fiberGrams"
    | "ironMilligrams"
    | "potassiumMilligrams"
  >;
};

const goals: Goal[] = [
  {
    id: "balance",
    label: goalLabels.balance,
    description: "Ровный день без перекосов по энергии и микроэлементам.",
  },
  {
    id: "cut",
    label: goalLabels.cut,
    description: "Умеренный дефицит, больше белка и клетчатки.",
  },
  {
    id: "bulk",
    label: goalLabels.bulk,
    description: "Профицит с плотными приемами пищи и контролем жиров.",
  },
];

const mealProfiles: MealProfile[] = [
  {
    match: ["кур", "индей", "рыб", "лосос", "тунец", "яйц", "творог", "тофу"],
    title: "Белковый прием",
    detail: "Хорошо закрывает белок, но стоит добавить овощи или крупу.",
    icon: Beef,
    color: "text-[#2f7a55]",
    values: {
      caloriesKcal: 460,
      proteinGrams: 42,
      fatGrams: 18,
      carbsGrams: 28,
      fiberGrams: 5,
      ironMilligrams: 2.4,
      potassiumMilligrams: 760,
    },
  },
  {
    match: ["овся", "греч", "рис", "паста", "хлеб", "карто", "булгур"],
    title: "Углеводная база",
    detail: "Дает энергию на день, лучше сочетать с белком.",
    icon: Wheat,
    color: "text-[#9a6b22]",
    values: {
      caloriesKcal: 520,
      proteinGrams: 18,
      fatGrams: 12,
      carbsGrams: 86,
      fiberGrams: 9,
      ironMilligrams: 3.1,
      potassiumMilligrams: 680,
    },
  },
  {
    match: ["салат", "овощ", "брок", "шпин", "огур", "томат", "зел"],
    title: "Овощи и клетчатка",
    detail: "Помогает добрать клетчатку и калий почти без лишних калорий.",
    icon: Salad,
    color: "text-[#27726a]",
    values: {
      caloriesKcal: 240,
      proteinGrams: 9,
      fatGrams: 10,
      carbsGrams: 30,
      fiberGrams: 12,
      ironMilligrams: 2.8,
      potassiumMilligrams: 920,
    },
  },
  {
    match: ["йогур", "кефир", "сыр", "молок", "протеин"],
    title: "Молочный перекус",
    detail: "Удобный способ добрать белок между основными приемами.",
    icon: Apple,
    color: "text-[#3b6fa7]",
    values: {
      caloriesKcal: 310,
      proteinGrams: 26,
      fatGrams: 9,
      carbsGrams: 32,
      fiberGrams: 3,
      ironMilligrams: 0.8,
      potassiumMilligrams: 540,
    },
  },
];

const sourceLabels: Record<MealSource, string> = {
  text: "текст",
  photo: "фото",
  "text-photo": "текст и фото",
};

const confidenceSignalLabels: Record<MealAnalysisTool, string> = {
  vision: "фото",
  ocr: "этикетка",
  barcode: "штрихкод",
  memory: "память",
  local_database: "база продуктов",
  web_search: "поиск",
  user_text: "текст",
};

const biologicalSexOptions: BiologicalSex[] = ["female", "male"];
const activityOptions: ActivityLevel[] = ["low", "medium", "high"];
const mealAnalysisEndpoint =
  process.env.NEXT_PUBLIC_MEAL_ANALYSIS_ENDPOINT ?? "/api/analyze-meal";
const mealAgentStatusEndpoint = mealAnalysisEndpoint;
const syncSaveTimeoutMs = 10000;
const mealMemoryLimit = 50;
const reviewNumberFields: Array<{
  field: ReviewNumberField;
  label: string;
  step: number;
  unit: string;
}> = [
  { field: "caloriesKcal", label: "Калории", step: 1, unit: "ккал" },
  { field: "proteinGrams", label: "Белок", step: 0.1, unit: "г" },
  { field: "fatGrams", label: "Жиры", step: 0.1, unit: "г" },
  { field: "carbsGrams", label: "Углеводы", step: 0.1, unit: "г" },
  { field: "fiberGrams", label: "Клетчатка", step: 0.1, unit: "г" },
  { field: "ironMilligrams", label: "Железо", step: 0.1, unit: "мг" },
  { field: "potassiumMilligrams", label: "Калий", step: 1, unit: "мг" },
];

const nutrientCatalog: Array<
  Omit<NutrientGap, "current" | "target" | "remaining" | "completion">
> = [
  {
    id: "protein",
    label: "Белок",
    unit: "г",
    advice: "Подойдет плотный белковый прием без лишнего сахара.",
    products: ["рыба", "курица", "творог", "яйца", "тофу"],
  },
  {
    id: "fat",
    label: "Жиры",
    unit: "г",
    advice: "Добавь немного полезных жиров к обычной тарелке.",
    products: ["лосось", "авокадо", "оливковое масло", "орехи", "сыр"],
  },
  {
    id: "carbs",
    label: "Углеводы",
    unit: "г",
    advice: "Нужна спокойная углеводная база рядом с белком.",
    products: ["гречка", "рис", "картофель", "овсянка", "цельнозерновой хлеб"],
  },
  {
    id: "fiber",
    label: "Клетчатка",
    unit: "г",
    advice: "Собери следующий прием вокруг овощей или ягод.",
    products: ["овощи", "зелень", "ягоды", "чечевица", "цельнозерновой хлеб"],
  },
  {
    id: "iron",
    label: "Железо",
    unit: "мг",
    advice: "Поможет еда с железом и витамином C рядом.",
    products: ["говядина", "печень", "чечевица", "шпинат", "гречка"],
  },
  {
    id: "potassium",
    label: "Калий",
    unit: "мг",
    advice: "Добери калий через овощи, бобовые или молочные продукты.",
    products: ["картофель", "банан", "фасоль", "йогурт", "шпинат"],
  },
];

const formatNumber = (value: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);

function progressValue(current: number, target: number) {
  return Math.min(100, Math.round((current / target) * 100));
}

function boundedRatio(current: number, target: number) {
  if (target <= 0) {
    throw new Error(`Nutrition target must be positive: ${target}`);
  }

  return Math.min(1, current / target);
}

function buildNutrientGaps(
  totals: ReturnType<typeof sumMeals>,
  targets: NutritionTargets,
): NutrientGap[] {
  const valueById: Record<NutrientGapId, { current: number; target: number }> = {
    protein: { current: totals.protein, target: targets.protein },
    fat: { current: totals.fat, target: targets.fat },
    carbs: { current: totals.carbs, target: targets.carbs },
    fiber: { current: totals.fiber, target: targets.fiber },
    iron: { current: totals.iron, target: targets.iron },
    potassium: { current: totals.potassium, target: targets.potassium },
  };

  return nutrientCatalog
    .map((item) => {
      const value = valueById[item.id];
      const remaining = Math.max(0, value.target - value.current);

      return {
        ...item,
        current: value.current,
        target: value.target,
        remaining,
        completion: boundedRatio(value.current, value.target),
      };
    })
    .filter((item) => item.remaining > 0)
    .sort(
      (left, right) =>
        right.remaining / right.target - left.remaining / left.target,
    );
}

function dayScore(totals: ReturnType<typeof sumMeals>, targets: NutritionTargets) {
  const calorieRatio =
    totals.calories <= targets.calories
      ? boundedRatio(totals.calories, targets.calories)
      : Math.max(0, 1 - (totals.calories - targets.calories) / targets.calories);
  const nutrientRatios = [
    boundedRatio(totals.protein, targets.protein),
    boundedRatio(totals.fiber, targets.fiber),
    boundedRatio(totals.iron, targets.iron),
    boundedRatio(totals.potassium, targets.potassium),
  ];
  const average =
    [calorieRatio, ...nutrientRatios].reduce((sum, value) => sum + value, 0) /
    (nutrientRatios.length + 1);

  return Math.round(average * 100);
}

function macroEnergy(totals: ReturnType<typeof sumMeals>) {
  const proteinCalories = totals.protein * 4;
  const fatCalories = totals.fat * 9;
  const carbsCalories = totals.carbs * 4;
  const total = proteinCalories + fatCalories + carbsCalories;

  if (total === 0) {
    return {
      protein: 0,
      fat: 0,
      carbs: 0,
    };
  }

  return {
    protein: Math.round((proteinCalories / total) * 100),
    fat: Math.round((fatCalories / total) * 100),
    carbs: Math.round((carbsCalories / total) * 100),
  };
}

function nextProducts({
  strongestGap,
  caloriesLeft,
  goalId,
}: {
  strongestGap: NutrientGap | undefined;
  caloriesLeft: number;
  goalId: GoalId;
}) {
  if (caloriesLeft < 250 && goalId === "cut") {
    return ["творог", "яйца", "огурцы", "рыба", "зелень"];
  }

  return strongestGap?.products ?? ["рыба", "овощи", "гречка", "йогурт", "ягоды"];
}

function detectProfile(text: string) {
  const normalized = text.toLowerCase();
  return (
    mealProfiles.find((profile) =>
      profile.match.some((keyword) => normalized.includes(keyword)),
    ) ?? mealProfiles[0]
  );
}

function goalById(goalId: GoalId) {
  return goals.find((item) => item.id === goalId) ?? goals[0];
}

function sumMeals(meals: MealDraft[]) {
  return meals.reduce(
    (total, meal) => ({
      calories: total.calories + meal.caloriesKcal,
      protein: total.protein + meal.proteinGrams,
      fat: total.fat + meal.fatGrams,
      carbs: total.carbs + meal.carbsGrams,
      fiber: total.fiber + meal.fiberGrams,
      iron: total.iron + meal.ironMilligrams,
      potassium: total.potassium + meal.potassiumMilligrams,
    }),
    {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0,
      iron: 0,
      potassium: 0,
    },
  );
}

function recommendationFor(
  goal: GoalWithTargets,
  totals: ReturnType<typeof sumMeals>,
) {
  const proteinGap = goal.targets.protein - totals.protein;
  const fiberGap = goal.targets.fiber - totals.fiber;
  const caloriesLeft = goal.targets.calories - totals.calories;

  if (proteinGap > 30) {
    return "Дальше лучше выбрать белковое блюдо: рыбу, курицу, тофу, яйца или творог.";
  }

  if (fiberGap > 10) {
    return "Следующий прием стоит собрать вокруг овощей, зелени, ягод или цельнозернового гарнира.";
  }

  if (goal.id === "cut" && caloriesLeft < 350) {
    return "До лимита мало места: подойдет легкий белковый перекус без сладкого напитка.";
  }

  if (goal.id === "bulk" && caloriesLeft > 800) {
    return "Для набора массы добавь плотный прием: крупа, белок и немного масла или орехов.";
  }

  return "Баланс дня выглядит ровно: на следующий прием держи белок, овощи и спокойную порцию углеводов.";
}

function profileSnapshot(profile: NutritionProfileData): NutritionProfileData {
  return {
    biologicalSex: profile.biologicalSex,
    ageYears: profile.ageYears,
    heightCentimeters: profile.heightCentimeters,
    weightKilograms: profile.weightKilograms,
    activityLevel: profile.activityLevel,
  };
}

function normalizePositive(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid nutrition value for ${field}: ${value}`);
  }

  return Math.round(value * 10) / 10;
}

function buildConfidenceSignalsSummary(analysis: MealAnalysisResult) {
  return analysis.confidenceSignals
    .map((signal) => {
      const label =
        signal.label.trim() || confidenceSignalLabels[signal.kind];
      const confidencePercent = Math.round(
        normalizePositive(signal.confidencePercent, "confidencePercent"),
      );

      return `${label}: ${confidencePercent}% - ${signal.detail}`;
    })
    .join("\n");
}

function mealDraftFromAnalysis({
  analysis,
  source,
  photoName,
}: {
  analysis: MealAnalysisResult;
  source: MealSource;
  photoName: string;
}): MealDraft {
  const draft: MealDraft = {
    source,
    title: analysis.title,
    detail: analysis.detail,
    eatenAtIso: new Date().toISOString(),
    caloriesKcal: Math.round(normalizePositive(analysis.caloriesKcal, "caloriesKcal")),
    proteinGrams: normalizePositive(analysis.proteinGrams, "proteinGrams"),
    fatGrams: normalizePositive(analysis.fatGrams, "fatGrams"),
    carbsGrams: normalizePositive(analysis.carbsGrams, "carbsGrams"),
    fiberGrams: normalizePositive(analysis.fiberGrams, "fiberGrams"),
    ironMilligrams: normalizePositive(analysis.ironMilligrams, "ironMilligrams"),
    potassiumMilligrams: normalizePositive(
      analysis.potassiumMilligrams,
      "potassiumMilligrams",
    ),
    confidencePercent: Math.round(
      normalizePositive(analysis.confidencePercent, "confidencePercent"),
    ),
    recommendation: analysis.recommendation,
    portionAssumption: analysis.portionAssumption,
    agentSummary: analysis.agentSummary,
    usedToolsSummary: analysis.usedTools
      .map((tool) => mealAnalysisToolLabels[tool])
      .join("\n"),
    identifiedFoodsSummary: analysis.identifiedFoods.join("\n"),
    evidenceSummary: analysis.evidence
      .map((item) => `${item.label}: ${item.detail}`)
      .join("\n"),
    confidenceSignalsSummary: buildConfidenceSignalsSummary(analysis),
    sourceUrls: analysis.sourceUrls.join("\n"),
    needsUserReview: analysis.needsUserReview,
  };

  if (photoName) {
    draft.photoName = photoName;
  }

  return draft;
}

async function analyzeMeal({
  text,
  photoFile,
  profile,
  goal,
  mealMemory,
  previousMeals,
}: {
  text: string;
  photoFile: File | null;
  profile: NutritionProfileData;
  goal: GoalWithTargets;
  mealMemory: MealMemorySnapshot[];
  previousMeals: MealDraft[];
}) {
  const formData = new FormData();
  formData.set("description", text);
  formData.set("profile", JSON.stringify(profile));
  formData.set("goal", JSON.stringify({ id: goal.id, label: goal.label }));
  formData.set("targets", JSON.stringify(goal.targets));
  formData.set("mealMemory", JSON.stringify(mealMemory.slice(0, mealMemoryLimit)));
  formData.set(
    "previousMeals",
    JSON.stringify(
      previousMeals.slice(0, 12).map((meal) => ({
        title: meal.title,
        detail: meal.detail,
        eatenAtIso: meal.eatenAtIso,
        caloriesKcal: meal.caloriesKcal,
        proteinGrams: meal.proteinGrams,
        fatGrams: meal.fatGrams,
        carbsGrams: meal.carbsGrams,
        fiberGrams: meal.fiberGrams,
        ironMilligrams: meal.ironMilligrams,
        potassiumMilligrams: meal.potassiumMilligrams,
        recommendation: meal.recommendation,
      })),
    ),
  );

  if (photoFile) {
    formData.set("photo", photoFile);
  }

  const response = await fetch(mealAnalysisEndpoint, {
    method: "POST",
    body: formData,
  });
  const responseType = response.headers.get("content-type") ?? "";

  if (!responseType.includes("application/json")) {
    throw new Error(`AI endpoint недоступен: ${mealAnalysisEndpoint}`);
  }

  const payload = (await response.json()) as MealAnalysisResponse;

  if (!response.ok || !("meal" in payload)) {
    throw new Error(readableMealAnalysisError(payload));
  }

  return payload.meal;
}

function readableMealAnalysisError(payload: MealAnalysisResponse) {
  if (!("error" in payload)) {
    return "AI не вернул расчет еды.";
  }

  const prefix = payload.code ? `${payload.code}: ` : "";
  return `${prefix}${payload.error}`;
}

function formatMealTime(eatenAtIso: string) {
  return new Date(eatenAtIso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatJournalDate(dateIso: string) {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

function normalizeAuthEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidAuthEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidAuthPassword(value: string) {
  return value.length >= 8;
}

function defaultNameFromEmail(email: string) {
  return email.split("@")[0] || email;
}

function readableAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Invalid email or password")) {
    return "Неверный email или пароль.";
  }

  if (message.includes("User already exists")) {
    return "Аккаунт с таким email уже существует.";
  }

  if (message.includes("Jazz credentials not found")) {
    return "Jazz еще не подготовил ключи аккаунта. Обновите страницу и попробуйте снова.";
  }

  return message;
}

function shortAccountId(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function normalizeMealMemoryTitle(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/iu)
    .filter(Boolean)
    .join(" ");
}

function tokenizeMealMemory(value: string) {
  return normalizeMealMemoryTitle(value)
    .split(" ")
    .filter((token) => token.length >= 3);
}

function mealMemoryInputFromDraft({
  draft,
  lastSeenAtIso,
  timesConfirmed,
}: {
  draft: MealDraft;
  lastSeenAtIso: string;
  timesConfirmed: number;
}) {
  const input: Parameters<typeof MealMemoryEntry.create>[0] = {
    normalizedTitle: normalizeMealMemoryTitle(draft.title),
    title: draft.title,
    detail: draft.detail,
    lastSeenAtIso,
    timesConfirmed,
    caloriesKcal: draft.caloriesKcal,
    proteinGrams: draft.proteinGrams,
    fatGrams: draft.fatGrams,
    carbsGrams: draft.carbsGrams,
    fiberGrams: draft.fiberGrams,
    ironMilligrams: draft.ironMilligrams,
    potassiumMilligrams: draft.potassiumMilligrams,
  };

  if (draft.portionAssumption) {
    input.portionAssumption = draft.portionAssumption;
  }

  if (draft.identifiedFoodsSummary) {
    input.identifiedFoodsSummary = draft.identifiedFoodsSummary;
  }

  return input;
}

function mealMemorySnapshot(entry: MealMemorySnapshot): MealMemorySnapshot {
  return {
    normalizedTitle: entry.normalizedTitle,
    title: entry.title,
    detail: entry.detail,
    lastSeenAtIso: entry.lastSeenAtIso,
    timesConfirmed: entry.timesConfirmed,
    caloriesKcal: entry.caloriesKcal,
    proteinGrams: entry.proteinGrams,
    fatGrams: entry.fatGrams,
    carbsGrams: entry.carbsGrams,
    fiberGrams: entry.fiberGrams,
    ironMilligrams: entry.ironMilligrams,
    potassiumMilligrams: entry.potassiumMilligrams,
    portionAssumption: entry.portionAssumption,
    identifiedFoodsSummary: entry.identifiedFoodsSummary,
  };
}

function findReviewMemoryMatches(
  draft: MealDraft,
  mealMemory: MealMemorySnapshot[],
) {
  const queryTokens = tokenizeMealMemory(
    `${draft.title} ${draft.detail} ${draft.identifiedFoodsSummary ?? ""}`,
  );

  if (queryTokens.length === 0) {
    return [];
  }

  return mealMemory
    .map((entry) => {
      const memoryTokens = new Set(
        tokenizeMealMemory(
          `${entry.title} ${entry.detail} ${entry.identifiedFoodsSummary ?? ""}`,
        ),
      );
      const score = queryTokens.reduce(
        (total, token) => total + (memoryTokens.has(token) ? 1 : 0),
        0,
      );

      return {
        ...entry,
        score,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.timesConfirmed - left.timesConfirmed;
    })
    .slice(0, 3);
}

function getBetterAuthSession() {
  return authClient.useSession.get() as unknown as BetterAuthSessionState;
}

function useBetterAuthSession() {
  return useSyncExternalStore(
    (callback) => authClient.useSession.subscribe(callback),
    getBetterAuthSession,
    getBetterAuthSession,
  );
}

function splitStoredLines(value: string | undefined) {
  return (
    value
      ?.split("\n")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

function SummaryChips({
  value,
  tone = "neutral",
}: {
  value: string | undefined;
  tone?: "neutral" | "agent";
}) {
  const items = splitStoredLines(value);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            "rounded-lg px-2 py-1 text-sm",
            tone === "agent"
              ? "bg-[#e9edf7] text-[#263f78]"
              : "bg-[#edf3ef] text-[#53625b]",
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function parseConfidenceSignalLine(line: string) {
  const labelEnd = line.indexOf(": ");
  const percentEnd = line.indexOf("% - ", labelEnd + 2);

  if (labelEnd <= 0 || percentEnd <= labelEnd) {
    throw new Error(`Invalid confidence signal line: ${line}`);
  }

  const confidencePercent = Number(line.slice(labelEnd + 2, percentEnd));

  if (
    !Number.isFinite(confidencePercent) ||
    confidencePercent < 0 ||
    confidencePercent > 100
  ) {
    throw new Error(`Invalid confidence signal percent: ${line}`);
  }

  return {
    label: line.slice(0, labelEnd),
    confidencePercent,
    detail: line.slice(percentEnd + 4),
  };
}

function ConfidenceSignals({ value }: { value: string | undefined }) {
  const items = splitStoredLines(value).map(parseConfidenceSignalLine);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[#26302c]">
        Источники уверенности
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="rounded-lg border border-[#dfe7e2] bg-[#fbfcfb] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-medium text-[#26302c]">
                {item.label}
              </p>
              <span className="shrink-0 rounded-lg bg-[#e7f1eb] px-2 py-1 text-sm font-medium text-[#225b43]">
                {item.confidencePercent}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-lg bg-[#dfe7e2]">
              <div
                className="h-full rounded-lg bg-[#225b43]"
                style={{ width: `${item.confidencePercent}%` }}
              />
            </div>
            <p className="mt-2 text-sm leading-5 text-[#617069]">
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceLinks({ value }: { value: string | undefined }) {
  const urls = splitStoredLines(value);

  if (urls.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-[#26302c]">Источники</p>
      <div className="grid gap-1.5">
        {urls.map((url) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="break-all text-sm leading-5 text-[#2f6993] underline-offset-4 hover:underline"
          >
            {url}
          </a>
        ))}
      </div>
    </div>
  );
}

function AgentStatusPanel({
  status,
  error,
  isBusy,
  onRefresh,
}: {
  status: MealAgentStatusResponse | null;
  error: string;
  isBusy: boolean;
  onRefresh: () => void;
}) {
  const isReady = status?.ok ?? false;
  const isChecking = !status && isBusy && !error;

  return (
    <section className="rounded-lg border border-[#d7dfd9] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Bot className="size-5 shrink-0 text-[#225b43]" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">AI-агент</h2>
            <p className="mt-1 text-sm leading-5 text-[#617069]">
              {status
                ? `${status.runtime} · ${status.model ?? "модель не указана"}`
                : "Проверяем конфигурацию."}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Проверить AI-агента"
          disabled={isBusy}
          onClick={onRefresh}
          className="size-9 shrink-0"
        >
          <RefreshCw
            className={cn("size-4", isBusy ? "animate-spin" : "")}
            aria-hidden="true"
          />
        </Button>
      </div>

      <div
        className={cn(
          "mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
          isReady
            ? "bg-[#e7f1eb] text-[#225b43]"
            : isChecking
              ? "bg-[#eef2f8] text-[#263f78]"
              : "bg-[#fff8f4] text-[#704037]",
        )}
      >
        {isReady ? (
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
        ) : isChecking ? (
          <RefreshCw className="size-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
        )}
        <span>
          {isReady
            ? "Готов к анализу еды."
            : isChecking
              ? "Проверяем AI-агента."
              : error || "Нужна проверка настроек агента."}
        </span>
      </div>

      {status ? (
        <div className="mt-3 divide-y divide-[#dfe7e2]">
          {status.checks.map((check) => (
            <div key={check.id} className="py-2">
              <div className="flex items-start gap-2">
                {check.ok ? (
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-[#225b43]"
                    aria-hidden="true"
                  />
                ) : (
                  <CircleAlert
                    className="mt-0.5 size-4 shrink-0 text-[#a6544b]"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#26302c]">
                    {check.label}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-[#617069]">
                    {check.detail}
                  </p>
                  {!check.ok && check.action ? (
                    <p className="mt-1 text-sm leading-5 text-[#704037]">
                      {check.action}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function AnalysisStateBanner({
  phase,
  error,
  status,
}: {
  phase: AnalysisPhase;
  error: string;
  status: MealAgentStatusResponse | null;
}) {
  if (phase === "idle" && !error && status?.ok !== false) {
    return null;
  }

  if (phase === "checking") {
    return (
      <div className="rounded-lg border border-[#d8dde8] bg-[#eef2f8] p-3 text-sm leading-5 text-[#263f78]">
        Проверяем AI-агента перед анализом.
      </div>
    );
  }

  if (phase === "analyzing") {
    return (
      <div className="rounded-lg border border-[#d8dde8] bg-[#eef2f8] p-3 text-sm leading-5 text-[#263f78]">
        Агент анализирует текст, фото, память, локальную базу и web search.
      </div>
    );
  }

  if (phase === "review") {
    return (
      <div className="rounded-lg border border-[#c9ddcf] bg-[#edf3ef] p-3 text-sm leading-5 text-[#225b43]">
        Расчет готов. Проверь порцию и нутриенты перед сохранением.
      </div>
    );
  }

  if (phase === "saving") {
    return (
      <div className="rounded-lg border border-[#d8dde8] bg-[#eef2f8] p-3 text-sm leading-5 text-[#263f78]">
        Сохраняем запись, фото и память блюда в Jazz.
      </div>
    );
  }

  if (status?.ok === false) {
    return (
      <div className="rounded-lg border border-[#d7b9aa] bg-[#fff8f4] p-3 text-sm leading-5 text-[#704037]">
        AI-агент не готов. Открой блок «AI-агент» и исправь красные пункты.
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[#d7b9aa] bg-[#fff8f4] p-3 text-sm leading-5 text-[#704037]">
        {error}
      </div>
    );
  }

  return null;
}

function MacroBar({
  label,
  value,
  target,
  unit,
  tone,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  tone: string;
}) {
  const progress = progressValue(value, target);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-[#26302c]">{label}</span>
        <span className="text-[#5f6b66]">
          {formatNumber(value)} / {formatNumber(target)} {unit}
        </span>
      </div>
      <div
        className="h-2 rounded-lg bg-[#dfe7e2]"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          className={cn("h-2 rounded-lg", tone)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function MealIcon({ title }: { title: string }) {
  const profile = detectProfile(title);
  const Icon = profile.icon;

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#edf3ef]">
      <Icon className={cn("size-5", profile.color)} aria-hidden="true" />
    </div>
  );
}

function MealPhoto({ imageId, title }: { imageId: string; title: string }) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-[#dfe7e2] bg-[#edf3ef]">
      <JazzImage
        imageId={imageId}
        alt={`Фото блюда: ${title}`}
        width={520}
        height={300}
        className="h-40 w-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

function LoadingDiary() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f4] px-4 text-[#17211d]">
      <div className="rounded-lg border border-[#d7dfd9] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#17352f] text-white">
            <Utensils className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold">Загружаем дневник</p>
            <p className="text-sm text-[#617069]">
              Проверяем Jazz-хранилище и sync-сервер.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export function NutritionDiary() {
  const account = useAccount(NutritionAccount, {
    resolve: {
      profile: true,
      root: {
        userProfile: true,
        journal: {
          goal: true,
          meals: {
            $each: {
              photo: true,
            },
          },
        },
        mealMemory: { $each: true },
      },
    },
  });
  const authSession = useBetterAuthSession();
  const syncConnected = useSyncConnectionStatus();

  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [mealText, setMealText] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [reviewDraft, setReviewDraft] = useState<MealDraft | null>(null);
  const [isMealBusy, setIsMealBusy] = useState(false);
  const [isPhotoDragActive, setIsPhotoDragActive] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>("checking");
  const [agentStatus, setAgentStatus] =
    useState<MealAgentStatusResponse | null>(null);
  const [agentStatusError, setAgentStatusError] = useState("");
  const [isAgentStatusBusy, setIsAgentStatusBusy] = useState(false);
  const [status, setStatus] = useState("Дневник синхронизируется через Jazz.");

  const refreshAgentStatus = useCallback(async () => {
    setIsAgentStatusBusy(true);
    setAgentStatusError("");

    try {
      const response = await fetch(mealAgentStatusEndpoint, {
        method: "GET",
        headers: { accept: "application/json" },
      });
      const payload = (await response.json()) as MealAgentStatusResponse;

      if (!response.ok) {
        throw new Error("Не удалось проверить AI-агента.");
      }

      setAgentStatus(payload);
      setAgentStatusError("");
    } catch (error) {
      setAgentStatus(null);
      setAgentStatusError(
        error instanceof Error
          ? error.message
          : "Не удалось проверить AI-агента.",
      );
    } finally {
      setIsAgentStatusBusy(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshAgentStatus().finally(() => {
        setAnalysisPhase((current) =>
          current === "checking" ? "idle" : current,
        );
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshAgentStatus]);

  if (!account.$isLoaded) {
    return <LoadingDiary />;
  }

  const journal = account.root.journal;
  const accountProfile = account.profile;
  const userProfile = account.root.userProfile;
  const mealMemory = account.root.mealMemory;

  if (!userProfile?.$isLoaded) {
    return <LoadingDiary />;
  }

  if (!mealMemory) {
    throw new Error("Meal memory was not initialized by Jazz migration.");
  }

  if (!mealMemory.$isLoaded) {
    return <LoadingDiary />;
  }

  const loadedMealMemory = mealMemory;
  const loadedUserProfile = userProfile;
  const nutritionProfile = profileSnapshot(loadedUserProfile);
  const selectedGoal = journal.goal.mode;
  const goalOption = goalById(selectedGoal);
  const goal: GoalWithTargets = {
    ...goalOption,
    targets: calculateNutritionTargets(nutritionProfile, selectedGoal),
  };
  const meals = [...journal.meals].sort(
    (left, right) =>
      new Date(right.eatenAtIso).getTime() -
      new Date(left.eatenAtIso).getTime(),
  );
  const mealMemorySnapshots = [...loadedMealMemory]
    .map(mealMemorySnapshot)
    .sort(
      (left, right) =>
        new Date(right.lastSeenAtIso).getTime() -
        new Date(left.lastSeenAtIso).getTime(),
    );
  const totals = sumMeals(meals);
  const latestMealRecommendation = meals.find(
    (meal) => meal.recommendation,
  )?.recommendation;
  const recommendation = latestMealRecommendation ?? recommendationFor(goal, totals);
  const caloriesLeft = goal.targets.calories - totals.calories;
  const nutrientGaps = buildNutrientGaps(totals, goal.targets);
  const strongestGap = nutrientGaps[0];
  const score = dayScore(totals, goal.targets);
  const macroSplit = macroEnergy(totals);
  const suggestedProducts = nextProducts({
    strongestGap,
    caloriesLeft,
    goalId: goal.id,
  });
  const normalizedAuthEmail = normalizeAuthEmail(authEmail);
  const normalizedAuthName = authName.trim();
  const authUser = authSession.data?.user;
  const isSignedIn = Boolean(authUser);
  const authActionLabel = authMode === "sign-in" ? "Войти" : "Создать";
  const accountName = authUser?.name ?? accountProfile.name;
  const accountEmail = authUser?.email;
  const accountId = account.$jazz.id;
  const reviewMemoryMatches = reviewDraft
    ? findReviewMemoryMatches(reviewDraft, mealMemorySnapshots)
    : [];

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidAuthEmail(normalizedAuthEmail)) {
      setAuthError("Введите корректный email.");
      setStatus("Аккаунт не открыт: email выглядит неверно.");
      return;
    }

    if (!isValidAuthPassword(authPassword)) {
      setAuthError("Пароль должен быть не короче 8 символов.");
      setStatus("Аккаунт не открыт: пароль слишком короткий.");
      return;
    }

    const nextName =
      authMode === "sign-up"
        ? normalizedAuthName || defaultNameFromEmail(normalizedAuthEmail)
        : defaultNameFromEmail(normalizedAuthEmail);

    setIsAuthBusy(true);
    setAuthError("");
    setStatus(
      authMode === "sign-in"
        ? "Проверяем email и пароль."
        : "Создаем серверный аккаунт.",
    );

    try {
      if (authMode === "sign-in") {
        const response = await authClient.signIn.email({
          email: normalizedAuthEmail,
          password: authPassword,
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        setStatus(`Открыт аккаунт ${normalizedAuthEmail}.`);
      } else {
        accountProfile.$jazz.set("name", nextName);

        const response = await authClient.signUp.email({
          email: normalizedAuthEmail,
          name: nextName,
          password: authPassword,
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        setStatus(`Создан серверный аккаунт ${normalizedAuthEmail}.`);
      }

      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
    } catch (error) {
      const message = readableAuthError(error);
      setAuthError(message);
      setStatus("Авторизация не прошла.");
    } finally {
      setIsAuthBusy(false);
    }
  }

  async function handleLogOut() {
    setIsAuthBusy(true);
    setAuthError("");
    setStatus("Выходим из Jazz-аккаунта.");

    try {
      const response = await authClient.signOut();

      if (response.error) {
        throw new Error(response.error.message);
      }

      setStatus("Вы вышли. Сейчас открыт анонимный дневник.");
    } catch (error) {
      setAuthError(readableAuthError(error));
      setStatus("Не удалось выйти из аккаунта.");
    } finally {
      setIsAuthBusy(false);
    }
  }

  function setMealPhoto(file: File) {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    if (!file.type.startsWith("image/")) {
      setAnalysisError("Нужен файл изображения.");
      setAnalysisPhase("failed");
      setStatus("Фото не добавлено: файл не похож на изображение.");
      return;
    }

    setPhotoName(file.name);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setReviewDraft(null);
    setAnalysisError("");
    setAnalysisPhase("idle");
    setStatus("Фото добавлено. Нажми «Добавить», чтобы запустить анализ.");
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMealPhoto(file);
  }

  function handlePhotoDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsPhotoDragActive(false);

    const file = Array.from(event.dataTransfer.files).find((item) =>
      item.type.startsWith("image/"),
    );

    if (!file) {
      setAnalysisError("Перетащи сюда файл изображения.");
      setAnalysisPhase("failed");
      setStatus("Фото не добавлено.");
      return;
    }

    setMealPhoto(file);
  }

  function handleMealTextPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const file = Array.from(event.clipboardData.files).find((item) =>
      item.type.startsWith("image/"),
    );

    if (file) {
      setMealPhoto(file);
    }
  }

  function updateReviewDraft(patch: Partial<MealDraft>) {
    setReviewDraft((current) => {
      if (!current) {
        throw new Error("Review draft is missing.");
      }

      return {
        ...current,
        ...patch,
      };
    });
  }

  function updateReviewNumber(field: ReviewNumberField, value: number) {
    if (!Number.isFinite(value) || value < 0) return;

    updateReviewDraft({
      [field]: field === "caloriesKcal" ? Math.round(value) : value,
    });
  }

  function handleGoalChange(goalId: GoalId) {
    const nextGoal = goalById(goalId);
    const targets = calculateNutritionTargets(nutritionProfile, goalId);

    journal.goal.$jazz.applyDiff({
      mode: nextGoal.id,
      ...targetDiff(targets),
    });

    setStatus(`Цель сохранена и синхронизируется: ${nextGoal.label}.`);
  }

  function updateProfile(patch: Partial<NutritionProfileData>) {
    const nextProfile = {
      ...nutritionProfile,
      ...patch,
    };
    const targets = calculateNutritionTargets(nextProfile, selectedGoal);

    loadedUserProfile.$jazz.applyDiff(patch);
    journal.goal.$jazz.applyDiff({
      mode: selectedGoal,
      ...targetDiff(targets),
    });
    setStatus("Профиль сохранен, цели пересчитаны и синхронизируются.");
  }

  function updateProfileNumber(
    field: "ageYears" | "heightCentimeters" | "weightKilograms",
    value: number,
  ) {
    if (!Number.isFinite(value)) return;

    if (value <= 0) {
      throw new Error(`Profile field ${field} must be positive.`);
    }

    updateProfile({ [field]: value });
  }

  function clearMealComposer() {
    setMealText("");
    clearPhotoDraft();
  }

  function clearPhotoDraft() {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(null);
    setPhotoName("");
    setPhotoPreview(null);
    setPhotoInputKey((key) => key + 1);
    setIsPhotoDragActive(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const hasText = mealText.trim().length > 0;
    const hasPhoto = photoFile !== null;

    if (!hasText && !hasPhoto) {
      setStatus("Добавь текст или фото еды.");
      setAnalysisPhase("idle");
      return;
    }

    if (agentStatus?.ok === false) {
      setAnalysisError("AI-агент не готов. Исправь красные пункты в диагностике.");
      setAnalysisPhase("failed");
      setStatus("AI-анализ не запущен: агент не готов.");
      return;
    }

    setIsMealBusy(true);
    setAnalysisError("");
    setAnalysisPhase("analyzing");
    setStatus("Анализируем еду через AI.");

    try {
      const analysis = await analyzeMeal({
        text: mealText,
        photoFile,
        profile: nutritionProfile,
        goal,
        mealMemory: mealMemorySnapshots,
        previousMeals: meals,
      });

      const mealDraft = mealDraftFromAnalysis({
        analysis,
        source: hasPhoto && hasText ? "text-photo" : hasPhoto ? "photo" : "text",
        photoName,
      });

      setReviewDraft(mealDraft);
      setAnalysisPhase("review");
      setStatus("Проверь AI-расчет перед сохранением.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI-анализ не прошел.";

      setAnalysisError(message);
      setAnalysisPhase("failed");
      setStatus("AI-анализ не прошел.");
      void refreshAgentStatus();
    } finally {
      setIsMealBusy(false);
    }
  }

  function upsertConfirmedMealMemory(draft: MealDraft, lastSeenAtIso: string) {
    const normalizedTitle = normalizeMealMemoryTitle(draft.title);

    if (!normalizedTitle) {
      throw new Error("Meal memory title must not be empty.");
    }

    const existingEntry = loadedMealMemory.find(
      (entry) => entry.normalizedTitle === normalizedTitle,
    );
    const nextInput = mealMemoryInputFromDraft({
      draft,
      lastSeenAtIso,
      timesConfirmed: (existingEntry?.timesConfirmed ?? 0) + 1,
    });

    if (existingEntry) {
      existingEntry.$jazz.applyDiff(nextInput);
      return existingEntry;
    }

    const entry = MealMemoryEntry.create(nextInput);
    loadedMealMemory.$jazz.unshift(entry);

    if (loadedMealMemory.length > mealMemoryLimit) {
      loadedMealMemory.$jazz.splice(
        mealMemoryLimit,
        loadedMealMemory.length - mealMemoryLimit,
      );
    }

    return entry;
  }

  async function saveReviewDraft() {
    if (!reviewDraft) {
      throw new Error("Review draft is missing.");
    }

    if (!normalizeMealMemoryTitle(reviewDraft.title)) {
      setAnalysisError("Введите название блюда перед сохранением.");
      setAnalysisPhase("failed");
      setStatus("Запись не сохранена: название пустое.");
      return;
    }

    setIsMealBusy(true);
    setAnalysisError("");
    setAnalysisPhase("saving");
    setStatus(
      photoFile ? "Сохраняем проверенную запись и фото." : "Сохраняем запись.",
    );

    const savedAtIso = new Date().toISOString();
    let mealDraft: Parameters<typeof MealEntry.create>[0] = {
      ...reviewDraft,
      eatenAtIso: savedAtIso,
    };

    try {
      if (photoFile) {
        const { createImage } = await import("jazz-tools/media");
        const photo = await createImage(photoFile, {
          maxSize: 1280,
          placeholder: "blur",
          progressive: true,
        });
        mealDraft = {
          ...mealDraft,
          photo,
        };
      }
    } catch (error) {
      setStatus("Не удалось сохранить фото.");
      setAnalysisPhase("failed");
      setIsMealBusy(false);
      throw error;
    }

    try {
      const meal = MealEntry.create(mealDraft);
      const memoryEntry = upsertConfirmedMealMemory(reviewDraft, savedAtIso);
      journal.meals.$jazz.push(meal);

      if (meal.photo) {
        for (const streamRef of Object.values(meal.photo.$jazz.refs)) {
          const stream = streamRef?.value;

          if (stream?.$isLoaded) {
            await stream.$jazz.waitForSync({ timeout: syncSaveTimeoutMs });
          }
        }

        await meal.photo.$jazz.waitForSync({ timeout: syncSaveTimeoutMs });
      }

      await meal.$jazz.waitForSync({ timeout: syncSaveTimeoutMs });
      await memoryEntry.$jazz.waitForSync({ timeout: syncSaveTimeoutMs });
      await journal.meals.$jazz.waitForSync({ timeout: syncSaveTimeoutMs });
      await loadedMealMemory.$jazz.waitForSync({ timeout: syncSaveTimeoutMs });
      await journal.$jazz.waitForSync({ timeout: syncSaveTimeoutMs });

      clearMealComposer();
      setReviewDraft(null);
      setAnalysisPhase("idle");
      setStatus(
        meal.photo
          ? `Сохранено с AI-анализом, фото и памятью: ${meal.title}.`
          : `Сохранено с AI-анализом и памятью: ${meal.title}.`,
      );
    } catch (error) {
      setAnalysisPhase("failed");
      setStatus(
        "Не удалось полностью сохранить запись в Jazz.",
      );
      throw error;
    } finally {
      setIsMealBusy(false);
    }
  }

  function cancelReviewDraft() {
    setReviewDraft(null);
    setAnalysisError("");
    setAnalysisPhase("idle");
    setStatus("AI-расчет отменен.");
  }

  function removeMeal(id: string) {
    const index = journal.meals.findIndex((meal) => meal.$jazz.id === id);
    if (index === -1) {
      throw new Error(`Meal ${id} was not found in the Jazz journal.`);
    }

    journal.meals.$jazz.splice(index, 1);
    setStatus("Прием пищи удален из Jazz-дневника.");
  }

  return (
    <main className="min-h-screen bg-[#f4f7f4] text-[#17211d]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-[#d7dfd9] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#17352f] text-white">
              <Utensils className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-6">
                Prilozyxa Calories
              </p>
              <p className="text-sm text-[#617069]">
                {formatJournalDate(journal.dateIso)} ·{" "}
                {isSignedIn ? "серверный аккаунт" : "анонимный дневник"}
              </p>
            </div>
          </div>

          <div className="w-full max-w-xl space-y-2 lg:w-auto">
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Badge
                variant="outline"
                className={cn(
                  "h-8 rounded-lg px-3",
                  syncConnected
                    ? "border-[#225b43] bg-[#e7f1eb] text-[#225b43]"
                    : "border-[#a6544b] bg-[#fff4f1] text-[#704037]",
                )}
              >
                <Cloud className="mr-1 size-3.5" aria-hidden="true" />
                {syncConnected ? "sync-сервер онлайн" : "sync-сервер офлайн"}
              </Badge>
              {isSignedIn ? (
                <Badge
                  variant="outline"
                  className="h-8 rounded-lg border-[#cfd9d3] bg-white px-3 text-[#53625b]"
                >
                  <UserRound className="mr-1 size-3.5" aria-hidden="true" />
                  {accountName}
                </Badge>
              ) : null}
            </div>

            {isSignedIn ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <p className="min-w-0 text-sm leading-5 text-[#617069]">
                  {accountEmail ?? "Аккаунт"} · {shortAccountId(accountId)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 gap-2 px-4"
                  disabled={isAuthBusy}
                  onClick={handleLogOut}
                >
                  Выйти
                  <LogOut className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "sign-in" as const, label: "Вход" },
                    { id: "sign-up" as const, label: "Регистрация" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={authMode === item.id}
                      onClick={() => {
                        setAuthMode(item.id);
                        setAuthError("");
                      }}
                      className={cn(
                        "h-9 rounded-lg border text-sm font-medium transition-colors",
                        authMode === item.id
                          ? "border-[#225b43] bg-[#e7f1eb] text-[#225b43]"
                          : "border-[#d7dfd9] bg-white hover:bg-[#f3f7f4]",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleAuthSubmit} className="grid gap-2">
                  {authMode === "sign-up" ? (
                    <>
                      <Label className="sr-only" htmlFor="auth-name">
                        Имя
                      </Label>
                      <div className="relative">
                        <UserRound
                          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#687770]"
                          aria-hidden="true"
                        />
                        <Input
                          id="auth-name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          value={authName}
                          onChange={(event) => {
                            setAuthName(event.currentTarget.value);
                            setAuthError("");
                          }}
                          placeholder="имя"
                          className="h-10 min-w-0 bg-white pl-9"
                        />
                      </div>
                    </>
                  ) : null}

                  <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_minmax(150px,0.8fr)_auto]">
                    <Label className="sr-only" htmlFor="auth-email">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#687770]"
                        aria-hidden="true"
                      />
                      <Input
                        id="auth-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={authEmail}
                        onChange={(event) => {
                          setAuthEmail(event.currentTarget.value);
                          setAuthError("");
                        }}
                        placeholder="email"
                        className="h-10 min-w-0 bg-white pl-9"
                      />
                    </div>

                    <Label className="sr-only" htmlFor="auth-password">
                      Пароль
                    </Label>
                    <div className="relative">
                      <LockKeyhole
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#687770]"
                        aria-hidden="true"
                      />
                      <Input
                        id="auth-password"
                        name="password"
                        type="password"
                        autoComplete={
                          authMode === "sign-in"
                            ? "current-password"
                            : "new-password"
                        }
                        required
                        value={authPassword}
                        onChange={(event) => {
                          setAuthPassword(event.currentTarget.value);
                          setAuthError("");
                        }}
                        placeholder="пароль"
                        className="h-10 min-w-0 bg-white pl-9"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="h-10 gap-2 px-4"
                      disabled={isAuthBusy || authSession.isPending}
                    >
                      {isAuthBusy ? "Проверяем" : authActionLabel}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {authError ? (
              <p className="text-sm leading-5 text-[#a6544b]">{authError}</p>
            ) : null}
          </div>
        </header>

        <div className="grid flex-1 gap-4 py-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)_minmax(320px,0.8fr)]">
          <aside className="space-y-4">
            <section className="rounded-lg border border-[#d7dfd9] bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e7f1eb] text-[#225b43]">
                  <Target className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold leading-7">
                    Цель питания
                  </h1>
                  <p className="mt-1 text-sm leading-6 text-[#617069]">
                    Цель меняет дневные ориентиры и рекомендацию.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {goals.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={item.id === selectedGoal}
                    onClick={() => handleGoalChange(item.id)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      item.id === selectedGoal
                        ? "border-[#225b43] bg-[#e7f1eb]"
                        : "border-[#d7dfd9] bg-white hover:bg-[#f3f7f4]",
                    )}
                  >
                    <span className="block text-sm font-semibold">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-[#617069]">
                      {item.description}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[#d7dfd9] bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#eef2f8] text-[#263f78]">
                  <UserRound className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-7">Профиль</h2>
                  <p className="mt-1 text-sm leading-6 text-[#617069]">
                    Эти данные задают дневные ориентиры.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-weight">Вес</Label>
                  <Input
                    id="profile-weight"
                    type="number"
                    min={30}
                    step={0.1}
                    value={nutritionProfile.weightKilograms}
                    onChange={(event) =>
                      updateProfileNumber(
                        "weightKilograms",
                        event.currentTarget.valueAsNumber,
                      )
                    }
                    className="h-10 bg-[#fbfcfb]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-height">Рост</Label>
                  <Input
                    id="profile-height"
                    type="number"
                    min={120}
                    step={1}
                    value={nutritionProfile.heightCentimeters}
                    onChange={(event) =>
                      updateProfileNumber(
                        "heightCentimeters",
                        event.currentTarget.valueAsNumber,
                      )
                    }
                    className="h-10 bg-[#fbfcfb]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-age">Возраст</Label>
                  <Input
                    id="profile-age"
                    type="number"
                    min={14}
                    step={1}
                    value={nutritionProfile.ageYears}
                    onChange={(event) =>
                      updateProfileNumber(
                        "ageYears",
                        event.currentTarget.valueAsNumber,
                      )
                    }
                    className="h-10 bg-[#fbfcfb]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Пол</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {biologicalSexOptions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={nutritionProfile.biologicalSex === item}
                        onClick={() => updateProfile({ biologicalSex: item })}
                        className={cn(
                          "h-10 rounded-lg border text-sm font-medium transition-colors",
                          nutritionProfile.biologicalSex === item
                            ? "border-[#263f78] bg-[#eef2f8] text-[#263f78]"
                            : "border-[#d7dfd9] bg-white hover:bg-[#f3f7f4]",
                        )}
                      >
                        {biologicalSexLabels[item]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <Label>Активность</Label>
                <div className="grid gap-1.5 sm:grid-cols-3">
                  {activityOptions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={nutritionProfile.activityLevel === item}
                      onClick={() => updateProfile({ activityLevel: item })}
                      className={cn(
                        "h-10 rounded-lg border text-sm font-medium transition-colors",
                        nutritionProfile.activityLevel === item
                          ? "border-[#225b43] bg-[#e7f1eb] text-[#225b43]"
                          : "border-[#d7dfd9] bg-white hover:bg-[#f3f7f4]",
                      )}
                    >
                      {activityLabels[item]}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-[#d7dfd9] bg-white shadow-sm">
              <div
                className="h-48 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${photoPreview ?? "/nutrition-hero.png"})`,
                }}
                aria-label="Фото еды"
              />
              <div className="p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[#225b43]">
                  <Camera className="size-4" aria-hidden="true" />
                  Фото к текущей записи
                </div>
                <p className="mt-2 min-h-10 text-sm leading-5 text-[#617069]">
                  {photoName || "Можно добавить снимок тарелки перед отправкой."}
                </p>
              </div>
            </section>
          </aside>

          <section className="rounded-lg border border-[#d7dfd9] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#dfe7e2] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold leading-8">
                  Что было съедено
                </h2>
                <p className="mt-1 text-sm text-[#617069]">{status}</p>
              </div>
              <Badge className="h-7 rounded-lg bg-[#e9edf7] px-3 text-[#263f78] hover:bg-[#e9edf7]">
                {meals.length} записи
              </Badge>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <Label htmlFor="meal-text">Еда текстом</Label>
              <Textarea
                id="meal-text"
                value={mealText}
                onChange={(event) => setMealText(event.target.value)}
                onPaste={handleMealTextPaste}
                placeholder="Например: курица, рис, салат, латте"
                className="min-h-28 resize-none border-[#cfd9d3] bg-[#fbfcfb] text-base"
              />

              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsPhotoDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsPhotoDragActive(true);
                }}
                onDragLeave={() => setIsPhotoDragActive(false)}
                onDrop={handlePhotoDrop}
                className={cn(
                  "rounded-lg border border-dashed border-[#cfd9d3] bg-[#fbfcfb] p-3 transition-colors",
                  isPhotoDragActive && "border-[#225b43] bg-[#e7f1eb]",
                )}
              >
                <Input
                  key={photoInputKey}
                  id="meal-photo"
                  name="meal-photo"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handlePhotoChange}
                />
                {photoPreview ? (
                  <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                    <div
                      aria-label="Фото для анализа"
                      className="h-28 w-full rounded-lg bg-cover bg-center sm:w-[140px]"
                      style={{ backgroundImage: `url(${photoPreview})` }}
                    />
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-[#26302c]">
                        {photoName}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-[#617069]">
                        Фото готово к анализу. Можно добавить текст для точной порции.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Label
                          htmlFor="meal-photo"
                          className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#cfd9d3] bg-white px-3 text-sm font-medium transition-colors hover:bg-[#f3f7f4]"
                        >
                          <ImagePlus className="size-4" aria-hidden="true" />
                          Заменить фото
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 px-3"
                          onClick={clearPhotoDraft}
                        >
                          Убрать фото
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Label
                    htmlFor="meal-photo"
                    className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg text-center"
                  >
                    <ImagePlus
                      className="size-6 text-[#225b43]"
                      aria-hidden="true"
                    />
                    <span className="mt-2 text-sm font-medium text-[#26302c]">
                      Добавить фото еды
                    </span>
                    <span className="mt-1 text-sm leading-5 text-[#617069]">
                      Нажми сюда, перетащи изображение или вставь его в поле текста.
                    </span>
                  </Label>
                )}
              </div>

              <AnalysisStateBanner
                phase={analysisPhase}
                error={analysisError}
                status={agentStatus}
              />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="submit"
                  className="h-10 gap-2 px-4"
                  disabled={
                    isMealBusy ||
                    analysisPhase === "checking" ||
                    agentStatus?.ok === false
                  }
                >
                  {isMealBusy
                    ? analysisPhase === "saving"
                      ? "Сохраняем"
                      : "Анализируем"
                    : reviewDraft
                      ? "Пересчитать"
                      : "Добавить"}
                  <Send className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </form>

            {reviewDraft ? (
              <div className="mt-5 border-y border-[#dfe7e2] py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold leading-7">
                      Проверка AI-расчета
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[#617069]">
                      Поправь порцию и нутриенты перед записью.
                    </p>
                  </div>
                  {reviewDraft.confidencePercent !== undefined ? (
                    <Badge
                      variant="outline"
                      className="h-7 rounded-lg border-[#cfd9d3] bg-white text-[#53625b]"
                    >
                      AI {reviewDraft.confidencePercent}%
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="review-title">Название</Label>
                    <Input
                      id="review-title"
                      value={reviewDraft.title}
                      onChange={(event) =>
                        updateReviewDraft({ title: event.currentTarget.value })
                      }
                      className="h-10 bg-[#fbfcfb]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="review-detail">Комментарий</Label>
                    <Textarea
                      id="review-detail"
                      value={reviewDraft.detail}
                      onChange={(event) =>
                        updateReviewDraft({ detail: event.currentTarget.value })
                      }
                      className="min-h-20 resize-none border-[#cfd9d3] bg-[#fbfcfb]"
                    />
                  </div>
                  {reviewDraft.agentSummary || reviewDraft.portionAssumption ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {reviewDraft.agentSummary ? (
                        <div className="rounded-lg border border-[#dfe7e2] bg-[#fbfcfb] p-3">
                          <p className="text-sm font-medium text-[#26302c]">
                            Как решил агент
                          </p>
                          <p className="mt-1 text-sm leading-5 text-[#617069]">
                            {reviewDraft.agentSummary}
                          </p>
                        </div>
                      ) : null}
                      {reviewDraft.portionAssumption ? (
                        <div className="rounded-lg border border-[#dfe7e2] bg-[#fbfcfb] p-3">
                          <p className="text-sm font-medium text-[#26302c]">
                            Порция
                          </p>
                          <p className="mt-1 text-sm leading-5 text-[#617069]">
                            {reviewDraft.portionAssumption}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {reviewDraft.needsUserReview ? (
                    <div className="rounded-lg border border-[#d7b9aa] bg-[#fff8f4] p-3 text-sm leading-5 text-[#704037]">
                      Агент просит проверить порцию или состав перед сохранением.
                    </div>
                  ) : null}
                  <ConfidenceSignals
                    value={reviewDraft.confidenceSignalsSummary}
                  />
                  {reviewMemoryMatches.length > 0 ? (
                    <div className="space-y-3 rounded-lg border border-[#dfe7e2] bg-[#fbfcfb] p-3">
                      <div className="flex items-center gap-2">
                        <Database
                          className="size-4 text-[#225b43]"
                          aria-hidden="true"
                        />
                        <p className="text-sm font-medium text-[#26302c]">
                          Похожие подтверждения
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {reviewMemoryMatches.map((entry) => (
                          <div
                            key={`${entry.normalizedTitle}-${entry.lastSeenAtIso}`}
                            className="rounded-lg border border-[#dfe7e2] bg-white p-3"
                          >
                            <p className="line-clamp-2 text-sm font-medium text-[#26302c]">
                              {entry.title}
                            </p>
                            <p className="mt-1 text-sm text-[#617069]">
                              {entry.caloriesKcal} ккал · белок{" "}
                              {entry.proteinGrams} г
                            </p>
                            <p className="mt-1 text-sm text-[#617069]">
                              {entry.timesConfirmed} подтвержд. ·{" "}
                              {formatJournalDate(entry.lastSeenAtIso.slice(0, 10))}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {reviewDraft.usedToolsSummary ||
                  reviewDraft.identifiedFoodsSummary ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {reviewDraft.usedToolsSummary ? (
                        <div className="space-y-2 rounded-lg border border-[#dfe7e2] bg-[#fbfcfb] p-3">
                          <p className="text-sm font-medium text-[#26302c]">
                            Инструменты
                          </p>
                          <SummaryChips
                            value={reviewDraft.usedToolsSummary}
                            tone="agent"
                          />
                        </div>
                      ) : null}
                      {reviewDraft.identifiedFoodsSummary ? (
                        <div className="space-y-2 rounded-lg border border-[#dfe7e2] bg-[#fbfcfb] p-3">
                          <p className="text-sm font-medium text-[#26302c]">
                            Найденная еда
                          </p>
                          <SummaryChips
                            value={reviewDraft.identifiedFoodsSummary}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {reviewNumberFields.map((item) => (
                      <div key={item.field} className="space-y-1.5">
                        <Label htmlFor={`review-${item.field}`}>
                          {item.label}, {item.unit}
                        </Label>
                        <Input
                          id={`review-${item.field}`}
                          type="number"
                          min={0}
                          step={item.step}
                          value={reviewDraft[item.field]}
                          onChange={(event) =>
                            updateReviewNumber(
                              item.field,
                              event.currentTarget.valueAsNumber,
                            )
                          }
                          className="h-10 bg-[#fbfcfb]"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="review-recommendation">Рекомендация</Label>
                    <Textarea
                      id="review-recommendation"
                      value={reviewDraft.recommendation ?? ""}
                      onChange={(event) =>
                        updateReviewDraft({
                          recommendation: event.currentTarget.value,
                        })
                      }
                      className="min-h-20 resize-none border-[#cfd9d3] bg-[#fbfcfb]"
                    />
                  </div>
                  {reviewDraft.evidenceSummary ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="review-evidence">Факты агента</Label>
                      <Textarea
                        id="review-evidence"
                        value={reviewDraft.evidenceSummary}
                        readOnly
                        className="min-h-20 resize-none border-[#cfd9d3] bg-[#fbfcfb]"
                      />
                    </div>
                  ) : null}
                  <SourceLinks value={reviewDraft.sourceUrls} />
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-4"
                    disabled={isMealBusy}
                    onClick={cancelReviewDraft}
                  >
                    Отменить
                  </Button>
                  <Button
                    type="button"
                    className="h-10 gap-2 px-4"
                    disabled={isMealBusy}
                    onClick={saveReviewDraft}
                  >
                    Сохранить в дневник
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : null}

            <Separator className="my-5 bg-[#dfe7e2]" />

            <div className="space-y-3">
              {meals.map((meal) => {
                const photoId = meal.$jazz.refs.photo?.id;

                return (
                  <article
                    key={meal.$jazz.id}
                    className="grid gap-3 rounded-lg border border-[#dfe7e2] bg-[#fbfcfb] p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                  >
                    <MealIcon title={meal.title} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-base font-semibold leading-6">
                          {meal.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className="rounded-lg border-[#cfd9d3] bg-white text-[#53625b]"
                        >
                          {sourceLabels[meal.source]}
                        </Badge>
                        {meal.confidencePercent !== undefined ? (
                          <Badge
                            variant="outline"
                            className="rounded-lg border-[#cfd9d3] bg-white text-[#53625b]"
                          >
                            AI {meal.confidencePercent}%
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-[#617069]">
                        {meal.detail}
                      </p>
                      {meal.recommendation ? (
                        <p className="mt-2 rounded-lg bg-[#f7eee9] px-3 py-2 text-sm leading-5 text-[#704037]">
                          {meal.recommendation}
                        </p>
                      ) : null}
                      {meal.agentSummary ? (
                        <p className="mt-2 rounded-lg bg-[#eef2f8] px-3 py-2 text-sm leading-5 text-[#263f78]">
                          Агент: {meal.agentSummary}
                        </p>
                      ) : null}
                      {meal.needsUserReview ? (
                        <p className="mt-2 rounded-lg bg-[#fff8f4] px-3 py-2 text-sm leading-5 text-[#704037]">
                          Нужна проверка порции.
                        </p>
                      ) : null}
                      {meal.portionAssumption ? (
                        <p className="mt-1 text-sm leading-5 text-[#617069]">
                          Порция: {meal.portionAssumption}
                        </p>
                      ) : null}
                      {meal.confidenceSignalsSummary ? (
                        <div className="mt-2">
                          <ConfidenceSignals
                            value={meal.confidenceSignalsSummary}
                          />
                        </div>
                      ) : null}
                      {meal.usedToolsSummary ? (
                        <div className="mt-2">
                          <SummaryChips
                            value={meal.usedToolsSummary}
                            tone="agent"
                          />
                        </div>
                      ) : null}
                      {meal.identifiedFoodsSummary ? (
                        <div className="mt-2">
                          <SummaryChips value={meal.identifiedFoodsSummary} />
                        </div>
                      ) : null}
                      {meal.sourceUrls ? (
                        <div className="mt-2">
                          <SourceLinks value={meal.sourceUrls} />
                        </div>
                      ) : null}
                      {meal.photoName ? (
                        <p className="mt-1 text-sm leading-5 text-[#617069]">
                          Фото: {meal.photoName}
                        </p>
                      ) : null}
                      {photoId ? (
                        <MealPhoto imageId={photoId} title={meal.title} />
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#53625b]">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#edf3ef] px-2 py-1">
                          <Flame className="size-3.5" aria-hidden="true" />
                          {meal.caloriesKcal} ккал
                        </span>
                        <span className="rounded-lg bg-[#eef2f8] px-2 py-1">
                          Белок {meal.proteinGrams} г
                        </span>
                        <span className="rounded-lg bg-[#f6eee3] px-2 py-1">
                          Клетчатка {meal.fiberGrams} г
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-2 sm:block sm:text-right">
                      <p className="text-sm text-[#617069]">
                        {formatMealTime(meal.eatenAtIso)}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Удалить ${meal.title}`}
                        onClick={() => removeMeal(meal.$jazz.id)}
                        className="mt-0 text-[#7d4b45] hover:bg-[#f7e8e5] sm:mt-2"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <AgentStatusPanel
              status={agentStatus}
              error={agentStatusError}
              isBusy={isAgentStatusBusy}
              onRefresh={refreshAgentStatus}
            />

            <section className="rounded-lg border border-[#17352f] bg-[#17352f] p-4 text-white shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#bdd3ca]">Сегодня</p>
                  <p className="mt-1 text-3xl font-semibold leading-9">
                    {formatNumber(totals.calories)} ккал
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-white/10">
                  <Flame className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-white/10 p-3">
                <p className="text-sm text-[#dce8e2]">
                  {caloriesLeft >= 0
                    ? `Осталось ${formatNumber(caloriesLeft)} ккал`
                    : `Перебор ${formatNumber(Math.abs(caloriesLeft))} ккал`}
                </p>
                <div className="mt-3 h-2 rounded-lg bg-white/15">
                  <div
                    className="h-2 rounded-lg bg-[#77c09a]"
                    style={{
                      width: `${progressValue(totals.calories, goal.targets.calories)}%`,
                    }}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#d7dfd9] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Обзор дня</h2>
                  <p className="mt-1 text-sm leading-6 text-[#617069]">
                    Насколько текущий день близок к цели.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="h-8 rounded-lg border-[#225b43] bg-[#e7f1eb] px-3 text-[#225b43]"
                >
                  {score}%
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[#dfe7e2] bg-[#fbfcfb] p-3">
                  <p className="text-sm text-[#617069]">Приемов пищи</p>
                  <p className="mt-1 text-xl font-semibold">{meals.length}</p>
                </div>
                <div className="rounded-lg border border-[#dfe7e2] bg-[#fbfcfb] p-3">
                  <p className="text-sm text-[#617069]">Калории</p>
                  <p className="mt-1 text-xl font-semibold">
                    {progressValue(totals.calories, goal.targets.calories)}%
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-[#dfe7e2] bg-[#fbfcfb] p-3">
                <p className="text-sm text-[#617069]">Главный фокус</p>
                <p className="mt-1 text-base font-semibold text-[#26302c]">
                  {strongestGap
                    ? `${strongestGap.label}: осталось ${formatNumber(
                        strongestGap.remaining,
                      )} ${strongestGap.unit}`
                    : "Ключевые нутриенты закрыты"}
                </p>
                <p className="mt-2 text-sm leading-5 text-[#617069]">
                  {strongestGap
                    ? strongestGap.advice
                    : "Можно держать спокойный прием с белком, овощами и умеренной порцией углеводов."}
                </p>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-[#26302c]">
                    БЖУ по энергии
                  </span>
                  <span className="text-[#617069]">
                    {macroSplit.protein}% / {macroSplit.fat}% /{" "}
                    {macroSplit.carbs}%
                  </span>
                </div>
                <div
                  className="mt-2 flex h-2 overflow-hidden rounded-lg bg-[#dfe7e2]"
                  aria-label="Распределение белков, жиров и углеводов"
                >
                  <div
                    className="bg-[#2f7a55]"
                    style={{ width: `${macroSplit.protein}%` }}
                  />
                  <div
                    className="bg-[#a6544b]"
                    style={{ width: `${macroSplit.fat}%` }}
                  />
                  <div
                    className="bg-[#2f6993]"
                    style={{ width: `${macroSplit.carbs}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-[#617069]">
                  <span>белок</span>
                  <span>жиры</span>
                  <span>углеводы</span>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#d7dfd9] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-[#a6544b]" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Что съесть дальше</h2>
              </div>
              <p className="mt-3 text-base leading-7 text-[#2b3732]">
                {recommendation}
              </p>
              <div className="mt-4 flex gap-2 rounded-lg bg-[#f7eee9] p-3 text-sm leading-5 text-[#704037]">
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  Рекомендация пересчитывается после каждой новой записи.
                </span>
              </div>
            </section>

            <section className="rounded-lg border border-[#d7dfd9] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <MessageSquareText
                  className="size-5 text-[#2f6993]"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-semibold">Нутриенты</h2>
              </div>
              <div className="mt-4 space-y-4">
                <MacroBar
                  label="Белок"
                  value={totals.protein}
                  target={goal.targets.protein}
                  unit="г"
                  tone="bg-[#2f7a55]"
                />
                <MacroBar
                  label="Жиры"
                  value={totals.fat}
                  target={goal.targets.fat}
                  unit="г"
                  tone="bg-[#a6544b]"
                />
                <MacroBar
                  label="Углеводы"
                  value={totals.carbs}
                  target={goal.targets.carbs}
                  unit="г"
                  tone="bg-[#2f6993]"
                />
                <MacroBar
                  label="Клетчатка"
                  value={totals.fiber}
                  target={goal.targets.fiber}
                  unit="г"
                  tone="bg-[#8c6d2f]"
                />
                <MacroBar
                  label="Железо"
                  value={totals.iron}
                  target={goal.targets.iron}
                  unit="мг"
                  tone="bg-[#7b4ea0]"
                />
                <MacroBar
                  label="Калий"
                  value={totals.potassium}
                  target={goal.targets.potassium}
                  unit="мг"
                  tone="bg-[#c18b2d]"
                />
              </div>
            </section>

            <section className="rounded-lg border border-[#d7dfd9] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Plus className="size-5 text-[#225b43]" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Следующие продукты</h2>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedProducts.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setMealText((current) =>
                        current ? `${current}, ${item}` : item,
                      )
                    }
                    className="rounded-lg border border-[#d7dfd9] bg-[#fbfcfb] px-3 py-2 text-sm font-medium transition-colors hover:bg-[#edf3ef]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[#d7dfd9] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Database className="size-5 text-[#225b43]" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Знакомые блюда</h2>
              </div>
              <div className="mt-3 space-y-2">
                {mealMemorySnapshots.length > 0 ? (
                  mealMemorySnapshots.slice(0, 4).map((entry) => (
                    <div
                      key={`${entry.normalizedTitle}-${entry.lastSeenAtIso}`}
                      className="rounded-lg border border-[#dfe7e2] bg-[#fbfcfb] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 break-words text-sm font-medium text-[#26302c]">
                          {entry.title}
                        </p>
                        <Badge
                          variant="outline"
                          className="h-7 shrink-0 rounded-lg border-[#cfd9d3] bg-white text-[#53625b]"
                        >
                          {entry.timesConfirmed}x
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-[#617069]">
                        {entry.caloriesKcal} ккал · белок {entry.proteinGrams} г
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-[#617069]">
                    Появятся после сохранения проверенной еды.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
