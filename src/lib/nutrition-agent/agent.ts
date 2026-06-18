import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
  MealAnalysisSchema,
  type MealAnalysisResult,
} from "@/lib/nutrition/meal-analysis";
import { buildNutritionAgentPrompt } from "@/lib/nutrition-agent/prompt";
import {
  buildNutritionAgentToolPlan,
} from "@/lib/nutrition-agent/tool-plan";
import type { NutritionAgentInput } from "@/lib/nutrition-agent/types";

export async function analyzeMealWithNutritionAgent({
  apiKey,
  description,
  photoFile,
  profile,
  goal,
  targets,
  mealMemory,
  previousMeals,
}: NutritionAgentInput): Promise<MealAnalysisResult> {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY не задан на сервере.");
  }

  const toolPlan = buildNutritionAgentToolPlan({
    description,
    hasPhoto: photoFile !== null,
    mealMemory,
    previousMeals,
  });
  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "low" }
  > = [
    {
      type: "input_text",
      text: buildNutritionAgentPrompt({
        description,
        profile,
        goal,
        targets,
        mealMemory,
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
          "Ты агент питания внутри приложения треккинга калорий. Работай как расследователь: сначала используй память пользователя и явный текст, затем OCR/зрение по фото, затем локальную базу продуктов, затем web search для брендов, упаковок, ресторанов и неясных случаев. Для фото называй видимые продукты, оценивай порцию и честно помечай сомнения. Верни только структурированный JSON на русском, включая confidenceSignals по каждому сильному источнику уверенности. Не выдавай медицинские назначения.",
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
