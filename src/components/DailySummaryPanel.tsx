import type { DailyGoals, MealEntry, NutritionTotals } from '../types/nutrition';
import {
  buildDailySeries,
  calculateDailyGoalProgress,
  formatDateKey,
} from '../utils/nutrition';

interface DailySummaryPanelProps {
  selectedDateKey: string;
  consumed: NutritionTotals;
  goals: DailyGoals;
  meals: MealEntry[];
  onOpenGoals: () => void;
}

export function DailySummaryPanel({
  selectedDateKey,
  consumed,
  goals,
  meals,
  onOpenGoals,
}: DailySummaryPanelProps) {
  const progress = calculateDailyGoalProgress(consumed, goals);
  const todayKey = formatDateKey(new Date());
  const weekly = buildDailySeries(meals, todayKey, 7);
  const maxWeeklyKcal = Math.max(goals.calories, ...weekly.map((d) => d.calories), 1);

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress.caloriePercent / 100) * circumference;

  const ringColor = progress.isOverLimit
    ? '#DC2626'
    : progress.status === 'on_track'
      ? '#15803D'
      : '#166534';

  const statusText = progress.isOverLimit
    ? `Depășit cu ${Math.abs(progress.remainingCalories)} kcal`
    : `${progress.remainingCalories} kcal rămase`;

  return (
    <aside className="space-y-6" aria-label="Rezumat nutrițional zilnic">
      <section className="bg-white border border-[#E6E6E1] rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#141714]">
              Bilanț zilnic
            </h2>
            <p className="text-xs text-[#5A605A] mt-0.5 font-mono tabular-nums">
              {selectedDateKey === todayKey ? 'Astăzi' : selectedDateKey} · Țintă {goals.calories} kcal
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenGoals}
            className="text-xs font-medium text-[#166534] hover:underline whitespace-nowrap shrink-0 py-1 px-1"
          >
            Modifică ținta
          </button>
        </div>

        <div className="mt-6 flex items-center gap-6">
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140" aria-hidden="true">
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#EFEFE9"
                strokeWidth="10"
              />
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={ringColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-[stroke-dashoffset] duration-300 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono tabular-nums text-2xl font-semibold text-[#141714]">
                {consumed.calories}
              </span>
              <span className="text-[11px] text-[#5A605A]">kcal consumate</span>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <div className="text-xs text-[#5A605A]">Status obiectiv</div>
              <div
                className={`font-mono tabular-nums text-base font-semibold mt-0.5 ${
                  progress.isOverLimit ? 'text-[#DC2626]' : 'text-[#141714]'
                }`}
              >
                {statusText}
              </div>
            </div>
            <div className="pt-2 border-t border-[#E6E6E1] flex items-center justify-between text-xs text-[#5A605A]">
              <span>Procent atins</span>
              <span className="font-mono tabular-nums font-medium text-[#141714]">
                {Math.round((consumed.calories / Math.max(1, goals.calories)) * 100)}%
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[#E6E6E1] space-y-4">
          <MacroBar
            label="Proteine"
            value={consumed.protein}
            target={goals.protein}
            percent={progress.proteinPercent}
            barColor="bg-[#166534]"
          />
          <MacroBar
            label="Carbohidrați"
            value={consumed.carbs}
            target={goals.carbs}
            percent={progress.carbsPercent}
            barColor="bg-[#B45309]"
          />
          <MacroBar
            label="Grăsimi"
            value={consumed.fat}
            target={goals.fat}
            percent={progress.fatPercent}
            barColor="bg-[#3F6212]"
          />
        </div>
      </section>

      <section className="bg-white border border-[#E6E6E1] rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-display text-base font-semibold text-[#141714]">
            Ultimele 7 zile
          </h3>
          <span className="text-xs font-mono tabular-nums text-[#5A605A]">
            Țintă {goals.calories} kcal
          </span>
        </div>

        <div className="mt-5 h-36 flex items-end justify-between gap-2 pt-5 relative">
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 border-t border-dashed border-[#B8BCB4]"
            style={{ bottom: `${Math.min(100, (goals.calories / maxWeeklyKcal) * 100)}%` }}
          />
          {weekly.map((day) => {
            const heightPct = day.calories > 0 ? Math.max(10, Math.round((day.calories / maxWeeklyKcal) * 100)) : 3;
            const isSelected = day.dateKey === selectedDateKey;
            const isOver = day.calories > goals.calories;
            return (
              <div key={day.dateKey} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full flex-1 flex flex-col items-center justify-end gap-1">
                  {day.calories > 0 && (
                    <span className="text-[10px] font-mono tabular-nums text-[#5A605A]">
                      {day.calories}
                    </span>
                  )}
                  <div
                    title={`${day.shortDay} ${day.dayNumber}: ${day.calories} kcal`}
                    className={`w-full max-w-[26px] rounded-t-md transition-all ${
                      day.calories === 0
                        ? 'bg-[#EFEFE9]'
                        : isOver
                          ? 'bg-[#DC2626]'
                          : isSelected
                            ? 'bg-[#166534]'
                            : 'bg-[#86A789]'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span
                  className={`text-[11px] font-mono tabular-nums ${
                    isSelected ? 'font-semibold text-[#141714]' : 'text-[#5A605A]'
                  }`}
                >
                  {day.shortDay.slice(0, 2)}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}

interface MacroBarProps {
  label: string;
  value: number;
  target: number;
  percent: number;
  barColor: string;
}

function MacroBar({ label, value, target, percent, barColor }: MacroBarProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs mb-1.5">
        <span className="font-medium text-[#141714]">{label}</span>
        <span className="font-mono tabular-nums text-[#5A605A]">
          <strong className="font-semibold text-[#141714]">{value}g</strong> / {target}g
        </span>
      </div>
      <div className="h-2 w-full bg-[#EFEFE9] rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-[width] duration-300 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
