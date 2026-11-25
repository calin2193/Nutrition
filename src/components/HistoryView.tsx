import { useMemo, useState } from 'react';
import { Search, Trash2, Utensils } from 'lucide-react';
import {
  MEAL_CATEGORY_LABELS,
  type DailyGoals,
  type MealCategory,
  type MealEntry,
} from '../types/nutrition';
import { buildDailySeries, filterMeals, formatDateKey } from '../utils/nutrition';

interface HistoryViewProps {
  meals: MealEntry[];
  goals: DailyGoals;
  onSelectDateInJournal: (dateKey: string) => void;
  onDeleteMeal: (mealId: string) => void;
}

export function HistoryView({
  meals,
  goals,
  onSelectDateInJournal,
  onDeleteMeal,
}: HistoryViewProps) {
  const [windowDays, setWindowDays] = useState<7 | 14 | 30>(14);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MealCategory | 'toate'>('toate');

  const todayKey = formatDateKey(new Date());
  const series = useMemo(
    () => buildDailySeries(meals, todayKey, windowDays),
    [meals, todayKey, windowDays]
  );

  const activeDays = series.filter((d) => d.mealCount > 0);
  const avgCalories =
    activeDays.length > 0
      ? Math.round(activeDays.reduce((acc, d) => acc + d.calories, 0) / activeDays.length)
      : 0;
  const avgProtein =
    activeDays.length > 0
      ? Math.round((activeDays.reduce((acc, d) => acc + d.protein, 0) / activeDays.length) * 10) / 10
      : 0;
  const daysOnTarget = activeDays.filter(
    (d) => d.calories <= goals.calories
  ).length;

  const maxKcal = Math.max(goals.calories, ...series.map((d) => d.calories), 1);

  const filteredMeals = useMemo(
    () => filterMeals(meals, searchQuery, categoryFilter),
    [meals, searchQuery, categoryFilter]
  );

  return (
    <div className="space-y-6">
      <section className="bg-white border border-[#E6E6E1] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#141714] tracking-tight">
              Istoric și statistici
            </h1>
            <p className="text-sm text-[#5A605A] mt-0.5">
              Evoluția caloriilor și toate mesele salvate în dispozitivul tău.
            </p>
          </div>

          <div
            className="inline-flex items-center gap-1 p-1 bg-[#F7F7F5] border border-[#E6E6E1] rounded-xl self-start"
            role="group"
            aria-label="Interval analiză"
          >
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setWindowDays(days)}
                aria-pressed={windowDays === days}
                className={`px-3 py-1.5 min-h-[36px] text-xs font-mono tabular-nums font-medium rounded-lg transition-colors whitespace-nowrap ${
                  windowDays === days
                    ? 'bg-white text-[#141714] shadow-xs border border-[#E6E6E1]'
                    : 'text-[#5A605A] hover:text-[#141714]'
                }`}
              >
                {days} zile
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 pb-6 border-b border-[#E6E6E1]">
          <div>
            <div className="text-xs text-[#5A605A]">Medie zilnică</div>
            <div className="font-mono tabular-nums text-xl sm:text-2xl font-bold text-[#141714] mt-1">
              {avgCalories} <span className="text-xs font-normal text-[#5A605A]">kcal</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[#5A605A]">Medie proteine</div>
            <div className="font-mono tabular-nums text-xl sm:text-2xl font-bold text-[#141714] mt-1">
              {avgProtein} <span className="text-xs font-normal text-[#5A605A]">g / zi</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[#5A605A]">Zile în limită</div>
            <div className="font-mono tabular-nums text-xl sm:text-2xl font-bold text-[#166534] mt-1">
              {daysOnTarget} <span className="text-xs font-normal text-[#5A605A]">/ {activeDays.length} zile</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[#5A605A]">Total mese salvate</div>
            <div className="font-mono tabular-nums text-xl sm:text-2xl font-bold text-[#141714] mt-1">
              {meals.length}
            </div>
          </div>
        </div>

        <div className="mt-6 h-44 flex items-end gap-1.5 sm:gap-2 relative pt-4">
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 border-t border-dashed border-[#B8BCB4]"
            style={{ bottom: `${Math.min(100, (goals.calories / maxKcal) * 100)}%` }}
          />
          {series.map((day) => {
            const heightPct =
              day.calories > 0
                ? Math.max(6, Math.round((day.calories / maxKcal) * 100))
                : 2;
            const isOver = day.calories > goals.calories;
            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => onSelectDateInJournal(day.dateKey)}
                title={`${day.dateKey}: ${day.calories} kcal (${day.mealCount} mese)`}
                className="flex-1 h-full flex flex-col items-center justify-end gap-1 group"
              >
                <div className="w-full flex-1 flex items-end justify-center">
                  <div
                    className={`w-full max-w-[28px] rounded-t-md transition-opacity group-hover:opacity-80 ${
                      day.calories === 0
                        ? 'bg-[#EFEFE9]'
                        : isOver
                          ? 'bg-[#DC2626]'
                          : 'bg-[#166534]'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                {windowDays <= 14 && (
                  <span className="text-[10px] font-mono tabular-nums text-[#5A605A]">
                    {day.dayNumber}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-white border border-[#E6E6E1] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6E6E1]">
          <h2 className="font-display text-lg font-semibold text-[#141714]">
            Arhivă mese ({filteredMeals.length})
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <Search
                className="w-4 h-4 text-[#5A605A] absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Caută în mesele salvate"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută aliment sau masă..."
                className="w-full sm:w-56 pl-9 pr-3 py-2 min-h-[40px] text-sm text-[#141714] bg-[#F7F7F5] border border-[#E6E6E1] rounded-lg focus:outline-none focus:bg-white focus:border-[#166534]"
              />
            </div>

            <select
              aria-label="Filtrează după momentul zilei"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as MealCategory | 'toate')}
              className="px-3 py-2 min-h-[40px] text-sm text-[#141714] bg-[#F7F7F5] border border-[#E6E6E1] rounded-lg focus:outline-none focus:border-[#166534]"
            >
              <option value="toate">Toate mesele</option>
              <option value="mic_dejun">Mic dejun</option>
              <option value="pranz">Prânz</option>
              <option value="cina">Cină</option>
              <option value="gustare">Gustare</option>
            </select>
          </div>
        </div>

        {filteredMeals.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#5A605A]">
            Nu există mese care să corespundă căutării.
          </div>
        ) : (
          <ul className="divide-y divide-[#E6E6E1]">
            {filteredMeals.map((meal) => (
              <li
                key={meal.id}
                className="py-3.5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#F7F7F5] border border-[#E6E6E1] shrink-0 flex items-center justify-center">
                    {meal.imageUrl ? (
                      <img
                        src={meal.imageUrl}
                        alt={meal.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Utensils className="w-4 h-4 text-[#8E938D]" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onSelectDateInJournal(meal.dateKey)}
                      className="text-sm font-semibold text-[#141714] hover:text-[#166534] text-left truncate block max-w-full"
                    >
                      {meal.title}
                    </button>
                    <div className="text-xs text-[#5A605A] font-mono tabular-nums mt-0.5">
                      {meal.dateKey} · {meal.timeLabel} · {MEAL_CATEGORY_LABELS[meal.category]}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-sm font-bold text-[#141714]">{meal.totals.calories} kcal</div>
                    <div className="text-[11px] text-[#5A605A]">
                      P {meal.totals.protein}g · C {meal.totals.carbs}g · G {meal.totals.fat}g
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteMeal(meal.id)}
                    aria-label={`Șterge '${meal.title}' din istoric`}
                    className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-[#5A605A] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
