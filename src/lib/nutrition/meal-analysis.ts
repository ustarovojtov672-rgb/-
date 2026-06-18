import { z } from "zod";

export const MealAnalysisToolSchema = z.enum([
  "vision",
  "ocr",
  "barcode",
  "memory",
  "local_database",
  "web_search",
  "user_text",
]);

export type MealAnalysisTool = z.infer<typeof MealAnalysisToolSchema>;

export const mealAnalysisToolLabels: Record<MealAnalysisTool, string> = {
  vision: "зрение",
  ocr: "чтение этикетки",
  barcode: "штрихкод",
  memory: "память",
  local_database: "база продуктов",
  web_search: "поиск",
  user_text: "текст",
};

export const MealAnalysisEvidenceSchema = z.object({
  kind: MealAnalysisToolSchema,
  label: z.string(),
  detail: z.string(),
  sourceUrl: z.string().optional(),
});

export const MealAnalysisConfidenceSignalSchema = z.object({
  kind: MealAnalysisToolSchema,
  label: z.string(),
  confidencePercent: z.number().min(0).max(100),
  detail: z.string(),
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
  usedTools: z.array(MealAnalysisToolSchema).max(8),
  evidence: z.array(MealAnalysisEvidenceSchema).max(10),
  confidenceSignals: z.array(MealAnalysisConfidenceSignalSchema).max(8),
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

export type MealAgentStatusCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  action?: string;
};

export type MealAgentStatusResponse = {
  ok: boolean;
  runtime: "pi" | "openai" | "invalid";
  provider?: string;
  model?: string;
  checkedAtIso: string;
  checks: MealAgentStatusCheck[];
};
