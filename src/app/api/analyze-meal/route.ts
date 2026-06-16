import { z } from "zod";

import { analyzeMealWithNutritionAgent } from "@/lib/nutrition-agent/agent";

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

const PreviousMealSchema = z.object({
  title: z.string(),
  detail: z.string(),
  eatenAtIso: z.string(),
  caloriesKcal: z.number(),
  proteinGrams: z.number(),
  fatGrams: z.number(),
  carbsGrams: z.number(),
  fiberGrams: z.number(),
  ironMilligrams: z.number(),
  potassiumMilligrams: z.number(),
  recommendation: z.string().optional(),
});

const PreviousMealsSchema = z.array(PreviousMealSchema).max(20);

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
  let previousMeals: z.infer<typeof PreviousMealsSchema>;

  try {
    description = stringField(formData, "description").trim();
    profile = parseJsonField(formData, "profile", NutritionProfileSchema);
    goal = parseJsonField(formData, "goal", GoalSchema);
    targets = parseJsonField(formData, "targets", TargetsSchema);
    previousMeals = parseOptionalJsonField(
      formData,
      "previousMeals",
      PreviousMealsSchema,
      [],
    );
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
  let photoFile: File | null = null;

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

    photoFile = photo;
  }

  if (!description && photo === null) {
    return Response.json(
      { code: "MEAL_INPUT_EMPTY", error: "Нужен текст или фото еды." },
      { status: 400 },
    );
  }

  try {
    const meal = await analyzeMealWithNutritionAgent({
      apiKey,
      description,
      photoFile,
      profile,
      goal,
      targets,
      previousMeals,
    });

    return Response.json({ meal });
  } catch (error) {
    return Response.json(
      {
        code: "NUTRITION_AGENT_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Агент питания не смог рассчитать еду.",
      },
      { status: 502 },
    );
  }
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

function parseOptionalJsonField<T extends z.ZodType>(
  formData: FormData,
  name: string,
  schema: T,
  defaultValue: z.infer<T>,
): z.infer<T> {
  const raw = formData.get(name);

  if (raw === null) {
    return defaultValue;
  }

  if (typeof raw !== "string") {
    throw new Error(`Form field ${name} must be a string.`);
  }

  return schema.parse(JSON.parse(raw));
}
