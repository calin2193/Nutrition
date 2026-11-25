export type MealCategory = 'mic_dejun' | 'pranz' | 'cina' | 'gustare';

export interface FoodItem {
  id: string;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealEntry {
  id: string;
  dateKey: string; // YYYY-MM-DD in local time
  createdAt: string; // ISO timestamp
  timeLabel: string; // HH:mm
  title: string;
  category: MealCategory;
  imageUrl?: string; // Compressed data URL or local asset URL
  note?: string;
  confidenceNote?: string;
  items: FoodItem[];
  totals: NutritionTotals;
}

export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AnalyzedMealDraft {
  mealTitle: string;
  suggestedCategory: MealCategory;
  confidenceNote: string;
  items: FoodItem[];
  imageUrl?: string;
  note?: string;
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  goals: DailyGoals;
  meals: MealEntry[];
}

export const MEAL_CATEGORY_LABELS: Record<MealCategory, string> = {
  mic_dejun: 'Mic dejun',
  pranz: 'Prânz',
  cina: 'Cină',
  gustare: 'Gustare',
};

export const DEFAULT_DAILY_GOALS: DailyGoals = {
  calories: 2100,
  protein: 140,
  carbs: 220,
  fat: 70,
};
