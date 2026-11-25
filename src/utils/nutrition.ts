import type {
  BackupPayload,
  DailyGoals,
  FoodItem,
  MealCategory,
  MealEntry,
  NutritionTotals,
} from '../types/nutrition';

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + deltaDays);
  return formatDateKey(d);
}

export function getLastNDaysKeys(endDateKey: string, count: number): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    keys.push(shiftDateKey(endDateKey, -i));
  }
  return keys;
}

export function calculateMealTotals(
  items: FoodItem[],
  portionMultiplier = 1
): NutritionTotals {
  const safeMult = Number.isFinite(portionMultiplier) && portionMultiplier > 0 ? portionMultiplier : 1;
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const item of items) {
    calories += (Number(item.calories) || 0) * safeMult;
    protein += (Number(item.protein) || 0) * safeMult;
    carbs += (Number(item.carbs) || 0) * safeMult;
    fat += (Number(item.fat) || 0) * safeMult;
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };
}

export function scaleFoodItem(item: FoodItem, newGrams: number): FoodItem {
  const safeGrams = Math.max(1, Math.round(newGrams));
  const baseGrams = item.grams > 0 ? item.grams : 100;
  const ratio = safeGrams / baseGrams;

  return {
    ...item,
    grams: safeGrams,
    calories: Math.round(item.calories * ratio),
    protein: Math.round(item.protein * ratio * 10) / 10,
    carbs: Math.round(item.carbs * ratio * 10) / 10,
    fat: Math.round(item.fat * ratio * 10) / 10,
  };
}

export function applyMultiplierToItems(items: FoodItem[], multiplier: number): FoodItem[] {
  const safeMult = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  if (safeMult === 1) return items;
  return items.map((item) => ({
    ...item,
    grams: Math.max(1, Math.round(item.grams * safeMult)),
    calories: Math.round(item.calories * safeMult),
    protein: Math.round(item.protein * safeMult * 10) / 10,
    carbs: Math.round(item.carbs * safeMult * 10) / 10,
    fat: Math.round(item.fat * safeMult * 10) / 10,
  }));
}

export function calculateDailyTotals(meals: MealEntry[], dateKey: string): NutritionTotals {
  const dayMeals = meals.filter((m) => m.dateKey === dateKey);
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const meal of dayMeals) {
    calories += meal.totals.calories;
    protein += meal.totals.protein;
    carbs += meal.totals.carbs;
    fat += meal.totals.fat;
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };
}

export interface GoalProgress {
  caloriePercent: number;
  remainingCalories: number;
  isOverLimit: boolean;
  status: 'under' | 'on_track' | 'over';
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
}

export function calculateDailyGoalProgress(
  consumed: NutritionTotals,
  goals: DailyGoals
): GoalProgress {
  const targetKcal = Math.max(1, goals.calories);
  const rawPct = Math.round((consumed.calories / targetKcal) * 100);
  const remainingCalories = goals.calories - consumed.calories;
  const isOverLimit = consumed.calories > goals.calories;

  let status: GoalProgress['status'] = 'under';
  if (isOverLimit) {
    status = 'over';
  } else if (rawPct >= 80) {
    status = 'on_track';
  }

  return {
    caloriePercent: Math.min(100, Math.max(0, rawPct)),
    remainingCalories,
    isOverLimit,
    status,
    proteinPercent: Math.min(100, Math.round((consumed.protein / Math.max(1, goals.protein)) * 100)),
    carbsPercent: Math.min(100, Math.round((consumed.carbs / Math.max(1, goals.carbs)) * 100)),
    fatPercent: Math.min(100, Math.round((consumed.fat / Math.max(1, goals.fat)) * 100)),
  };
}

export interface DaySummaryPoint {
  dateKey: string;
  shortDay: string;
  dayNumber: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount: number;
}

const RO_WEEKDAYS = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

export function buildDailySeries(
  meals: MealEntry[],
  endDateKey: string,
  days = 7
): DaySummaryPoint[] {
  const keys = getLastNDaysKeys(endDateKey, days);
  return keys.map((key) => {
    const date = parseDateKey(key);
    const dayMeals = meals.filter((m) => m.dateKey === key);
    const totals = calculateDailyTotals(dayMeals, key);
    return {
      dateKey: key,
      shortDay: RO_WEEKDAYS[date.getDay()] ?? '',
      dayNumber: String(date.getDate()),
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      mealCount: dayMeals.length,
    };
  });
}

export function filterMeals(
  meals: MealEntry[],
  query: string,
  category: MealCategory | 'toate'
): MealEntry[] {
  const normalized = query.trim().toLowerCase();
  return meals.filter((meal) => {
    if (category !== 'toate' && meal.category !== category) {
      return false;
    }
    if (!normalized) return true;
    if (meal.title.toLowerCase().includes(normalized)) return true;
    return meal.items.some((item) => item.name.toLowerCase().includes(normalized));
  });
}

export function calculateBmrTdee(params: {
  sex: 'm' | 'f';
  age: number;
  weightKg: number;
  heightCm: number;
  activity: 'sedentar' | 'usor' | 'moderat' | 'activ';
  goal: 'slabire' | 'mentinere' | 'masa';
}): DailyGoals {
  const age = Math.min(100, Math.max(14, params.age));
  const weight = Math.min(300, Math.max(35, params.weightKg));
  const height = Math.min(240, Math.max(120, params.heightCm));

  const bmr =
    10 * weight + 6.25 * height - 5 * age + (params.sex === 'm' ? 5 : -161);

  const activityMultiplier = {
    sedentar: 1.2,
    usor: 1.375,
    moderat: 1.55,
    activ: 1.725,
  }[params.activity];

  const tdee = bmr * activityMultiplier;
  const goalOffset = {
    slabire: -400,
    mentinere: 0,
    masa: 300,
  }[params.goal];

  const calories = Math.max(1200, Math.round((tdee + goalOffset) / 10) * 10);
  const protein = Math.round(weight * (params.goal === 'slabire' ? 1.8 : 1.6));
  const fat = Math.round((calories * 0.28) / 9);
  const carbs = Math.max(60, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { calories, protein, carbs, fat };
}

export function validateBackupPayload(raw: unknown): BackupPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.meals) || !obj.goals || typeof obj.goals !== 'object') {
    return null;
  }
  const g = obj.goals as Record<string, unknown>;
  const calories = Number(g.calories);
  const protein = Number(g.protein);
  const carbs = Number(g.carbs);
  const fat = Number(g.fat);
  if (
    !Number.isFinite(calories) ||
    calories < 500 ||
    !Number.isFinite(protein) ||
    !Number.isFinite(carbs) ||
    !Number.isFinite(fat)
  ) {
    return null;
  }

  const validCategories = new Set(['mic_dejun', 'pranz', 'cina', 'gustare']);
  const validMeals: MealEntry[] = [];

  for (const m of obj.meals) {
    if (!m || typeof m !== 'object') continue;
    const meal = m as Record<string, unknown>;
    if (
      typeof meal.id !== 'string' ||
      typeof meal.dateKey !== 'string' ||
      typeof meal.title !== 'string' ||
      !Array.isArray(meal.items)
    ) {
      continue;
    }
    const items: FoodItem[] = meal.items
      .filter((i): i is Record<string, unknown> => Boolean(i && typeof i === 'object'))
      .map((i, idx) => ({
        id: typeof i.id === 'string' ? i.id : `imp-${idx}`,
        name: typeof i.name === 'string' ? i.name : 'Aliment',
        grams: Math.max(1, Number(i.grams) || 100),
        calories: Math.max(0, Number(i.calories) || 0),
        protein: Math.max(0, Number(i.protein) || 0),
        carbs: Math.max(0, Number(i.carbs) || 0),
        fat: Math.max(0, Number(i.fat) || 0),
      }));

    const category: MealCategory = validCategories.has(String(meal.category))
      ? (meal.category as MealCategory)
      : 'pranz';

    validMeals.push({
      id: meal.id,
      dateKey: meal.dateKey,
      createdAt: typeof meal.createdAt === 'string' ? meal.createdAt : new Date().toISOString(),
      timeLabel: typeof meal.timeLabel === 'string' ? meal.timeLabel : '12:00',
      title: meal.title,
      category,
      imageUrl: typeof meal.imageUrl === 'string' ? meal.imageUrl : undefined,
      note: typeof meal.note === 'string' ? meal.note : undefined,
      confidenceNote:
        typeof meal.confidenceNote === 'string' ? meal.confidenceNote : undefined,
      items,
      totals: calculateMealTotals(items),
    });
  }

  return {
    version: Number(obj.version) || 1,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    goals: {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
    },
    meals: validMeals,
  };
}
