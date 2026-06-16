import type {
  GoalId,
  NutritionProfileData,
  NutritionTargets,
} from "@/lib/nutrition/targets";
import type { PreviousMealSnapshot } from "@/lib/nutrition-agent/memory";
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
  previousMeals: PreviousMealSnapshot[];
  toolPlan: NutritionAgentToolPlan;
  hasPhoto: boolean;
};

export function buildNutritionAgentPrompt({
  description,
  profile,
  goal,
  targets,
  previousMeals,
  toolPlan,
  hasPhoto,
}: NutritionAgentPromptInput) {
  return [
    "Задача: оценить только текущий прием пищи.",
    `Ввод пользователя: ${description || "текста нет"}.`,
    `Фото приложено: ${hasPhoto ? "да" : "нет"}.`,
    `Цель: ${goal.label} (${goal.id}).`,
    `Профиль: ${profile.biologicalSex}, ${profile.ageYears} лет, ${profile.heightCentimeters} см, ${profile.weightKilograms} кг, активность ${profile.activityLevel}.`,
    `Дневные ориентиры: ${targets.calories} ккал, белок ${targets.protein} г, жиры ${targets.fat} г, углеводы ${targets.carbs} г, клетчатка ${targets.fiber} г, железо ${targets.iron} мг, калий ${targets.potassium} мг.`,
    "",
    "План инструментов:",
    JSON.stringify(summarizeToolPlanForPrompt(toolPlan)),
    "",
    "Правила решения:",
    "- Если память дает точное совпадение с похожей едой, используй ее как сильный ориентир и отметь memory.",
    "- Если на этикетке есть готовые БЖУ и масса, считай от них, а не по средним значениям.",
    "- Если использовал web_search, положи ссылки в sourceUrls и evidence.",
    "- Если порция не ясна, выбери обычную порцию, снизь confidencePercent и поставь needsUserReview=true.",
    "- identifiedFoods должен содержать конкретные продукты, а не общие категории.",
    "- portionAssumption должен коротко объяснять массу или порцию, на которой основан расчет.",
    "- agentSummary должен коротко сказать, какой путь проверки выбран.",
    "- Верни только JSON без Markdown, пояснений до JSON и текста после JSON.",
    "",
    `Похожие прошлые приемы: ${JSON.stringify(toolPlan.memoryMatches)}`,
    `Последние приемы для контекста: ${JSON.stringify(previousMeals.slice(0, 8))}`,
    `Локальные совпадения базы продуктов: ${JSON.stringify(toolPlan.databaseMatches)}`,
  ].join("\n");
}
