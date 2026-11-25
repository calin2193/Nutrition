import { useEffect, useMemo, useRef, useState } from 'react';
import { DailySummaryPanel } from './components/DailySummaryPanel';
import { DateStrip } from './components/DateStrip';
import { GoalsView } from './components/GoalsView';
import { Header, type AppTab } from './components/Header';
import { HistoryView } from './components/HistoryView';
import { MealList } from './components/MealList';
import { MealReviewCard } from './components/MealReviewCard';
import { createEmptyManualDraft, MealUploader } from './components/MealUploader';
import {
  DEFAULT_DAILY_GOALS,
  type AnalyzedMealDraft,
  type BackupPayload,
  type DailyGoals,
  type FoodItem,
  type MealCategory,
  type MealEntry,
} from './types/nutrition';
import {
  calculateDailyTotals,
  calculateMealTotals,
  formatDateKey,
} from './utils/nutrition';
import {
  clearAllUserData,
  loadPersistedData,
  saveAllMeals,
  saveDailyGoals,
} from './utils/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('jurnal');
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    formatDateKey(new Date())
  );
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [goals, setGoals] = useState<DailyGoals>(DEFAULT_DAILY_GOALS);
  const [isStorageReady, setIsStorageReady] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [draftMeal, setDraftMeal] = useState<AnalyzedMealDraft | null>(null);
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    loadPersistedData().then(({ meals: loadedMeals, goals: loadedGoals }) => {
      if (!mounted) return;
      setMeals(loadedMeals);
      setGoals(loadedGoals);
      setIsStorageReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const dayMeals = useMemo(
    () => meals.filter((m) => m.dateKey === selectedDateKey),
    [meals, selectedDateKey]
  );

  const dailyTotals = useMemo(
    () => calculateDailyTotals(meals, selectedDateKey),
    [meals, selectedDateKey]
  );

  const todayKey = formatDateKey(new Date());
  const dateLabel = selectedDateKey === todayKey ? 'Astăzi' : selectedDateKey;

  const handleAnalyzeImage = async (payload: {
    imageBase64: string;
    mimeType: string;
    thumbnailDataUrl: string;
    note: string;
  }) => {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const response = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: payload.imageBase64,
          mimeType: payload.mimeType,
          note: payload.note,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        mealTitle?: string;
        suggestedCategory?: MealCategory;
        confidenceNote?: string;
        items?: FoodItem[];
      };

      if (!response.ok) {
        setAnalyzeError(data.error || 'Nu am putut analiza fotografia. Încearcă din nou.');
        return;
      }

      if (!data.items || data.items.length === 0) {
        setAnalyzeError('Nu au fost detectate alimente în fotografie.');
        return;
      }

      setEditingMeal(null);
      setDraftMeal({
        mealTitle: data.mealTitle || 'Masă analizată',
        suggestedCategory: data.suggestedCategory || 'pranz',
        confidenceNote: data.confidenceNote || '',
        items: data.items,
        imageUrl: payload.thumbnailDataUrl,
        note: payload.note || undefined,
      });
    } catch {
      setAnalyzeError('Eroare de rețea la analiza fotografiei. Verifică conexiunea.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveReviewedMeal = async (data: {
    title: string;
    category: MealCategory;
    timeLabel: string;
    items: FoodItem[];
    imageUrl?: string;
    note?: string;
    confidenceNote?: string;
  }) => {
    const totals = calculateMealTotals(data.items);
    let updatedMeals: MealEntry[];

    if (editingMeal) {
      updatedMeals = meals.map((m) =>
        m.id === editingMeal.id
          ? {
              ...m,
              title: data.title,
              category: data.category,
              timeLabel: data.timeLabel,
              items: data.items,
              totals,
            }
          : m
      );
    } else {
      const newMeal: MealEntry = {
        id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        dateKey: selectedDateKey,
        createdAt: `${selectedDateKey}T${data.timeLabel}:00`,
        timeLabel: data.timeLabel,
        title: data.title,
        category: data.category,
        imageUrl: data.imageUrl,
        note: data.note,
        confidenceNote: data.confidenceNote,
        items: data.items,
        totals,
      };
      updatedMeals = [newMeal, ...meals];
    }

    updatedMeals.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setMeals(updatedMeals);
    setDraftMeal(null);
    setEditingMeal(null);
    await saveAllMeals(updatedMeals);
  };

  const handleDeleteMeal = async (mealId: string) => {
    const updatedMeals = meals.filter((m) => m.id !== mealId);
    setMeals(updatedMeals);
    if (editingMeal?.id === mealId) {
      setEditingMeal(null);
      setDraftMeal(null);
    }
    await saveAllMeals(updatedMeals);
  };

  const handleEditMeal = (meal: MealEntry) => {
    setActiveTab('jurnal');
    setSelectedDateKey(meal.dateKey);
    setEditingMeal(meal);
    setDraftMeal({
      mealTitle: meal.title,
      suggestedCategory: meal.category,
      confidenceNote: meal.confidenceNote || '',
      items: meal.items,
      imageUrl: meal.imageUrl,
      note: meal.note,
    });
  };

  const handleSaveGoals = (nextGoals: DailyGoals) => {
    setGoals(nextGoals);
    saveDailyGoals(nextGoals);
  };

  const handleImportBackup = async (payload: BackupPayload) => {
    setGoals(payload.goals);
    saveDailyGoals(payload.goals);
    const sorted = [...payload.meals].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    setMeals(sorted);
    await saveAllMeals(sorted);
  };

  const handleClearAll = async () => {
    setMeals([]);
    setDraftMeal(null);
    setEditingMeal(null);
    await clearAllUserData();
  };

  const handleQuickScan = () => {
    setActiveTab('jurnal');
    fileInputRef.current?.click();
  };

  const handleGlobalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setActiveTab('jurnal');
    setAnalyzeError(null);
    setIsAnalyzing(true);
    try {
      const { processImageFile } = await import('./utils/image');
      const processed = await processImageFile(file);
      await handleAnalyzeImage({
        imageBase64: processed.analysisBase64,
        mimeType: processed.mimeType,
        thumbnailDataUrl: processed.thumbnailDataUrl,
        note: '',
      });
    } catch (err) {
      setIsAnalyzing(false);
      setAnalyzeError(
        err instanceof Error && err.message
          ? err.message
          : 'Nu am putut procesa fotografia selectată.'
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F5] text-[#141714] pb-16 md:pb-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(e) => void handleGlobalFileChange(e)}
      />

      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onQuickScan={handleQuickScan}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {!isStorageReady ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-busy="true">
            <div className="lg:col-span-7 space-y-6">
              <div className="h-64 bg-white border border-[#E6E6E1] rounded-2xl animate-pulse" />
              <div className="h-72 bg-white border border-[#E6E6E1] rounded-2xl animate-pulse" />
            </div>
            <div className="lg:col-span-5">
              <div className="h-96 bg-white border border-[#E6E6E1] rounded-2xl animate-pulse" />
            </div>
          </div>
        ) : activeTab === 'jurnal' ? (
          <div className="space-y-6">
            <DateStrip
              selectedDateKey={selectedDateKey}
              onSelectDate={(key) => {
                setSelectedDateKey(key);
                setDraftMeal(null);
                setEditingMeal(null);
              }}
              meals={meals}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-6">
                {draftMeal ? (
                  <MealReviewCard
                    draft={draftMeal}
                    editingMeal={editingMeal}
                    onCancel={() => {
                      setDraftMeal(null);
                      setEditingMeal(null);
                    }}
                    onSave={handleSaveReviewedMeal}
                  />
                ) : (
                  <MealUploader
                    isAnalyzing={isAnalyzing}
                    errorMessage={analyzeError}
                    onClearError={() => setAnalyzeError(null)}
                    onAnalyzeImage={handleAnalyzeImage}
                    onStartManualEntry={() => {
                      setEditingMeal(null);
                      setAnalyzeError(null);
                      setDraftMeal(createEmptyManualDraft('pranz'));
                    }}
                    fileInputRef={fileInputRef}
                  />
                )}

                <MealList
                  meals={dayMeals}
                  dateLabel={dateLabel}
                  onEditMeal={handleEditMeal}
                  onDeleteMeal={handleDeleteMeal}
                  onPromptUpload={() => fileInputRef.current?.click()}
                />
              </div>

              <div className="lg:col-span-5">
                <DailySummaryPanel
                  selectedDateKey={selectedDateKey}
                  consumed={dailyTotals}
                  goals={goals}
                  meals={meals}
                  onOpenGoals={() => setActiveTab('obiective')}
                />
              </div>
            </div>
          </div>
        ) : activeTab === 'istoric' ? (
          <HistoryView
            meals={meals}
            goals={goals}
            onSelectDateInJournal={(dateKey) => {
              setSelectedDateKey(dateKey);
              setActiveTab('jurnal');
            }}
            onDeleteMeal={handleDeleteMeal}
          />
        ) : (
          <GoalsView
            goals={goals}
            meals={meals}
            onSaveGoals={handleSaveGoals}
            onImportBackup={handleImportBackup}
            onClearAllData={handleClearAll}
          />
        )}
      </main>

      <footer className="hidden md:block border-t border-[#E6E6E1] bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between text-xs text-[#5A605A]">
          <span>NutriFoto · Datele tale sunt salvate local în browser</span>
          <span className="font-mono tabular-nums">{meals.length} mese în istoric</span>
        </div>
      </footer>
    </div>
  );
}
