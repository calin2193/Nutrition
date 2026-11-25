import { useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import {
  MEAL_CATEGORY_LABELS,
  type AnalyzedMealDraft,
  type FoodItem,
  type MealCategory,
  type MealEntry,
} from '../types/nutrition';
import {
  applyMultiplierToItems,
  calculateMealTotals,
  scaleFoodItem,
} from '../utils/nutrition';

interface MealReviewCardProps {
  draft: AnalyzedMealDraft;
  editingMeal?: MealEntry | null;
  onCancel: () => void;
  onSave: (data: {
    title: string;
    category: MealCategory;
    timeLabel: string;
    items: FoodItem[];
    imageUrl?: string;
    note?: string;
    confidenceNote?: string;
  }) => void;
}

const CATEGORIES: MealCategory[] = ['mic_dejun', 'pranz', 'cina', 'gustare'];
const MULTIPLIERS = [0.5, 0.75, 1, 1.25, 1.5];

function currentTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function MealReviewCard({
  draft,
  editingMeal,
  onCancel,
  onSave,
}: MealReviewCardProps) {
  const [title, setTitle] = useState(editingMeal?.title ?? draft.mealTitle);
  const [category, setCategory] = useState<MealCategory>(
    editingMeal?.category ?? draft.suggestedCategory
  );
  const [timeLabel, setTimeLabel] = useState(
    editingMeal?.timeLabel ?? currentTimeHHMM()
  );
  const [baseItems, setBaseItems] = useState<FoodItem[]>(
    editingMeal?.items ?? draft.items
  );
  const [multiplier, setMultiplier] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  const effectiveItems = applyMultiplierToItems(baseItems, multiplier);
  const totals = calculateMealTotals(effectiveItems);
  const imageUrl = editingMeal?.imageUrl ?? draft.imageUrl;

  const handleGramsChange = (index: number, rawGrams: string) => {
    const num = Number(rawGrams);
    if (!Number.isFinite(num) || num <= 0) return;
    setMultiplier(1);
    setBaseItems((prev) =>
      prev.map((item, idx) => (idx === index ? scaleFoodItem(item, num) : item))
    );
  };

  const handleItemFieldChange = (
    index: number,
    field: keyof Pick<FoodItem, 'name' | 'calories' | 'protein' | 'carbs' | 'fat'>,
    value: string
  ) => {
    setBaseItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        if (field === 'name') {
          return { ...item, name: value };
        }
        const num = Math.max(0, Number(value) || 0);
        return { ...item, [field]: num };
      })
    );
  };

  const handleAddItem = () => {
    setBaseItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}-${prev.length}`,
        name: '',
        grams: 100,
        calories: 120,
        protein: 5,
        carbs: 15,
        fat: 4,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setBaseItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanedItems = effectiveItems
      .map((item) => ({
        ...item,
        name: item.name.trim(),
      }))
      .filter((item) => item.name.length > 0);

    if (cleanedItems.length === 0) {
      setValidationError('Adaugă cel puțin un aliment cu denumire validă.');
      return;
    }

    const finalTitle = title.trim() || cleanedItems.map((i) => i.name).slice(0, 2).join(', ');
    if (!finalTitle) {
      setValidationError('Introdu un nume pentru această masă.');
      return;
    }

    onSave({
      title: finalTitle,
      category,
      timeLabel: timeLabel || currentTimeHHMM(),
      items: cleanedItems,
      imageUrl,
      note: editingMeal?.note ?? draft.note,
      confidenceNote: editingMeal?.confidenceNote ?? draft.confidenceNote,
    });
  };

  return (
    <section
      aria-label={editingMeal ? 'Editare masă salvată' : 'Verificare masă analizată'}
      className="bg-white border border-[#166534]/40 rounded-2xl p-6"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={title || 'Fotografie masă'}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-xl object-cover border border-[#E6E6E1] shrink-0"
              />
            )}
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-[#141714]">
                {editingMeal ? 'Editează masa' : 'Verifică și salvează masa'}
              </h2>
              {draft.confidenceNote && (
                <p className="text-xs text-[#5A605A] mt-0.5">{draft.confidenceNote}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Închide editorul mesei"
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-[#5A605A] hover:text-[#141714] rounded-lg hover:bg-[#F7F7F5]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-6">
            <label htmlFor="review-meal-title" className="block text-xs font-medium text-[#5A605A] mb-1">
              Denumirea mesei
            </label>
            <input
              id="review-meal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Somon la grătar cu orez brun"
              className="w-full px-3.5 py-2 min-h-[42px] text-sm text-[#141714] bg-white border border-[#E6E6E1] rounded-lg focus:outline-none focus:border-[#166534]"
            />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="review-meal-category" className="block text-xs font-medium text-[#5A605A] mb-1">
              Momentul zilei
            </label>
            <select
              id="review-meal-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as MealCategory)}
              className="w-full px-3 py-2 min-h-[42px] text-sm text-[#141714] bg-white border border-[#E6E6E1] rounded-lg focus:outline-none focus:border-[#166534]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {MEAL_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="review-meal-time" className="block text-xs font-medium text-[#5A605A] mb-1">
              Ora
            </label>
            <input
              id="review-meal-time"
              type="time"
              value={timeLabel}
              onChange={(e) => setTimeLabel(e.target.value)}
              className="w-full px-2.5 py-2 min-h-[42px] text-sm font-mono tabular-nums text-[#141714] bg-white border border-[#E6E6E1] rounded-lg focus:outline-none focus:border-[#166534]"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 py-3 px-4 bg-[#F7F7F5] rounded-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-[#5A605A]">Porție:</span>
            <div className="flex items-center gap-1" role="group" aria-label="Multiplicator porție">
              {MULTIPLIERS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMultiplier(m)}
                  aria-pressed={multiplier === m}
                  className={`px-2.5 py-1 min-h-[34px] text-xs font-mono tabular-nums rounded-md transition-colors ${
                    multiplier === m
                      ? 'bg-[#141714] text-white'
                      : 'bg-white text-[#141714] border border-[#E6E6E1] hover:bg-[#EFEFE9]'
                  }`}
                >
                  {m}×
                </button>
              ))}
            </div>
          </div>

          <div className="font-mono tabular-nums text-sm text-[#141714]">
            <strong className="text-base font-bold text-[#166534]">{totals.calories} kcal</strong>
            <span className="text-[#5A605A] text-xs ml-2">
              P {totals.protein}g · C {totals.carbs}g · G {totals.fat}g
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5A605A]">
              Ingrediente detectate ({effectiveItems.length})
            </span>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#166534] hover:underline py-1"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Adaugă ingredient</span>
            </button>
          </div>

          <div className="divide-y divide-[#E6E6E1] border border-[#E6E6E1] rounded-xl overflow-hidden">
            {effectiveItems.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 bg-white grid grid-cols-12 gap-2 items-center"
              >
                <div className="col-span-12 sm:col-span-5">
                  <label className="sr-only" htmlFor={`item-name-${idx}`}>
                    Nume aliment {idx + 1}
                  </label>
                  <input
                    id={`item-name-${idx}`}
                    type="text"
                    value={baseItems[idx]?.name ?? ''}
                    onChange={(e) => handleItemFieldChange(idx, 'name', e.target.value)}
                    placeholder="Denumire aliment"
                    className="w-full px-2.5 py-1.5 min-h-[38px] text-sm text-[#141714] bg-[#F7F7F5] border border-transparent focus:border-[#166534] focus:bg-white rounded-lg focus:outline-none"
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-[10px] text-[#5A605A] mb-0.5" htmlFor={`item-g-${idx}`}>
                    Grame
                  </label>
                  <input
                    id={`item-g-${idx}`}
                    type="number"
                    min={1}
                    value={item.grams}
                    onChange={(e) => handleGramsChange(idx, e.target.value)}
                    className="w-full px-2 py-1 min-h-[36px] text-xs font-mono tabular-nums text-[#141714] bg-[#F7F7F5] border border-transparent focus:border-[#166534] focus:bg-white rounded-lg focus:outline-none"
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-[10px] text-[#5A605A] mb-0.5" htmlFor={`item-kcal-${idx}`}>
                    Kcal
                  </label>
                  <input
                    id={`item-kcal-${idx}`}
                    type="number"
                    min={0}
                    value={item.calories}
                    onChange={(e) => {
                      setMultiplier(1);
                      handleItemFieldChange(idx, 'calories', e.target.value);
                    }}
                    className="w-full px-2 py-1 min-h-[36px] text-xs font-mono tabular-nums font-semibold text-[#141714] bg-[#F7F7F5] border border-transparent focus:border-[#166534] focus:bg-white rounded-lg focus:outline-none"
                  />
                </div>

                <div className="col-span-3 sm:col-span-2 text-[11px] font-mono tabular-nums text-[#5A605A] leading-tight">
                  <div>P {item.protein}g</div>
                  <div>C {item.carbs}g · G {item.fat}g</div>
                </div>

                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    aria-label={`Elimină ${item.name || `ingredient ${idx + 1}`}`}
                    className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-[#5A605A] hover:text-[#DC2626] rounded-lg hover:bg-[#FEF2F2]"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {validationError && (
          <p role="alert" className="mt-3 text-xs font-medium text-[#DC2626]">
            {validationError}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 min-h-[42px] text-sm font-medium text-[#5A605A] hover:text-[#141714] rounded-lg hover:bg-[#F7F7F5]"
          >
            Anulează
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2 min-h-[42px] text-sm font-medium text-white bg-[#166534] hover:bg-[#14532D] rounded-lg transition-colors whitespace-nowrap"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>{editingMeal ? 'Actualizează masa' : 'Salvează masa'}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
