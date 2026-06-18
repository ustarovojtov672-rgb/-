export type LocalFoodDatabaseEntry = {
  id: string;
  aliases: string[];
  title: string;
  serving: string;
  caloriesKcal: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  fiberGrams: number;
  ironMilligrams: number;
  potassiumMilligrams: number;
};

export type LocalFoodDatabaseMatch = LocalFoodDatabaseEntry & {
  score: number;
};

const localFoodDatabase: LocalFoodDatabaseEntry[] = [
  {
    id: "chicken-breast-cooked-150g",
    aliases: ["курица", "куриная грудка", "chicken breast"],
    title: "Куриная грудка готовая",
    serving: "150 г",
    caloriesKcal: 248,
    proteinGrams: 46.5,
    fatGrams: 5.4,
    carbsGrams: 0,
    fiberGrams: 0,
    ironMilligrams: 1.5,
    potassiumMilligrams: 384,
  },
  {
    id: "rice-cooked-120g",
    aliases: ["рис", "белый рис", "вареный рис"],
    title: "Рис вареный",
    serving: "120 г",
    caloriesKcal: 156,
    proteinGrams: 3.2,
    fatGrams: 0.4,
    carbsGrams: 34.2,
    fiberGrams: 0.5,
    ironMilligrams: 0.2,
    potassiumMilligrams: 42,
  },
  {
    id: "buckwheat-cooked-150g",
    aliases: ["гречка", "гречневая каша", "buckwheat"],
    title: "Гречка вареная",
    serving: "150 г",
    caloriesKcal: 165,
    proteinGrams: 5.1,
    fatGrams: 1.5,
    carbsGrams: 31.5,
    fiberGrams: 4.1,
    ironMilligrams: 1.2,
    potassiumMilligrams: 132,
  },
  {
    id: "greek-yogurt-2-percent-170g",
    aliases: ["греческий йогурт", "йогурт", "greek yogurt"],
    title: "Греческий йогурт 2%",
    serving: "170 г",
    caloriesKcal: 125,
    proteinGrams: 17,
    fatGrams: 3.5,
    carbsGrams: 6,
    fiberGrams: 0,
    ironMilligrams: 0.1,
    potassiumMilligrams: 240,
  },
  {
    id: "oatmeal-milk-banana",
    aliases: ["овсянка", "банан", "кофе с молоком", "oatmeal"],
    title: "Овсянка с бананом и молоком",
    serving: "1 миска",
    caloriesKcal: 510,
    proteinGrams: 18,
    fatGrams: 14,
    carbsGrams: 82,
    fiberGrams: 10,
    ironMilligrams: 2.6,
    potassiumMilligrams: 780,
  },
  {
    id: "cottage-cheese-5-percent-200g",
    aliases: ["творог", "творог 5", "cottage cheese"],
    title: "Творог 5%",
    serving: "200 г",
    caloriesKcal: 242,
    proteinGrams: 34,
    fatGrams: 10,
    carbsGrams: 3.6,
    fiberGrams: 0,
    ironMilligrams: 0.6,
    potassiumMilligrams: 224,
  },
  {
    id: "eggs-boiled-2",
    aliases: ["яйца", "вареные яйца", "egg"],
    title: "Яйца вареные",
    serving: "2 шт",
    caloriesKcal: 156,
    proteinGrams: 12.6,
    fatGrams: 10.6,
    carbsGrams: 1.2,
    fiberGrams: 0,
    ironMilligrams: 1.8,
    potassiumMilligrams: 126,
  },
  {
    id: "lentils-cooked-150g",
    aliases: ["чечевица", "lentils"],
    title: "Чечевица вареная",
    serving: "150 г",
    caloriesKcal: 174,
    proteinGrams: 13.5,
    fatGrams: 0.6,
    carbsGrams: 30,
    fiberGrams: 11.9,
    ironMilligrams: 5,
    potassiumMilligrams: 554,
  },
  {
    id: "salmon-baked-150g",
    aliases: ["лосось", "семга", "salmon"],
    title: "Лосось запеченный",
    serving: "150 г",
    caloriesKcal: 309,
    proteinGrams: 33,
    fatGrams: 18,
    carbsGrams: 0,
    fiberGrams: 0,
    ironMilligrams: 0.7,
    potassiumMilligrams: 545,
  },
  {
    id: "banana-medium",
    aliases: ["банан", "banana"],
    title: "Банан",
    serving: "1 средний",
    caloriesKcal: 105,
    proteinGrams: 1.3,
    fatGrams: 0.4,
    carbsGrams: 27,
    fiberGrams: 3.1,
    ironMilligrams: 0.3,
    potassiumMilligrams: 422,
  },
  {
    id: "apple-150g",
    aliases: ["яблоко", "яблоки", "apple"],
    title: "Яблоко",
    serving: "150 г",
    caloriesKcal: 78,
    proteinGrams: 0.4,
    fatGrams: 0.3,
    carbsGrams: 20.7,
    fiberGrams: 3.6,
    ironMilligrams: 0.2,
    potassiumMilligrams: 161,
  },
];

export function searchLocalFoodDatabase(query: string, limit = 5) {
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return [];
  }

  return localFoodDatabase
    .map((entry) => ({
      ...entry,
      score: scoreEntry(queryTokens, entry),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function scoreEntry(queryTokens: string[], entry: LocalFoodDatabaseEntry) {
  const aliasTokens = entry.aliases.flatMap(tokenize);
  const titleTokens = tokenize(entry.title);
  const allTokens = new Set([...aliasTokens, ...titleTokens]);

  return queryTokens.reduce(
    (score, token) => score + (allTokens.has(token) ? 1 : 0),
    0,
  );
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/iu)
    .filter((token) => token.length >= 3);
}
