export type GoalId = "balance" | "cut" | "bulk";
export type BiologicalSex = "female" | "male";
export type ActivityLevel = "low" | "medium" | "high";

export type NutritionTargets = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  iron: number;
  potassium: number;
};

export type NutritionProfileData = {
  biologicalSex: BiologicalSex;
  ageYears: number;
  heightCentimeters: number;
  weightKilograms: number;
  activityLevel: ActivityLevel;
};

export const defaultNutritionProfile: NutritionProfileData = {
  biologicalSex: "female",
  ageYears: 30,
  heightCentimeters: 170,
  weightKilograms: 70,
  activityLevel: "medium",
};

export const goalLabels: Record<GoalId, string> = {
  balance: "Баланс",
  cut: "Худеть",
  bulk: "Набирать массу",
};

export const activityLabels: Record<ActivityLevel, string> = {
  low: "Низкая",
  medium: "Средняя",
  high: "Высокая",
};

export const biologicalSexLabels: Record<BiologicalSex, string> = {
  female: "Женский",
  male: "Мужской",
};

const activityMultipliers: Record<ActivityLevel, number> = {
  low: 1.35,
  medium: 1.55,
  high: 1.75,
};

export function calculateNutritionTargets(
  profile: NutritionProfileData,
  goalId: GoalId,
): NutritionTargets {
  const bmr =
    10 * profile.weightKilograms +
    6.25 * profile.heightCentimeters -
    5 * profile.ageYears +
    (profile.biologicalSex === "male" ? 5 : -161);
  const maintenanceCalories = bmr * activityMultipliers[profile.activityLevel];
  const calories = Math.max(
    1200,
    Math.round(
      maintenanceCalories +
        (goalId === "cut" ? -450 : goalId === "bulk" ? 350 : 0),
    ),
  );
  const proteinMultiplier =
    goalId === "cut" ? 1.8 : goalId === "bulk" ? 1.9 : 1.6;
  const fatMultiplier = goalId === "bulk" ? 1 : 0.85;
  const protein = Math.round(profile.weightKilograms * proteinMultiplier);
  const fat = Math.max(45, Math.round(profile.weightKilograms * fatMultiplier));
  const caloriesAfterProteinAndFat = calories - protein * 4 - fat * 9;
  const carbs = Math.max(80, Math.round(caloriesAfterProteinAndFat / 4));

  return {
    calories,
    protein,
    fat,
    carbs,
    fiber: goalId === "cut" ? 34 : goalId === "bulk" ? 32 : 30,
    iron: profile.biologicalSex === "female" ? 18 : 8,
    potassium: goalId === "bulk" ? 3800 : 3500,
  };
}

export function targetDiff(targets: NutritionTargets) {
  return {
    dailyCaloriesKcal: targets.calories,
    proteinGrams: targets.protein,
    fatGrams: targets.fat,
    carbsGrams: targets.carbs,
    fiberGrams: targets.fiber,
    ironMilligrams: targets.iron,
    potassiumMilligrams: targets.potassium,
  };
}
