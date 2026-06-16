export type MealAnalysisResult = {
  title: string;
  detail: string;
  caloriesKcal: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  fiberGrams: number;
  ironMilligrams: number;
  potassiumMilligrams: number;
  confidencePercent: number;
  recommendation: string;
  identifiedFoods: string[];
};

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
