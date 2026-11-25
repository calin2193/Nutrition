import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cliPortIdx = process.argv.indexOf('--port');
const cliPort = cliPortIdx !== -1 ? Number(process.argv[cliPortIdx + 1]) : NaN;
const PORT =
  Number.isFinite(cliPort) && cliPort > 0
    ? cliPort
    : Number(process.env.PORT) || 3000;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
]);

interface AnalyzeMealBody {
  imageBase64?: unknown;
  mimeType?: unknown;
  note?: unknown;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/analyze-meal', async (req, res) => {
    try {
      const body = (req.body ?? {}) as AnalyzeMealBody;
      const rawBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
      const rawMimeType = typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : 'image/jpeg';
      const userNote = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : '';

      if (!rawBase64) {
        res.status(400).json({ error: 'Lipsește fotografia mesei pentru analiză.' });
        return;
      }

      const normalizedMime =
        rawMimeType === 'image/jpg' || !rawMimeType ? 'image/jpeg' : rawMimeType;
      if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
        res.status(400).json({ error: 'Format de imagine nesuportat. Folosește JPG, PNG, WebP sau HEIC.' });
        return;
      }

      const cleanBase64 = rawBase64.includes(',') ? rawBase64.split(',')[1] : rawBase64;
      if (cleanBase64.length < 32) {
        res.status(400).json({ error: 'Imaginea încărcată nu este validă.' });
        return;
      }

      let ai: GoogleGenAI;
      try {
        ai = getGeminiClient();
      } catch {
        res.status(503).json({
          error: 'Serviciul de analiză AI nu este configurat momentan (lipsește cheia API în server).',
        });
        return;
      }

      const promptText = [
        'Analizează fotografia acestei mese și estimează cu precizie realistă alimentele vizibile, gramajele aproximative, caloriile (kcal) și macronutrienții (proteine, carbohidrați, grăsimi în grame).',
        userNote ? `Detaliu oferit de utilizator: "${userNote}". Ține cont de acest detaliu în calcul.` : '',
        'Răspunde exclusiv în limba română. Dacă în imagine nu apare mâncare sau băutură alimentară, setează isFood=false și lasă lista items goală.',
      ]
        .filter(Boolean)
        .join('\n');

      const analyzeOnce = async () => {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: normalizedMime,
                  data: cleanBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              'Ești un nutriționist clinic cu experiență în estimarea porțiilor din fotografii. Estimează realist gramajele standard de restaurant/acasă, inclusiv uleiul de gătit sau sosurile vizibile, și oferă valori nutriționale coerente (kcal ≈ proteine*4 + carbohidrați*4 + grăsimi*9).',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isFood: {
                  type: Type.BOOLEAN,
                  description: 'True dacă imaginea conține mâncare sau băutură calorică, false altfel.',
                },
                mealTitle: {
                  type: Type.STRING,
                  description: 'Titlu scurt și natural în română pentru întreaga masă (ex: Bol cu somon și orez brun).',
                },
                suggestedCategory: {
                  type: Type.STRING,
                  description: 'Una dintre valorile exacte: mic_dejun, pranz, cina, gustare.',
                },
                confidenceNote: {
                  type: Type.STRING,
                  description: 'Scurtă observație în română despre porții sau ingrediente ascunse estimate (ex: Include ~10g ulei de măsline).',
                },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: {
                        type: Type.STRING,
                        description: 'Denumirea alimentului în română.',
                      },
                      grams: {
                        type: Type.NUMBER,
                        description: 'Cantitatea estimată în grame.',
                      },
                      calories: {
                        type: Type.NUMBER,
                        description: 'Calorii estimate în kcal.',
                      },
                      protein: {
                        type: Type.NUMBER,
                        description: 'Proteine în grame.',
                      },
                      carbs: {
                        type: Type.NUMBER,
                        description: 'Carbohidrați în grame.',
                      },
                      fat: {
                        type: Type.NUMBER,
                        description: 'Grăsimi în grame.',
                      },
                    },
                    required: ['name', 'grams', 'calories', 'protein', 'carbs', 'fat'],
                  },
                },
              },
              required: ['isFood', 'mealTitle', 'suggestedCategory', 'confidenceNote', 'items'],
            },
          },
        });

        const rawText = (response.text ?? '').trim();
        if (!rawText) {
          throw new Error('EMPTY_MODEL_RESPONSE');
        }
        const rawJson = rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        return JSON.parse(rawJson) as {
          isFood?: boolean;
          mealTitle?: string;
          suggestedCategory?: string;
          confidenceNote?: string;
          items?: Array<{
            name?: string;
            grams?: number;
            calories?: number;
            protein?: number;
            carbs?: number;
            fat?: number;
          }>;
        };
      };

      let parsed;
      try {
        parsed = await analyzeOnce();
      } catch (firstErr) {
        const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
        if (msg.includes('403') || msg.includes('400') || msg.includes('API_KEY_INVALID')) {
          throw firstErr;
        }
        await new Promise((r) => setTimeout(r, 400));
        parsed = await analyzeOnce();
      }

      if (parsed.isFood === false) {
        res.status(422).json({
          error: 'Nu am detectat alimente în această fotografie. Încearcă o poză mai clară cu farfuria sau masa ta.',
        });
        return;
      }

      const validCategories = new Set(['mic_dejun', 'pranz', 'cina', 'gustare']);
      const suggestedCategory = validCategories.has(parsed.suggestedCategory ?? '')
        ? parsed.suggestedCategory
        : 'pranz';

      const sanitizedItems = Array.isArray(parsed.items)
        ? parsed.items
            .filter((item) => item && typeof item.name === 'string' && item.name.trim().length > 0)
            .map((item, idx) => ({
              id: `item-${Date.now()}-${idx}`,
              name: String(item.name).trim(),
              grams: Math.max(1, Math.round(Number(item.grams) || 100)),
              calories: Math.max(0, Math.round(Number(item.calories) || 0)),
              protein: Math.max(0, Math.round((Number(item.protein) || 0) * 10) / 10),
              carbs: Math.max(0, Math.round((Number(item.carbs) || 0) * 10) / 10),
              fat: Math.max(0, Math.round((Number(item.fat) || 0) * 10) / 10),
            }))
        : [];

      if (sanitizedItems.length === 0) {
        res.status(422).json({
          error: 'Nu am putut identifica ingredientele din imagine. Poți adăuga o scurtă descriere sau introduce masa manual.',
        });
        return;
      }

      res.json({
        mealTitle:
          typeof parsed.mealTitle === 'string' && parsed.mealTitle.trim().length > 0
            ? parsed.mealTitle.trim()
            : sanitizedItems[0].name,
        suggestedCategory,
        confidenceNote:
          typeof parsed.confidenceNote === 'string' ? parsed.confidenceNote.trim() : '',
        items: sanitizedItems,
      });
    } catch (error: unknown) {
      console.error('Analyze meal error:', error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('403') || message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID')) {
        res.status(403).json({
          error: 'Cheia API Gemini este invalidă sau nu are permisiuni. Verifică configurarea în Settings > Secrets.',
        });
        return;
      }
      if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error: 'Limita de cereri către serviciul AI a fost atinsă temporar. Încearcă din nou în câteva momente.',
        });
        return;
      }
      res.status(500).json({
        error: 'Nu am putut analiza fotografia acum. Verifică conexiunea și încearcă din nou.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NutriFoto server running on http://0.0.0.0:${PORT}`);
  });
}

createApp();
