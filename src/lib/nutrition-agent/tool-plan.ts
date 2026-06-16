import {
  mealAnalysisToolLabels,
  type MealAnalysisTool,
} from "@/lib/nutrition/meal-analysis";
import {
  findSimilarMeals,
  type PreviousMealSnapshot,
} from "@/lib/nutrition-agent/memory";
import { searchLocalFoodDatabase } from "@/lib/nutrition-agent/product-database";

export type NutritionAgentToolPlanItem = {
  id: MealAnalysisTool;
  label: string;
  reason: string;
  priority: number;
};

export type NutritionAgentToolPlan = {
  tools: NutritionAgentToolPlanItem[];
  memoryMatches: ReturnType<typeof findSimilarMeals>;
  databaseMatches: ReturnType<typeof searchLocalFoodDatabase>;
  barcodeCandidates: string[];
  shouldSearchWeb: boolean;
};

export function buildNutritionAgentToolPlan({
  description,
  hasPhoto,
  previousMeals,
}: {
  description: string;
  hasPhoto: boolean;
  previousMeals: PreviousMealSnapshot[];
}): NutritionAgentToolPlan {
  const memoryMatches = findSimilarMeals({
    query: description,
    previousMeals,
  });
  const databaseMatches = searchLocalFoodDatabase(description);
  const barcodeCandidates = extractBarcodeCandidates(description);
  const hasDescription = description.trim().length > 0;
  const shouldSearchWeb =
    hasBrandSignal(description) ||
    barcodeCandidates.length > 0 ||
    (hasPhoto && !hasDescription) ||
    (hasDescription && databaseMatches.length === 0);

  const tools: NutritionAgentToolPlanItem[] = [
    planItem({
      id: "user_text",
      priority: hasDescription ? 1 : 6,
      reason: hasDescription
        ? "Пользователь уже назвал еду или порцию."
        : "Текст пустой, опирайся на фото и другие источники.",
    }),
    planItem({
      id: "vision",
      priority: hasPhoto ? 2 : 7,
      reason: hasPhoto
        ? "Фото приложено, оцени состав тарелки и размер порции."
        : "Фото не приложено, не заявляй визуальные факты.",
    }),
    planItem({
      id: "ocr",
      priority: hasPhoto ? 3 : 8,
      reason: hasPhoto
        ? "Если на фото упаковка или этикетка, прочитай название, массу и БЖУ."
        : "OCR нужен только когда есть фото упаковки или этикетки.",
    }),
    planItem({
      id: "barcode",
      priority: barcodeCandidates.length > 0 || hasPhoto ? 4 : 9,
      reason:
        barcodeCandidates.length > 0
          ? `В тексте похожий штрихкод: ${barcodeCandidates.join(", ")}.`
          : hasPhoto
            ? "Если на фото виден штрихкод, попробуй прочитать цифры."
            : "Штрихкод пока не найден.",
    }),
    planItem({
      id: "memory",
      priority: memoryMatches.length > 0 ? 2 : 10,
      reason:
        memoryMatches.length > 0
          ? "Есть похожие прошлые приемы пищи, используй их как сильный ориентир."
          : "Похожих прошлых приемов не найдено.",
    }),
    planItem({
      id: "local_database",
      priority: databaseMatches.length > 0 ? 3 : 11,
      reason:
        databaseMatches.length > 0
          ? "Локальная база нашла похожие продукты и обычные порции."
          : "Локальная база не нашла точное совпадение по текущему тексту.",
    }),
    planItem({
      id: "web_search",
      priority: shouldSearchWeb ? 5 : 12,
      reason: shouldSearchWeb
        ? "Нужны внешние данные для бренда, упаковки, ресторана, штрихкода или неясного фото."
        : "Интернет используй только если память, фото и локальная база не дают уверенный ответ.",
    }),
  ];

  return {
    tools: tools.sort((left, right) => left.priority - right.priority),
    memoryMatches,
    databaseMatches,
    barcodeCandidates,
    shouldSearchWeb,
  };
}

export function summarizeToolPlanForPrompt(plan: NutritionAgentToolPlan) {
  return {
    tools: plan.tools.map(({ id, label, reason, priority }) => ({
      id,
      label,
      reason,
      priority,
    })),
    barcodeCandidates: plan.barcodeCandidates,
    shouldSearchWeb: plan.shouldSearchWeb,
  };
}

function planItem({
  id,
  priority,
  reason,
}: {
  id: MealAnalysisTool;
  priority: number;
  reason: string;
}) {
  return {
    id,
    label: mealAnalysisToolLabels[id],
    reason,
    priority,
  };
}

function extractBarcodeCandidates(value: string) {
  return Array.from(value.matchAll(/\b\d{8,14}\b/g), (match) => match[0]).slice(
    0,
    4,
  );
}

function hasBrandSignal(value: string) {
  const normalized = value.toLowerCase();
  const brandSignals = [
    "бренд",
    "упаков",
    "этикет",
    "штрих",
    "barcode",
    "ean",
    "upc",
    "kfc",
    "бургер",
    "мак",
    "вкусно",
    "теремок",
    "самокат",
    "вкусвилл",
  ];

  return brandSignals.some((signal) => normalized.includes(signal));
}
