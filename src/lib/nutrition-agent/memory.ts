export type PreviousMealSnapshot = {
  title: string;
  detail: string;
  eatenAtIso: string;
  caloriesKcal: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  fiberGrams: number;
  ironMilligrams: number;
  potassiumMilligrams: number;
  recommendation?: string;
};

export type PreviousMealMatch = PreviousMealSnapshot & {
  score: number;
  daysAgo: number;
};

export function findSimilarMeals({
  query,
  previousMeals,
  now = new Date(),
  limit = 4,
}: {
  query: string;
  previousMeals: PreviousMealSnapshot[];
  now?: Date;
  limit?: number;
}) {
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return [];
  }

  return previousMeals
    .map((meal) => {
      const score = scoreMeal(queryTokens, meal);
      const daysAgo = Math.max(
        0,
        Math.round(
          (now.getTime() - new Date(meal.eatenAtIso).getTime()) /
            (24 * 60 * 60 * 1000),
        ),
      );

      return {
        ...meal,
        score,
        daysAgo,
      };
    })
    .filter((meal) => meal.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.daysAgo - right.daysAgo;
    })
    .slice(0, limit);
}

function scoreMeal(queryTokens: string[], meal: PreviousMealSnapshot) {
  const mealTokens = new Set(tokenize(`${meal.title} ${meal.detail}`));

  return queryTokens.reduce(
    (score, token) => score + (mealTokens.has(token) ? 1 : 0),
    0,
  );
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/iu)
    .filter((token) => token.length >= 3);
}
