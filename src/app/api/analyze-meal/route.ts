import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const runtime = "nodejs";

const maxPhotoBytes = 8 * 1024 * 1024;

const NutritionProfileSchema = z.object({
  biologicalSex: z.enum(["female", "male"]),
  ageYears: z.number(),
  heightCentimeters: z.number(),
  weightKilograms: z.number(),
  activityLevel: z.enum(["low", "medium", "high"]),
});

const GoalSchema = z.object({
  id: z.enum(["balance", "cut", "bulk"]),
  label: z.string(),
});

const TargetsSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  fat: z.number(),
  carbs: z.number(),
  fiber: z.number(),
  iron: z.number(),
  potassium: z.number(),
});

const MealAnalysisSchema = z.object({
  title: z.string(),
  detail: z.string(),
  caloriesKcal: z.number(),
  proteinGrams: z.number(),
  fatGrams: z.number(),
  carbsGrams: z.number(),
  fiberGrams: z.number(),
  ironMilligrams: z.number(),
  potassiumMilligrams: z.number(),
  confidencePercent: z.number().min(0).max(100),
  recommendation: z.string(),
  identifiedFoods: z.array(z.string()).max(8),
});

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        code: "OPENAI_API_KEY_MISSING",
        error: "OPENAI_API_KEY не задан на сервере.",
      },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  let description: string;
  let profile: z.infer<typeof NutritionProfileSchema>;
  let goal: z.infer<typeof GoalSchema>;
  let targets: z.infer<typeof TargetsSchema>;

  try {
    description = stringField(formData, "description").trim();
    profile = parseJsonField(formData, "profile", NutritionProfileSchema);
    goal = parseJsonField(formData, "goal", GoalSchema);
    targets = parseJsonField(formData, "targets", TargetsSchema);
  } catch (error) {
    return Response.json(
      {
        code: "MEAL_REQUEST_INVALID",
        error:
          error instanceof Error
            ? error.message
            : "Некорректный запрос на анализ еды.",
      },
      { status: 400 },
    );
  }

  const photo = formData.get("photo");
  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "low" }
  > = [
    {
      type: "input_text",
      text: buildPrompt({ description, profile, goal, targets }),
    },
  ];

  if (photo !== null) {
    if (!(photo instanceof File)) {
      return Response.json(
        { code: "PHOTO_FIELD_INVALID", error: "Поле photo должно быть файлом." },
        { status: 400 },
      );
    }

    if (!photo.type.startsWith("image/")) {
      return Response.json(
        { code: "PHOTO_TYPE_INVALID", error: "Файл photo должен быть изображением." },
        { status: 415 },
      );
    }

    if (photo.size > maxPhotoBytes) {
      return Response.json(
        {
          code: "PHOTO_TOO_LARGE",
          error: "Фото должно быть не больше 8 МБ.",
        },
        { status: 413 },
      );
    }

    const bytes = Buffer.from(await photo.arrayBuffer());
    content.push({
      type: "input_image",
      image_url: `data:${photo.type};base64,${bytes.toString("base64")}`,
      detail: "low",
    });
  }

  if (!description && photo === null) {
    return Response.json(
      { code: "MEAL_INPUT_EMPTY", error: "Нужен текст или фото еды." },
      { status: 400 },
    );
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MEAL_MODEL ?? "gpt-5.5",
    input: [
      {
        role: "system",
        content:
          "Ты нутрициологический анализатор для дневника питания. Оценивай еду по тексту и фото, возвращай только структурированный результат на русском. Числа должны быть реалистичной оценкой порции, а не медицинским назначением.",
      },
      {
        role: "user",
        content,
      },
    ],
    reasoning: {
      effort: "low",
    },
    text: {
      format: zodTextFormat(MealAnalysisSchema, "meal_analysis"),
    },
  });

  if (!response.output_parsed) {
    return Response.json(
      { code: "MEAL_ANALYSIS_EMPTY", error: "AI не вернул расчет еды." },
      { status: 502 },
    );
  }

  return Response.json({ meal: response.output_parsed });
}

function stringField(formData: FormData, name: string) {
  const value = formData.get(name);

  if (typeof value !== "string") {
    throw new Error(`Form field ${name} must be a string.`);
  }

  return value;
}

function parseJsonField<T extends z.ZodType>(
  formData: FormData,
  name: string,
  schema: T,
): z.infer<T> {
  const raw = stringField(formData, name);
  return schema.parse(JSON.parse(raw));
}

function buildPrompt({
  description,
  profile,
  goal,
  targets,
}: {
  description: string;
  profile: z.infer<typeof NutritionProfileSchema>;
  goal: z.infer<typeof GoalSchema>;
  targets: z.infer<typeof TargetsSchema>;
}) {
  return [
    `Описание пользователя: ${description || "текста нет, используй фото"}.`,
    `Цель: ${goal.label} (${goal.id}).`,
    `Профиль: ${profile.biologicalSex}, ${profile.ageYears} лет, ${profile.heightCentimeters} см, ${profile.weightKilograms} кг, активность ${profile.activityLevel}.`,
    `Дневные ориентиры: ${targets.calories} ккал, белок ${targets.protein} г, жиры ${targets.fat} г, углеводы ${targets.carbs} г, клетчатка ${targets.fiber} г, железо ${targets.iron} мг, калий ${targets.potassium} мг.`,
    "Верни оценку только для текущего приема пищи. Если порция не ясна, оцени обычную порцию и снизь confidencePercent.",
  ].join("\n");
}
