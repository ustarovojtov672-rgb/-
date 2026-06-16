import { z } from "zod";

export const MealAnalysisEvidenceSchema = z.object({
  kind: z.enum([
    "vision",
    "ocr",
    "barcode",
    "memory",
    "local_database",
    "web_search",
    "user_text",
  ]),
  label: z.string(),
  detail: z.string(),
  sourceUrl: z.string().optional(),
});

export const MealAnalysisSchema = z.object({
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
  portionAssumption: z.string(),
  agentSummary: z.string(),
  usedTools: z
    .array(
      z.enum([
        "vision",
        "ocr",
        "barcode",
        "memory",
        "local_database",
        "web_search",
        "user_text",
      ]),
    )
    .max(8),
  evidence: z.array(MealAnalysisEvidenceSchema).max(10),
  sourceUrls: z.array(z.string()).max(8),
  needsUserReview: z.boolean(),
});

export type MealAnalysisResult = z.infer<typeof MealAnalysisSchema>;

export type MealAnalysisSuccessResponse = {
  meal: MealAnalysisResult;
};

export type MealAnalysisErrorResponse = {
  code: string;
  error: string;
};

export type MealAnalysisResponse =
  | MealAnalysisSuccessResponse
  | MealAnalysisErrorResponse;
