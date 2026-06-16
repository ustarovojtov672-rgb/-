import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
  MealAnalysisSchema,
  type MealAnalysisResult,
} from "@/lib/nutrition/meal-analysis";
import type {
  GoalId,
  NutritionProfileData,
  NutritionTargets,
} from "@/lib/nutrition/targets";
import type { PreviousMealSnapshot } from "@/lib/nutrition-agent/memory";
import {
  buildNutritionAgentToolPlan,
  summarizeToolPlanForPrompt,
  type NutritionAgentToolPlan,
} from "@/lib/nutrition-agent/tool-plan";

type NutritionAgentGoal = {
  id: GoalId;
  label: string;
};

export type NutritionAgentInput = {
  apiKey: string;
  description: string;
  photoFile: File | null;
  profile: NutritionProfileData;
  goal: NutritionAgentGoal;
  targets: NutritionTargets;
  previousMeals: PreviousMealSnapshot[];
};

export async function analyzeMealWithNutritionAgent({
  apiKey,
  description,
  photoFile,
  profile,
  goal,
  targets,
  previousMeals,
}: NutritionAgentInput): Promise<MealAnalysisResult> {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY не задан на сервере.");
  }

  const toolPlan = buildNutritionAgentToolPlan({
    description,
    hasPhoto: photoFile !== null,
    previousMeals,
  });
  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "low" }
  > = [
    {
      type: "input_text",
      text: buildAgentPrompt({
        description,
        profile,
        goal,
        targets,
        previousMeals,
        toolPlan,
        hasPhoto: photoFile !== null,
      }),
    },
  ];

  if (photoFile) {
    content.push({
      type: "input_image",
      image_url: await fileToDataUrl(photoFile),
      detail: "low",
    });
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.parse({
    model:
      process.env.OPENAI_NUTRITION_AGENT_MODEL ??
      process.env.OPENAI_MEAL_MODEL ??
      "gpt-5.5",
    input: [
      {
        role: "system",
        content:
          "Ты агент питания внутри приложения треккинга калорий. Работай как расследователь: сначала используй память пользователя и явный текст, затем OCR/зрение по фото, затем локальную базу продуктов, затем web search для брендов, упаковок, ресторанов и неясных случаев. Верни только структурированный JSON на русском. Не выдавай медицинские назначения.",
      },
      {
        role: "user",
        content,
      },
    ],
    include: ["web_search_call.results", "web_search_call.action.sources"],
    reasoning: {
      effort: "low",
    },
    store: false,
    text: {
      format: zodTextFormat(MealAnalysisSchema, "nutrition_agent_meal_analysis"),
    },
    tools: [
      {
        type: "web_search_preview",
        search_content_types: ["text"],
        search_context_size: "medium",
      },
    ],
  });

  if (!response.output_parsed) {
    throw new Error("Агент питания не вернул расчет еды.");
  }

  return {
    ...response.output_parsed,
    sourceUrls: uniqueUrls([
      ...response.output_parsed.sourceUrls,
      ...extractUrls(response.output),
    ]),
  };
}

function buildAgentPrompt({
  description,
  profile,
  goal,
  targets,
  previousMeals,
  toolPlan,
  hasPhoto,
}: {
  description: string;
  profile: NutritionProfileData;
  goal: NutritionAgentGoal;
  targets: NutritionTargets;
  previousMeals: PreviousMealSnapshot[];
  toolPlan: NutritionAgentToolPlan;
  hasPhoto: boolean;
}) {
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
    "",
    `Похожие прошлые приемы: ${JSON.stringify(toolPlan.memoryMatches)}`,
    `Последние приемы для контекста: ${JSON.stringify(previousMeals.slice(0, 8))}`,
    `Локальные совпадения базы продуктов: ${JSON.stringify(toolPlan.databaseMatches)}`,
  ].join("\n");
}

async function fileToDataUrl(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${bytes.toString("base64")}`;
}

function uniqueUrls(urls: string[]) {
  return Array.from(
    new Set(urls.filter((url) => url.startsWith("http")).slice(0, 8)),
  );
}

function extractUrls(value: unknown): string[] {
  if (typeof value === "string") {
    return value.startsWith("http") ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(extractUrls);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.values(value).flatMap(extractUrls);
}
