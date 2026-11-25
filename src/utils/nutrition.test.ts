import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMultiplierToItems,
  buildDailySeries,
  calculateBmrTdee,
  calculateDailyGoalProgress,
  calculateDailyTotals,
  calculateMealTotals,
  filterMeals,
  scaleFoodItem,
  validateBackupPayload,
} from './nutrition';
import type { FoodItem, MealEntry } from '../types/nutrition';

const sampleItems: FoodItem[] = [
  { id: '1', name: 'Somon la grătar', grams: 160, calories: 330, protein: 35, carbs: 0, fat: 20 },
  { id: '2', name: 'Orez brun fiert', grams: 150, calories: 170, protein: 4, carbs: 35, fat: 1.5 },
];

test('calculateMealTotals sums items and applies portion multiplier', () => {
  const single = calculateMealTotals(sampleItems);
  assert.deepEqual(single, { calories: 500, protein: 39, carbs: 35, fat: 21.5 });

  const half = calculateMealTotals(sampleItems, 0.5);
  assert.deepEqual(half, { calories: 250, protein: 19.5, carbs: 17.5, fat: 10.8 });
});

test('scaleFoodItem scales calories and macros proportionally by grams', () => {
  const scaled = scaleFoodItem(sampleItems[0], 80);
  assert.equal(scaled.grams, 80);
  assert.equal(scaled.calories, 165);
  assert.equal(scaled.protein, 17.5);
  assert.equal(scaled.fat, 10);
});

test('applyMultiplierToItems scales all items cleanly', () => {
  const doubled = applyMultiplierToItems(sampleItems, 1.5);
  assert.equal(doubled[0].grams, 240);
  assert.equal(doubled[0].calories, 495);
});

test('calculateDailyTotals and calculateDailyGoalProgress compute remaining and status', () => {
  const meals: MealEntry[] = [
    {
      id: 'm1',
      dateKey: '2026-11-25',
      createdAt: '2026-11-25T08:30:00Z',
      timeLabel: '08:30',
      title: 'Mic dejun',
      category: 'mic_dejun',
      items: sampleItems,
      totals: calculateMealTotals(sampleItems),
    },
    {
      id: 'm2',
      dateKey: '2026-11-24',
      createdAt: '2026-11-24T13:00:00Z',
      timeLabel: '13:00',
      title: 'Prânz ieri',
      category: 'pranz',
      items: sampleItems,
      totals: calculateMealTotals(sampleItems),
    },
  ];

  const today = calculateDailyTotals(meals, '2026-11-25');
  assert.equal(today.calories, 500);

  const progress = calculateDailyGoalProgress(today, {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 70,
  });
  assert.equal(progress.caloriePercent, 25);
  assert.equal(progress.remainingCalories, 1500);
  assert.equal(progress.isOverLimit, false);
  assert.equal(progress.status, 'under');

  const overProgress = calculateDailyGoalProgress(
    { calories: 2300, protein: 150, carbs: 250, fat: 80 },
    { calories: 2000, protein: 150, carbs: 200, fat: 70 }
  );
  assert.equal(overProgress.isOverLimit, true);
  assert.equal(overProgress.status, 'over');
  assert.equal(overProgress.remainingCalories, -300);
});

test('buildDailySeries returns ordered points for requested window', () => {
  const meals: MealEntry[] = [
    {
      id: 'm1',
      dateKey: '2026-11-25',
      createdAt: '2026-11-25T12:00:00Z',
      timeLabel: '12:00',
      title: 'Bol somon',
      category: 'pranz',
      items: sampleItems,
      totals: { calories: 500, protein: 39, carbs: 35, fat: 21.5 },
    },
  ];
  const series = buildDailySeries(meals, '2026-11-25', 7);
  assert.equal(series.length, 7);
  assert.equal(series[0].dateKey, '2026-11-19');
  assert.equal(series[6].dateKey, '2026-11-25');
  assert.equal(series[6].calories, 500);
  assert.equal(series[5].calories, 0);
});

test('filterMeals filters by category and food item query', () => {
  const meals: MealEntry[] = [
    {
      id: 'm1',
      dateKey: '2026-11-25',
      createdAt: '2026-11-25T08:00:00Z',
      timeLabel: '08:00',
      title: 'Iaurt cu fructe',
      category: 'mic_dejun',
      items: [{ id: 'a', name: 'Iaurt grecesc', grams: 200, calories: 180, protein: 18, carbs: 8, fat: 8 }],
      totals: { calories: 180, protein: 18, carbs: 8, fat: 8 },
    },
    {
      id: 'm2',
      dateKey: '2026-11-25',
      createdAt: '2026-11-25T13:00:00Z',
      timeLabel: '13:00',
      title: 'Bol cu somon',
      category: 'pranz',
      items: sampleItems,
      totals: { calories: 500, protein: 39, carbs: 35, fat: 21.5 },
    },
  ];

  assert.equal(filterMeals(meals, 'orez', 'toate').length, 1);
  assert.equal(filterMeals(meals, '', 'mic_dejun').length, 1);
  assert.equal(filterMeals(meals, 'orez', 'mic_dejun').length, 0);
});

test('calculateBmrTdee produces balanced goals and validateBackupPayload guards invalid JSON', () => {
  const goals = calculateBmrTdee({
    sex: 'm',
    age: 27,
    weightKg: 78,
    heightCm: 180,
    activity: 'moderat',
    goal: 'mentinere',
  });
  assert.ok(goals.calories >= 2400 && goals.calories <= 2900);
  assert.ok(goals.protein >= 100);

  assert.equal(validateBackupPayload({ bad: true }), null);
  const valid = validateBackupPayload({
    version: 1,
    exportedAt: '2026-11-25T10:00:00Z',
    goals,
    meals: [
      {
        id: 'm1',
        dateKey: '2026-11-25',
        title: 'Somon',
        category: 'pranz',
        items: sampleItems,
      },
    ],
  });
  assert.ok(valid);
  assert.equal(valid?.meals[0].totals.calories, 500);
});
