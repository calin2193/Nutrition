import {
  DEFAULT_DAILY_GOALS,
  type DailyGoals,
  type MealEntry,
} from '../types/nutrition';
import { calculateMealTotals, formatDateKey, shiftDateKey } from './nutrition';

const DB_NAME = 'nutrifoto_storage_v1';
const DB_VERSION = 1;
const STORE_MEALS = 'meals';
const STORE_SETTINGS = 'settings';
const LS_MEALS_KEY = 'nutrifoto_meals_fallback_v1';
const LS_GOALS_KEY = 'nutrifoto_goals_v1';
const LS_SEEDED_KEY = 'nutrifoto_seeded_v1';

function buildInitialSeedMeals(): MealEntry[] {
  const today = formatDateKey(new Date());
  const yesterday = shiftDateKey(today, -1);
  const twoDaysAgo = shiftDateKey(today, -2);

  const breakfastItems = [
    { id: 's-1', name: 'Iaurt grecesc 2%', grams: 200, calories: 146, protein: 20, carbs: 8, fat: 4 },
    { id: 's-2', name: 'Granola crocantă cu migdale', grams: 45, calories: 202, protein: 5, carbs: 28, fat: 7.5 },
    { id: 's-3', name: 'Afine, zmeură și banană', grams: 120, calories: 82, protein: 1.2, carbs: 19, fat: 0.4 },
    { id: 's-4', name: 'Semințe de chia', grams: 10, calories: 49, protein: 1.7, carbs: 4.2, fat: 3.1 },
  ];

  const salmonItems = [
    { id: 's-5', name: 'File de somon la grătar', grams: 160, calories: 332, protein: 34, carbs: 0, fat: 21 },
    { id: 's-6', name: 'Orez brun fiert', grams: 150, calories: 175, protein: 4, carbs: 36, fat: 1.4 },
    { id: 's-7', name: 'Avocado și edamame', grams: 110, calories: 158, protein: 7.5, carbs: 9, fat: 10.5 },
  ];

  const pastaItems = [
    { id: 's-8', name: 'Paste penne fierte', grams: 220, calories: 330, protein: 11.5, carbs: 66, fat: 2 },
    { id: 's-9', name: 'Sos pesto și parmezan', grams: 45, calories: 205, protein: 6.5, carbs: 3, fat: 19 },
    { id: 's-10', name: 'Roșii cherry și muguri de pin', grams: 80, calories: 75, protein: 2.4, carbs: 4.5, fat: 5.5 },
  ];

  return [
    {
      id: 'seed-today-breakfast',
      dateKey: today,
      createdAt: `${today}T08:25:00`,
      timeLabel: '08:25',
      title: 'Iaurt grecesc cu fructe de pădure și granola',
      category: 'mic_dejun',
      imageUrl: '/src/assets/images/sample_breakfast_oats_1795637865181.jpg',
      confidenceNote: 'Exemplu inițial salvat · Poți edita sau șterge oricând',
      items: breakfastItems,
      totals: calculateMealTotals(breakfastItems),
    },
    {
      id: 'seed-yesterday-lunch',
      dateKey: yesterday,
      createdAt: `${yesterday}T13:15:00`,
      timeLabel: '13:15',
      title: 'Bol cu somon la grătar, avocado și orez brun',
      category: 'pranz',
      imageUrl: '/src/assets/images/sample_salmon_bowl_1795637864934.jpg',
      confidenceNote: 'Exemplu din istoricul recent',
      items: salmonItems,
      totals: calculateMealTotals(salmonItems),
    },
    {
      id: 'seed-twodays-dinner',
      dateKey: twoDaysAgo,
      createdAt: `${twoDaysAgo}T19:40:00`,
      timeLabel: '19:40',
      title: 'Penne pesto cu roșii cherry coapte',
      category: 'cina',
      imageUrl: '/src/assets/images/sample_pasta_pesto_1795637865453.jpg',
      confidenceNote: 'Exemplu din istoricul recent',
      items: pastaItems,
      totals: calculateMealTotals(pastaItems),
    },
  ];
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_MEALS)) {
          db.createObjectStore(STORE_MEALS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readLocalMealsFallback(): MealEntry[] {
  try {
    const raw = window.localStorage.getItem(LS_MEALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MealEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocalMealsFallback(meals: MealEntry[]): void {
  try {
    // Store without huge base64 thumbnails if quota is tight
    window.localStorage.setItem(LS_MEALS_KEY, JSON.stringify(meals));
  } catch {
    try {
      const stripped = meals.map((m) => ({
        ...m,
        imageUrl: m.imageUrl?.startsWith('data:') ? undefined : m.imageUrl,
      }));
      window.localStorage.setItem(LS_MEALS_KEY, JSON.stringify(stripped));
    } catch {
      // ignore if storage completely disabled
    }
  }
}

export async function loadPersistedData(): Promise<{
  meals: MealEntry[];
  goals: DailyGoals;
}> {
  let goals = DEFAULT_DAILY_GOALS;
  try {
    const rawGoals = window.localStorage.getItem(LS_GOALS_KEY);
    if (rawGoals) {
      const parsed = JSON.parse(rawGoals) as Partial<DailyGoals>;
      if (parsed && typeof parsed.calories === 'number') {
        goals = {
          calories: parsed.calories,
          protein: Number(parsed.protein) || DEFAULT_DAILY_GOALS.protein,
          carbs: Number(parsed.carbs) || DEFAULT_DAILY_GOALS.carbs,
          fat: Number(parsed.fat) || DEFAULT_DAILY_GOALS.fat,
        };
      }
    }
  } catch {
    // keep default
  }

  const db = await openDatabase();
  let meals: MealEntry[] = [];

  if (db) {
    meals = await new Promise<MealEntry[]>((resolve) => {
      try {
        const tx = db.transaction(STORE_MEALS, 'readonly');
        const req = tx.objectStore(STORE_MEALS).getAll();
        req.onsuccess = () => resolve((req.result as MealEntry[]) ?? []);
        req.onerror = () => resolve(readLocalMealsFallback());
      } catch {
        resolve(readLocalMealsFallback());
      }
    });
  } else {
    meals = readLocalMealsFallback();
  }

  const alreadySeeded = window.localStorage.getItem(LS_SEEDED_KEY) === '1';
  if (meals.length === 0 && !alreadySeeded) {
    const seeded = buildInitialSeedMeals();
    window.localStorage.setItem(LS_SEEDED_KEY, '1');
    await saveAllMeals(seeded);
    meals = seeded;
  } else if (!alreadySeeded) {
    window.localStorage.setItem(LS_SEEDED_KEY, '1');
  }

  meals.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { meals, goals };
}

export async function saveAllMeals(meals: MealEntry[]): Promise<void> {
  window.localStorage.setItem(LS_SEEDED_KEY, '1');
  writeLocalMealsFallback(meals);

  const db = await openDatabase();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_MEALS, 'readwrite');
      const store = tx.objectStore(STORE_MEALS);
      store.clear();
      for (const meal of meals) {
        store.put(meal);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function saveDailyGoals(goals: DailyGoals): void {
  try {
    window.localStorage.setItem(LS_GOALS_KEY, JSON.stringify(goals));
  } catch {
    // ignore
  }
}

export async function clearAllUserData(): Promise<void> {
  window.localStorage.setItem(LS_SEEDED_KEY, '1');
  window.localStorage.removeItem(LS_MEALS_KEY);
  const db = await openDatabase();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_MEALS, 'readwrite');
      tx.objectStore(STORE_MEALS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
