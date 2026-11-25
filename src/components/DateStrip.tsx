import { useEffect, useRef } from 'react';
import type { MealEntry } from '../types/nutrition';
import { buildDailySeries, formatDateKey } from '../utils/nutrition';

interface DateStripProps {
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  meals: MealEntry[];
}

export function DateStrip({ selectedDateKey, onSelectDate, meals }: DateStripProps) {
  const todayKey = formatDateKey(new Date());
  const days = buildDailySeries(meals, todayKey, 7);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeBtnRef.current?.scrollIntoView({
      behavior: 'auto',
      inline: 'end',
      block: 'nearest',
    });
  }, [selectedDateKey]);

  return (
    <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1" role="group" aria-label="Selectare zi">
      <div className="flex items-center gap-1.5 sm:gap-2">
        {days.map((day) => {
          const isSelected = day.dateKey === selectedDateKey;
          const isToday = day.dateKey === todayKey;
          return (
            <button
              key={day.dateKey}
              ref={isSelected ? activeBtnRef : undefined}
              type="button"
              onClick={() => onSelectDate(day.dateKey)}
              aria-pressed={isSelected}
              className={`min-w-[54px] min-h-[48px] px-3 py-1.5 rounded-xl border text-center transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#166534] ${
                isSelected
                  ? 'bg-[#141714] border-[#141714] text-white'
                  : 'bg-white border-[#E6E6E1] text-[#141714] hover:border-[#B8BCB4]'
              }`}
            >
              <div
                className={`text-[11px] font-medium ${
                  isSelected ? 'text-white/75' : 'text-[#5A605A]'
                }`}
              >
                {isToday ? 'Azi' : day.shortDay}
              </div>
              <div className="font-mono tabular-nums text-sm font-semibold leading-tight mt-0.5">
                {day.dayNumber}
              </div>
            </button>
          );
        })}
      </div>

      <label className="hidden sm:flex items-center gap-2 text-xs text-[#5A605A] shrink-0">
        <span>Altă dată</span>
        <input
          type="date"
          value={selectedDateKey}
          max={todayKey}
          onChange={(e) => {
            if (e.target.value) onSelectDate(e.target.value);
          }}
          className="px-2.5 py-1.5 min-h-[38px] text-xs font-mono tabular-nums text-[#141714] bg-white border border-[#E6E6E1] rounded-lg focus:outline-none focus:border-[#166534]"
        />
      </label>
    </div>
  );
}
