import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, PenLine, AlertCircle } from 'lucide-react';
import { SAMPLE_PHOTO_PRESETS, type SamplePhotoPreset } from '../utils/samples';
import { processImageFile, processImageFromUrl } from '../utils/image';
import type { AnalyzedMealDraft, MealCategory } from '../types/nutrition';

interface MealUploaderProps {
  isAnalyzing: boolean;
  errorMessage: string | null;
  onClearError: () => void;
  onAnalyzeImage: (payload: {
    imageBase64: string;
    mimeType: string;
    thumbnailDataUrl: string;
    note: string;
  }) => Promise<void>;
  onStartManualEntry: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function MealUploader({
  isAnalyzing,
  errorMessage,
  onClearError,
  onAnalyzeImage,
  onStartManualEntry,
  fileInputRef,
}: MealUploaderProps) {
  const localFileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [note, setNote] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    onClearError();
    setLocalError(null);
    try {
      const processed = await processImageFile(file);
      setPreviewUrl(processed.thumbnailDataUrl || null);
      await onAnalyzeImage({
        imageBase64: processed.analysisBase64,
        mimeType: processed.mimeType,
        thumbnailDataUrl: processed.thumbnailDataUrl,
        note: note.trim(),
      });
      setNote('');
      setPreviewUrl(null);
    } catch (err) {
      setPreviewUrl(null);
      setLocalError(
        err instanceof Error && err.message
          ? err.message
          : 'Nu am putut procesa fotografia selectată.'
      );
    }
  };

  const handleSampleClick = async (preset: SamplePhotoPreset) => {
    if (isAnalyzing) return;
    onClearError();
    setLocalError(null);
    try {
      const processed = await processImageFromUrl(preset.imageUrl);
      setPreviewUrl(preset.imageUrl);
      await onAnalyzeImage({
        imageBase64: processed.analysisBase64,
        mimeType: processed.mimeType,
        thumbnailDataUrl: preset.imageUrl,
        note: note.trim() || preset.hint,
      });
      setPreviewUrl(null);
    } catch (err) {
      setPreviewUrl(null);
      setLocalError(
        err instanceof Error && err.message
          ? err.message
          : 'Nu am putut încărca fotografia exemplu.'
      );
    }
  };

  const displayError = errorMessage || localError;

  return (
    <section
      aria-label="Analiză fotografie masă"
      className="bg-white border border-[#E6E6E1] rounded-2xl p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#141714] tracking-tight">
            Fotografiază ce mănânci
          </h1>
          <p className="text-sm text-[#5A605A] mt-1">
            Încarcă o poză cu farfuria, iar aplicația estimează alimentele, gramajele și caloriile.
          </p>
        </div>
        <button
          type="button"
          onClick={onStartManualEntry}
          disabled={isAnalyzing}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-[#141714] bg-[#F7F7F5] hover:bg-[#EFEFE9] border border-[#E6E6E1] rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
        >
          <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Adaugă manual</span>
        </button>
      </div>

      <input
        ref={localFileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isAnalyzing) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (isAnalyzing) return;
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={`mt-5 rounded-xl border border-dashed transition-colors p-6 sm:p-8 text-center ${
          isDragging
            ? 'border-[#166534] bg-[#166534]/5'
            : 'border-[#C8CBC3] bg-[#F7F7F5]/60'
        }`}
      >
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Fotografie în curs de analiză"
                referrerPolicy="no-referrer"
                className="w-24 h-24 object-cover rounded-xl border border-[#E6E6E1]"
              />
            )}
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[#166534]">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Analizăm ingredientele și calculăm caloriile...</span>
            </div>
            <p className="text-xs text-[#5A605A]">
              Estimăm porțiile, proteinele, carbohidrații și grăsimile din imagine.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 rounded-full bg-white border border-[#E6E6E1] flex items-center justify-center text-[#166534]">
              <ImagePlus className="w-5 h-5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-medium text-[#141714]">
              Trage poza aici sau alege una din telefon / calculator
            </p>
            <p className="mt-1 text-xs text-[#5A605A]">
              Suportă JPG, PNG, WebP, HEIC · Fotografia se comprimă automat pentru salvare rapidă
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => localFileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-medium text-white bg-[#166534] hover:bg-[#14532D] rounded-lg transition-colors whitespace-nowrap"
              >
                <ImagePlus className="w-4 h-4" aria-hidden="true" />
                <span>Încarcă fotografie</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-medium text-[#141714] bg-white hover:bg-[#EFEFE9] border border-[#E6E6E1] rounded-lg transition-colors whitespace-nowrap"
              >
                <Camera className="w-4 h-4" aria-hidden="true" />
                <span>Fă o poză</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <label htmlFor="meal-context-note" className="block text-xs font-medium text-[#5A605A] mb-1.5">
          Detaliu opțional pentru precizie mai mare (ex: gătit în ulei, 200g carne, fără zahăr)
        </label>
        <input
          id="meal-context-note"
          type="text"
          value={note}
          maxLength={240}
          disabled={isAnalyzing}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex: 150g piept de pui la grătar, sos de iaurt..."
          className="w-full px-3.5 py-2.5 min-h-[42px] text-sm text-[#141714] bg-white border border-[#E6E6E1] rounded-lg placeholder:text-[#8E938D] focus:outline-none focus:border-[#166534]"
        />
      </div>

      {displayError && (
        <div
          role="alert"
          className="mt-4 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-sm text-[#991B1B]"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1">{displayError}</div>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-[#E6E6E1]">
        <div className="text-xs font-medium text-[#5A605A] mb-2.5">
          Sau testează rapid calculul pe o fotografie exemplu
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SAMPLE_PHOTO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={isAnalyzing}
              onClick={() => void handleSampleClick(preset)}
              className="flex items-center gap-2.5 p-2 min-h-[58px] text-left bg-[#F7F7F5] hover:bg-[#EFEFE9] border border-[#E6E6E1] rounded-xl transition-colors disabled:opacity-60"
            >
              <img
                src={preset.imageUrl}
                alt={preset.label}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-lg object-cover shrink-0 bg-[#EFEFE9]"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#141714] leading-snug line-clamp-2">
                  {preset.label}
                </div>
                <div className="text-[11px] text-[#5A605A]">
                  {preset.subtitle}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function createEmptyManualDraft(defaultCategory: MealCategory = 'pranz'): AnalyzedMealDraft {
  return {
    mealTitle: '',
    suggestedCategory: defaultCategory,
    confidenceNote: 'Introdus manual',
    items: [
      {
        id: `manual-${Date.now()}`,
        name: '',
        grams: 150,
        calories: 250,
        protein: 15,
        carbs: 25,
        fat: 8,
      },
    ],
  };
}
