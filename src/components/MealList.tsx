import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Trash2, Utensils } from 'lucide-react';
import { MEAL_CATEGORY_LABELS, type MealEntry } from '../types/nutrition';

interface MealListProps {
  meals: MealEntry[];
  dateLabel: string;
  onEditMeal: (meal: MealEntry) => void;
  onDeleteMeal: (mealId: string) => void;
  onPromptUpload: () => void;
}

export function MealList({
  meals,
  dateLabel,
  onEditMeal,
  onDeleteMeal,
  onPromptUpload,
}: MealListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  return (
    <section aria-label="Mese înregistrate" className="bg-white border border-[#E6E6E1] rounded-2xl p-6">
      <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-[#E6E6E1]">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#141714]">
            Mese salvate · {dateLabel}
          </h2>
          <p className="text-xs text-[#5A605A] mt-0.5 font-mono tabular-nums">
            {meals.length} {meals.length === 1 ? 'masă înregistrată' : 'mese înregistrate'}
          </p>
        </div>
      </div>

      {meals.length === 0 ? (
        <div className="py-10 text-center">
          <div className="w-11 h-11 rounded-full bg-[#F7F7F5] border border-[#E6E6E1] mx-auto flex items-center justify-center text-[#5A605A]">
            <Utensils className="w-5 h-5" aria-hidden="true" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-[#141714]">
            Nicio masă salvată pentru această zi
          </h3>
          <p className="mt-1 text-xs text-[#5A605A] max-w-sm mx-auto">
            Încarcă o poză cu ce ai mâncat pentru calcul automat al caloriilor sau adaugă o masă manual.
          </p>
          <button
            type="button"
            onClick={onPromptUpload}
            className="mt-4 inline-flex items-center px-4 py-2 min-h-[40px] text-xs font-medium text-white bg-[#166534] hover:bg-[#14532D] rounded-lg transition-colors"
          >
            Adaugă prima masă
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-[#E6E6E1]">
          {meals.map((meal) => {
            const isExpanded = expandedId === meal.id;
            const showFallback = !meal.imageUrl || failedImages[meal.id];

            return (
              <li key={meal.id} className="py-4 first:pt-4 last:pb-1">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#F7F7F5] border border-[#E6E6E1] shrink-0 flex items-center justify-center">
                    {!showFallback ? (
                      <img
                        src={meal.imageUrl}
                        alt={meal.title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [meal.id]: true }))
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Utensils className="w-5 h-5 text-[#8E938D]" aria-hidden="true" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold text-[#141714] truncate">
                          {meal.title}
                        </h3>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#5A605A]">
                          <span>{MEAL_CATEGORY_LABELS[meal.category]}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{meal.timeLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {meal.items.length} {meal.items.length === 1 ? 'ingredient' : 'ingrediente'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono tabular-nums text-base font-bold text-[#141714]">
                          {meal.totals.calories} <span className="text-xs font-normal text-[#5A605A]">kcal</span>
                        </div>
                        <div className="font-mono tabular-nums text-[11px] text-[#5A605A]">
                          P {meal.totals.protein}g · C {meal.totals.carbs}g · G {meal.totals.fat}g
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : meal.id)}
                        aria-expanded={isExpanded}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#5A605A] hover:text-[#141714] py-1 min-h-[34px]"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Ascunde ingredientele</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Vezi ingredientele</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditMeal(meal)}
                          aria-label={`Editează '${meal.title}'`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-medium text-[#5A605A] hover:text-[#141714] hover:bg-[#F7F7F5] rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                          <span className="hidden sm:inline">Editează</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteMeal(meal.id)}
                          aria-label={`Șterge '${meal.title}'`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-medium text-[#5A605A] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span className="hidden sm:inline">Șterge</span>
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 pt-2.5 border-t border-[#EFEFE9] space-y-1.5">
                        {meal.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 text-xs text-[#5A605A]"
                          >
                            <span className="text-[#141714] truncate">
                              {item.name} · <span className="font-mono tabular-nums text-[#5A605A]">{item.grams}g</span>
                            </span>
                            <span className="font-mono tabular-nums shrink-0">
                              {item.calories} kcal (P {item.protein}g · C {item.carbs}g · G {item.fat}g)
                            </span>
                          </div>
                        ))}
                        {meal.confidenceNote && (
                          <p className="text-[11px] text-[#8E938D] pt-1">
                            {meal.confidenceNote}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
