import { useRef, useState } from 'react';
import { Calculator, Check, Download, Trash2, Upload } from 'lucide-react';
import type { BackupPayload, DailyGoals, MealEntry } from '../types/nutrition';
import { calculateBmrTdee, validateBackupPayload } from '../utils/nutrition';

interface GoalsViewProps {
  goals: DailyGoals;
  meals: MealEntry[];
  onSaveGoals: (goals: DailyGoals) => void;
  onImportBackup: (payload: BackupPayload) => Promise<void>;
  onClearAllData: () => Promise<void>;
}

export function GoalsView({
  goals,
  meals,
  onSaveGoals,
  onImportBackup,
  onClearAllData,
}: GoalsViewProps) {
  const [calories, setCalories] = useState(String(goals.calories));
  const [protein, setProtein] = useState(String(goals.protein));
  const [carbs, setCarbs] = useState(String(goals.carbs));
  const [fat, setFat] = useState(String(goals.fat));
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Calculator state
  const [sex, setSex] = useState<'m' | 'f'>('m');
  const [age, setAge] = useState('28');
  const [weightKg, setWeightKg] = useState('75');
  const [heightCm, setHeightCm] = useState('176');
  const [activity, setActivity] = useState<'sedentar' | 'usor' | 'moderat' | 'activ'>('moderat');
  const [goalType, setGoalType] = useState<'slabire' | 'mentinere' | 'masa'>('mentinere');

  // Clear confirmation
  const [confirmClear, setConfirmClear] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleGoalsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const kcal = Math.round(Number(calories));
    const p = Math.round(Number(protein));
    const c = Math.round(Number(carbs));
    const f = Math.round(Number(fat));

    if (!Number.isFinite(kcal) || kcal < 800 || kcal > 8000) {
      setErrorMsg('Ținta calorică trebuie să fie între 800 și 8000 kcal.');
      return;
    }
    if (!Number.isFinite(p) || p < 20 || !Number.isFinite(c) || c < 20 || !Number.isFinite(f) || f < 15) {
      setErrorMsg('Introdu valori valide pentru proteine, carbohidrați și grăsimi.');
      return;
    }

    onSaveGoals({ calories: kcal, protein: p, carbs: c, fat: f });
    setStatusMsg('Obiectivele zilnice au fost salvate.');
  };

  const handleCalculateTargets = () => {
    const computed = calculateBmrTdee({
      sex,
      age: Number(age) || 28,
      weightKg: Number(weightKg) || 75,
      heightCm: Number(heightCm) || 176,
      activity,
      goal: goalType,
    });
    setCalories(String(computed.calories));
    setProtein(String(computed.protein));
    setCarbs(String(computed.carbs));
    setFat(String(computed.fat));
    onSaveGoals(computed);
    setErrorMsg(null);
    setStatusMsg(`Obiective calculate și salvate: ${computed.calories} kcal / zi.`);
  };

  const handleExportJson = () => {
    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      goals,
      meals,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nutrifoto-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMsg('Fișierul de backup a fost descărcat.');
  };

  const handleImportFile = async (file: File) => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const validated = validateBackupPayload(parsed);
      if (!validated) {
        setErrorMsg('Fișierul selectat nu este un backup NutriFoto valid.');
        return;
      }
      await onImportBackup(validated);
      setCalories(String(validated.goals.calories));
      setProtein(String(validated.goals.protein));
      setCarbs(String(validated.goals.carbs));
      setFat(String(validated.goals.fat));
      setStatusMsg(`Au fost importate ${validated.meals.length} mese și obiectivele tale.`);
    } catch {
      setErrorMsg('Nu am putut citi fișierul JSON selectat.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <section className="lg:col-span-7 bg-white border border-[#E6E6E1] rounded-2xl p-6">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-[#141714] tracking-tight">
          Obiective zilnice
        </h1>
        <p className="text-sm text-[#5A605A] mt-1">
          Setează ținta de calorii și macronutrienți. Toate datele sunt salvate local în browser.
        </p>

        <form onSubmit={handleGoalsSubmit} className="mt-6 space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="goal-calories" className="block text-xs font-medium text-[#5A605A] mb-1">
                Calorii zilnice (kcal)
              </label>
              <input
                id="goal-calories"
                type="number"
                min={800}
                max={8000}
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] font-mono tabular-nums text-base font-semibold text-[#141714] bg-white border border-[#E6E6E1] rounded-lg focus:outline-none focus:border-[#166534]"
              />
            </div>

            <div>
              <label htmlFor="goal-protein" className="block text-xs font-medium text-[#5A605A] mb-1">
                Proteine (g / zi)
              </label>
              <input
                id="goal-protein"
                type="number"
                min={20}
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] font-mono tabular-nums text-base font-semibold text-[#141714] bg-white border border-[#E6E6E1] rounded-lg focus:outline-none focus:border-[#166534]"
              />
            </div>

            <div>
              <label htmlFor="goal-carbs" className="block text-xs font-medium text-[#5A605A] mb-1">
                Carbohidrați (g / zi)
              </label>
              <input
                id="goal-carbs"
                type="number"
                min={20}
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] font-mono tabular-nums text-base font-semibold text-[#141714] bg-white border border-[#E6E6E1] rounded-lg focus:outline-none focus:border-[#166534]"
              />
            </div>

            <div>
              <label htmlFor="goal-fat" className="block text-xs font-medium text-[#5A605A] mb-1">
                Grăsimi (g / zi)
              </label>
              <input
                id="goal-fat"
                type="number"
                min={15}
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] font-mono tabular-nums text-base font-semibold text-[#141714] bg-white border border-[#E6E6E1] rounded-lg focus:outline-none focus:border-[#166534]"
              />
            </div>
          </div>

          {errorMsg && (
            <p role="alert" className="text-xs font-medium text-[#DC2626]">
              {errorMsg}
            </p>
          )}
          {statusMsg && (
            <p role="status" className="text-xs font-medium text-[#166534]">
              {statusMsg}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-medium text-white bg-[#166534] hover:bg-[#14532D] rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>Salvează obiectivele</span>
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-[#E6E6E1]">
          <h2 className="font-display text-base font-semibold text-[#141714]">
            Backup și gestionare date
          </h2>
          <p className="text-xs text-[#5A605A] mt-1">
            Poți descărca întregul istoric în format JSON sau poți restaura un backup salvat anterior.
          </p>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            aria-label="Importă fișier backup JSON"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = '';
            }}
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[42px] text-xs font-medium text-[#141714] bg-[#F7F7F5] hover:bg-[#EFEFE9] border border-[#E6E6E1] rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Exportă datele (JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[42px] text-xs font-medium text-[#141714] bg-[#F7F7F5] hover:bg-[#EFEFE9] border border-[#E6E6E1] rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Importă backup</span>
            </button>

            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-2 px-4 py-2 min-h-[42px] text-xs font-medium text-[#DC2626] bg-white hover:bg-[#FEF2F2] border border-[#FECACA] rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>Șterge toate mesele</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await onClearAllData();
                    setConfirmClear(false);
                    setStatusMsg('Toate mesele salvate au fost șterse.');
                  }}
                  className="px-3.5 py-2 min-h-[42px] text-xs font-medium text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg"
                >
                  Confirmă ștergerea
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-2 min-h-[42px] text-xs font-medium text-[#5A605A] hover:text-[#141714]"
                >
                  Renunță
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="lg:col-span-5 bg-white border border-[#E6E6E1] rounded-2xl p-6">
        <div className="flex items-center gap-2.5">
          <Calculator className="w-5 h-5 text-[#166534]" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-[#141714]">
            Calculator necesar caloric
          </h2>
        </div>
        <p className="text-xs text-[#5A605A] mt-1">
          Estimează necesarul zilnic după formula Mifflin-St Jeor și aplică-l automat.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="calc-sex" className="block text-xs font-medium text-[#5A605A] mb-1">
              Sex
            </label>
            <select
              id="calc-sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as 'm' | 'f')}
              className="w-full px-3 py-2 min-h-[42px] text-sm bg-white border border-[#E6E6E1] rounded-lg focus:outline-none focus:border-[#166534]"
            >
              <option value="m">Masculin</option>
              <option value="f">Feminin</option>
            </select>
          </div>
          <div>
            <label htmlFor="calc-age" className="block text-xs font-medium text-[#5A605A] mb-1">
              Vârstă (ani)
            </label>
            <input
              id="calc-age"
              type="number"
              min={14}
              max={100}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-3 py-2 min-h-[42px] text-sm font-mono tabular-nums bg-white border border-[#E6E6E1] rounded-lg focus:outline-none focus:border-[#166534]"
            />
          </div>
          <div>
            <label htmlFor="calc-weight" className="block text-xs font-medium text-[#5A605A] mb-1">
              Greutate (kg)
            </label>
            <input
              id="calc-weight"
              type="number"
              min={35}
              max={250}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full px-3 py-2 min-h-[42px] text-sm font-mono tabular-nums bg-white border border-[#E6E6E1] rounded-lg focus:outline-none focus:border-[#166534]"
            />
          </div>
          <div>
            <label htmlFor="calc-height" className="block text-xs font-medium text-[#5A605A] mb-1">
              Înălțime (cm)
            </label>
            <input
              id="calc-height"
              type="number"
              min={120}
              max={230}
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-full px-3 py-2 min-h-[42px] text-sm font-mono tabular-nums bg-white border border-[#E6E6E1] rounded-lg focus:outline-none focus:border-[#166534]"
            />
          </div>
        </div>

        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="calc-activity" className="block text-xs font-medium text-[#5A605A] mb-1">
              Nivel de activitate
            </label>
            <select
              id="calc-activity"
              value={activity}
              onChange={(e) => setActivity(e.target.value as typeof activity)}
              className="w-full px-3 py-2 min-h-[42px] text-sm bg-white border border-[#E6E6E1] rounded-lg focus:outline-none focus:border-[#166534]"
            >
              <option value="sedentar">Sedentar (muncă de birou)</option>
              <option value="usor">Ușor activ (1-2 antrenamente/săpt.)</option>
              <option value="moderat">Moderat activ (3-4 antrenamente/săpt.)</option>
              <option value="activ">Foarte activ (5+ antrenamente/săpt.)</option>
            </select>
          </div>

          <div>
            <label htmlFor="calc-goal" className="block text-xs font-medium text-[#5A605A] mb-1">
              Obiectiv
            </label>
            <select
              id="calc-goal"
              value={goalType}
              onChange={(e) => setGoalType(e.target.value as typeof goalType)}
              className="w-full px-3 py-2 min-h-[42px] text-sm bg-white border border-[#E6E6E1] rounded-lg focus:outline-none focus:border-[#166534]"
            >
              <option value="slabire">Slăbire (-400 kcal)</option>
              <option value="mentinere">Menținere greutate</option>
              <option value="masa">Creștere masă (+300 kcal)</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCalculateTargets}
          className="mt-5 w-full px-4 py-2.5 min-h-[44px] text-sm font-medium text-[#141714] bg-[#F7F7F5] hover:bg-[#EFEFE9] border border-[#E6E6E1] rounded-lg transition-colors"
        >
          Calculează și aplică
        </button>
      </section>
    </div>
  );
}
