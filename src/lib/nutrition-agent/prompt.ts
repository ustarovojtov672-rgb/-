import type {
  GoalId,
  NutritionProfileData,
  NutritionTargets,
} from "@/lib/nutrition/targets";
import type {
  MealMemorySnapshot,
  PreviousMealSnapshot,
} from "@/lib/nutrition-agent/memory";
import {
  summarizeToolPlanForPrompt,
  type NutritionAgentToolPlan,
} from "@/lib/nutrition-agent/tool-plan";

export type NutritionAgentGoal = {
  id: GoalId;
  label: string;
};

export type NutritionAgentPromptInput = {
  description: string;
  profile: NutritionProfileData;
  goal: NutritionAgentGoal;
  targets: NutritionTargets;
  mealMemory: MealMemorySnapshot[];
  previousMeals: PreviousMealSnapshot[];
  toolPlan: NutritionAgentToolPlan;
  hasPhoto: boolean;
};

export function buildNutritionAgentPrompt({
  description,
  profile,
  goal,
  targets,
  mealMemory,
  previousMeals,
  toolPlan,
  hasPhoto,
}: NutritionAgentPromptInput) {
  const bestDatabaseMatch = toolPlan.databaseMatches[0] ?? null;
  const goalDescription = goalDescriptions[goal.id];

  return [
    "Задача: оценить только текущий прием пищи.",
    `Ввод пользователя: ${description || "текста нет"}.`,
    `Фото приложено: ${hasPhoto ? "да" : "нет"}.`,
    `Цель: ${goal.label}; режим: ${goalDescription}.`,
    `Профиль: ${profile.biologicalSex}, ${profile.ageYears} лет, ${profile.heightCentimeters} см, ${profile.weightKilograms} кг, активность ${profile.activityLevel}.`,
    `Дневные ориентиры: ${targets.calories} ккал, белок ${targets.protein} г, жиры ${targets.fat} г, углеводы ${targets.carbs} г, клетчатка ${targets.fiber} г, железо ${targets.iron} мг, калий ${targets.potassium} мг.`,
    "",
    "План инструментов:",
    JSON.stringify(summarizeToolPlanForPrompt(toolPlan)),
    "",
    "Правила решения:",
    "- Если память дает точное совпадение с похожей едой, используй ее как сильный ориентир и отметь memory.",
    "- Если лучшее локальное совпадение базы продуктов не null, используй его как основной расчет для обычного продукта. Не возвращай неизвестный продукт при наличии локального совпадения.",
    "- Если фото приложено, отдельно оцени видимые продукты, размер порции, упаковку, этикетку и возможный соус или напиток.",
    "- Если фото приложено без текста, title должен описывать распознанную еду или честные кандидаты, а не generic-название вроде 'еда на фото'.",
    "- Если пользователь прислал уточнение к текущему расчету, оно важнее старого черновика. Старый черновик используй только как контекст, а не как факт.",
    "- Если на этикетке есть готовые БЖУ и масса, считай от них, а не по средним значениям.",
    "- Если использовал web_search, положи ссылки в sourceUrls и evidence.",
    "- Если порция на фото не ясна, выбери обычную порцию, снизь confidencePercent, добавь vision в confidenceSignals и поставь needsUserReview=true.",
    "- Если видишь упаковку или этикетку, сначала попробуй прочитать текст и nutrition facts; если данных хватает, считай по этикетке.",
    "- identifiedFoods должен содержать конкретные продукты, а не общие категории.",
    "- portionAssumption должен коротко объяснять массу или порцию, на которой основан расчет.",
    "- agentSummary должен коротко сказать, какой путь проверки выбран.",
    "- confidenceSignals должен показать, на чем держится расчет: фото, текст, этикетка, штрихкод, память, база или поиск. Для каждого сигнала дай kind, короткий label, confidencePercent и detail.",
    "- В пользовательских текстах не используй технические id целей balance, cut или bulk.",
    "- Верни только JSON без Markdown, пояснений до JSON и текста после JSON.",
    "",
    `Похожие прошлые приемы: ${JSON.stringify(toolPlan.memoryMatches)}`,
    `Подтвержденная память блюд: ${JSON.stringify(mealMemory.slice(0, 12))}`,
    `Последние приемы для контекста: ${JSON.stringify(previousMeals.slice(0, 8))}`,
    `Лучшее локальное совпадение базы продуктов: ${JSON.stringify(bestDatabaseMatch)}`,
    `Локальные совпадения базы продуктов: ${JSON.stringify(toolPlan.databaseMatches)}`,
  ].join("\n");
}

const goalDescriptions: Record<GoalId, string> = {
  balance: "поддержание баланса",
  cut: "похудение",
  bulk: "набор массы",
};
