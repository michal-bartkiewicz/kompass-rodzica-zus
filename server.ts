import 'dotenv/config';
import { timingSafeEqual } from 'node:crypto';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import { auditZusCase, evaluateRiskRadar, simulateDualParentPlan } from './src/engine/zusEngine.ts';
import { retrieveLegalChunks } from './src/engine/legalCorpus.ts';
import { parseZusDocumentTextFallback } from './src/engine/pdfTextParser.ts';
import { DEFAULT_2026_PARAMS } from './src/engine/presets.ts';
import type { AuditInput, FormType, InsuranceTitle, LegislativeParams } from './src/engine/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;
const HOST =
  process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '.data');
const PARAMS_FILE = path.join(DATA_DIR, 'params.json');
const PARAMS_AUDIT_FILE = path.join(DATA_DIR, 'params-audit.jsonl');

function canChangeParams(providedKey?: string): boolean {
  if (process.env.NODE_ENV !== 'production') return true;

  const expectedKey = process.env.ADMIN_ACCESS_KEY;
  if (!expectedKey || !providedKey) return false;
  const expected = Buffer.from(expectedKey);
  const provided = Buffer.from(providedKey);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

function rejectUnauthorizedParamsChange(
  req: express.Request,
  res: express.Response
): boolean {
  if (canChangeParams(req.get('X-Admin-Key'))) return false;

  const keyConfigured = Boolean(process.env.ADMIN_ACCESS_KEY);
  res.status(keyConfigured ? 403 : 503).json({
    error: keyConfigured
      ? 'Podany klucz administratora jest nieprawidłowy.'
      : 'Zmiany parametrów w produkcji są wyłączone. Ustaw ADMIN_ACCESS_KEY na serwerze.',
  });
  return true;
}

const PARAM_LIMITS: Partial<Record<keyof LegislativeParams, [number, number]>> = {
  minWage: [1, 100_000],
  socialDeductionRate: [0, 1],
  avgForecastSalary: [1, 500_000],
  b2bCapMultiplier: [0.1, 10],
  b2bDebtThresholdPct: [0, 100],
  rateMaternity100: [0, 1],
  rateCombined815: [0, 1],
  rateParental70: [0, 1],
  rateSicknessPregnancy: [0, 1],
  rateSicknessStandard: [0, 1],
  pitRate: [0, 1],
  pitThreshold: [1, 100_000_000],
  pitHigherRate: [0, 1],
  parentalBenefitFloorNet: [0, 100_000],
  funeralBenefit: [0, 100_000],
  payerInsuredThreshold: [0, 100_000],
};

class ParamsValidationError extends Error {}

function validateStoredParams(
  next: Partial<LegislativeParams>
): LegislativeParams {
  for (const key of Object.keys(next)) {
    if (!(key in DEFAULT_2026_PARAMS)) {
      throw new ParamsValidationError(`Nieznany parametr: ${key}.`);
    }
  }

  const candidate = { ...DEFAULT_2026_PARAMS, ...next };
  if (
    typeof candidate.yearLabel !== 'string' ||
    candidate.yearLabel.trim().length === 0 ||
    candidate.yearLabel.length > 120
  ) {
    throw new ParamsValidationError('Etykieta stanu prawnego musi mieć od 1 do 120 znaków.');
  }
  if (typeof candidate.enable2027Law !== 'boolean') {
    throw new ParamsValidationError('Przełącznik przepisów 2027 musi mieć wartość logiczną.');
  }

  for (const [key, range] of Object.entries(PARAM_LIMITS)) {
    const value = candidate[key as keyof LegislativeParams];
    const [min, max] = range!;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      throw new ParamsValidationError(`Parametr ${key} musi być liczbą z zakresu ${min}–${max}.`);
    }
  }

  return candidate;
}

function loadStoredParams(): LegislativeParams {
  try {
    if (fs.existsSync(PARAMS_FILE)) {
      const raw = fs.readFileSync(PARAMS_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<LegislativeParams>;
      return validateStoredParams(parsed);
    }
  } catch {
    // Fallback to defaults if corrupted
  }
  return { ...DEFAULT_2026_PARAMS };
}

function saveStoredParams(
  next: Partial<LegislativeParams>,
  action: 'update' | 'reset'
): LegislativeParams {
  const sanitized = validateStoredParams(next);
  const previous = loadStoredParams();
  const previousFile = fs.existsSync(PARAMS_FILE)
    ? fs.readFileSync(PARAMS_FILE, 'utf-8')
    : null;
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const tempFile = path.join(DATA_DIR, `.params-${process.pid}-${Date.now()}.tmp`);
  let paramsWritten = false;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(sanitized, null, 2), 'utf-8');
    fs.renameSync(tempFile, PARAMS_FILE);
    paramsWritten = true;

    const changedParams = Object.fromEntries(
      (Object.keys(DEFAULT_2026_PARAMS) as Array<keyof LegislativeParams>)
        .filter((key) => previous[key] !== sanitized[key])
        .map((key) => [key, { from: previous[key], to: sanitized[key] }])
    );
    const auditEntry = {
      timestamp: new Date().toISOString(),
      actorId:
        process.env.ADMIN_ACTOR_ID?.trim() ||
        (process.env.NODE_ENV === 'production' ? 'administrator' : 'developer'),
      action,
      changedParams,
    };
    fs.appendFileSync(
      PARAMS_AUDIT_FILE,
      `${JSON.stringify(auditEntry)}\n`,
      { encoding: 'utf-8', mode: 0o600 }
    );
  } catch (error) {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    if (paramsWritten) {
      if (previousFile === null) {
        if (fs.existsSync(PARAMS_FILE)) fs.unlinkSync(PARAMS_FILE);
      } else {
        fs.writeFileSync(PARAMS_FILE, previousFile, 'utf-8');
      }
    }
    throw error;
  }

  return sanitized;
}

function resolveRequestParams(raw: unknown): LegislativeParams {
  if (raw == null) return loadStoredParams();
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ParamsValidationError('Parametry muszą być obiektem.');
  }
  return validateStoredParams({
    ...loadStoredParams(),
    ...(raw as Partial<LegislativeParams>),
  });
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

const VALID_FORMS: FormType[] = [
  'ZAM',
  'Z-3',
  'Z-3a',
  'ZAS-12',
  'ZAS-53',
  'Z-15A',
  'POSWIADCZENIE',
  'ZUR',
  'ZAO',
  'Z-3b',
  'INNY',
];

const VALID_TITLES: InsuranceTitle[] = ['UOP', 'B2B', 'ZLECENIE', 'BRAK'];

function sanitizeAuditInput(raw: Record<string, unknown>): AuditInput {
  const formCandidate = String(raw.formType || 'INNY').trim() as FormType;
  const titleCandidate = String(raw.insuredTitle || 'UOP').trim().toUpperCase() as InsuranceTitle;
  return {
    formType: VALID_FORMS.includes(formCandidate) ? formCandidate : 'INNY',
    applicantName: String(raw.applicantName || 'Wnioskodawca z dokumentu').slice(0, 120),
    insuredTitle: VALID_TITLES.includes(titleCandidate) ? titleCandidate : 'UOP',
    payerInsuredCount: Math.max(0, Number(raw.payerInsuredCount) || 1),
    insuranceDaysTotal: Math.max(0, Number(raw.insuranceDaysTotal) || 0),
    gapBetweenPeriodsDays: Math.max(0, Number(raw.gapBetweenPeriodsDays) || 0),
    hasVoluntarySickness: Boolean(raw.hasVoluntarySickness ?? true),
    b2bDebtAmount: Math.max(0, Number(raw.b2bDebtAmount) || 0),
    monthlyGrossDeclared: Math.max(0, Number(raw.monthlyGrossDeclared) || 0),
    monthsInsuredLast12: Math.max(1, Math.min(12, Number(raw.monthsInsuredLast12) || 12)),
    isPregnancyRelated: Boolean(raw.isPregnancyRelated ?? true),
    usedSickDaysBeforePregnancy: Math.max(0, Number(raw.usedSickDaysBeforePregnancy) || 0),
    usedSickDaysWithCodeB: Math.max(0, Number(raw.usedSickDaysWithCodeB) || 0),
    hasSecondEmploymentTitle: Boolean(raw.hasSecondEmploymentTitle ?? false),
    optOutSecondTitleL4_2027: Boolean(raw.optOutSecondTitleL4_2027 ?? false),
    has10YearsMandatoryInsurance: Boolean(raw.has10YearsMandatoryInsurance ?? false),
    claimDaysAfterBirth: Math.max(0, Number(raw.claimDaysAfterBirth) || 7),
    submittedViaPue: Boolean(raw.submittedViaPue ?? true),
    notes: String(raw.notes || '').slice(0, 500),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '35mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', model: MODEL_NAME });
  });

  app.get('/api/params', (_req, res) => {
    res.json(loadStoredParams());
  });

  app.put('/api/params', (req, res) => {
    if (rejectUnauthorizedParamsChange(req, res)) return;
    try {
      const body = req.body ?? {};
      if (typeof body !== 'object' || Array.isArray(body)) {
        res.status(400).json({ error: 'Nieprawidłowy obiekt parametrów legislacyjnych.' });
        return;
      }
      const saved = saveStoredParams(body as Partial<LegislativeParams>, 'update');
      res.json(saved);
    } catch (error) {
      if (error instanceof ParamsValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Nie udało się zapisać parametrów systemowych.' });
    }
  });

  app.post('/api/params/reset', (req, res) => {
    if (rejectUnauthorizedParamsChange(req, res)) return;
    try {
      const saved = saveStoredParams(DEFAULT_2026_PARAMS, 'reset');
      res.json(saved);
    } catch {
      res.status(500).json({ error: 'Nie udało się zresetować parametrów systemowych.' });
    }
  });

  app.post('/api/calculate', (req, res) => {
    try {
      const { mom, dad, scenario, params } = req.body ?? {};
      if (!mom || !dad || !scenario) {
        res.status(400).json({ error: 'Wymagane pola: mom, dad, scenario.' });
        return;
      }
      const activeParams = resolveRequestParams(params);
      const result = simulateDualParentPlan(mom, dad, scenario, activeParams);
      const risks = evaluateRiskRadar(mom, dad, scenario, activeParams);
      res.json({ result, risks });
    } catch {
      res.status(400).json({ error: 'Nie udało się przeprowadzić symulacji świadczeń.' });
    }
  });

  app.post('/api/audit-pdf', async (req, res) => {
    try {
      const {
        fileName,
        mimeType,
        base64Data,
        textContent,
        pageImagesBase64,
        isScannedPdf,
        pageCount,
        params,
      } = req.body ?? {};

      const imageList: string[] = Array.isArray(pageImagesBase64)
        ? pageImagesBase64
            .filter((img): img is string => typeof img === 'string' && img.length > 0)
            .slice(0, 4)
        : [];
      const hasRawBinary = typeof base64Data === 'string' && base64Data.length > 0;
      const hasText = typeof textContent === 'string' && textContent.trim().length > 0;

      if (!hasRawBinary && !hasText && imageList.length === 0) {
        res.status(400).json({
          error: 'Wymagany jest plik PDF, obraz skanu albo treść tekstowa dokumentu.',
        });
        return;
      }

      const activeParams = resolveRequestParams(params);

      const ai = getAiClient();
      if (!ai) {
        if (!isScannedPdf && hasText && String(textContent).replace(/\s+/g, '').length >= 40) {
          const extracted = parseZusDocumentTextFallback(
            String(textContent),
            String(fileName || '')
          );
          const verdict = auditZusCase(extracted, activeParams);
          res.json({
            extracted,
            verdict,
            ocrMeta: {
              mode: 'TEXT_FALLBACK_NO_AI',
              confidence: 'SREDNIA',
              transcript: String(textContent).slice(0, 4000),
              warnings: [
                'Odczytano warstwę tekstową PDF lokalnie — brak klucza GEMINI_API_KEY po stronie serwera dla pełnej analizy AI.',
              ],
              pageCount: Number(pageCount) || 1,
            },
          });
          return;
        }

        res.status(503).json({
          error:
            'Brak skonfigurowanego klucza GEMINI_API_KEY po stronie serwera dla analizy OCR skanu. Możesz przetestować gotowe zestawy spraw poniżej lub skorygować dane ręcznie.',
        });
        return;
      }

      const detectedMode =
        typeof mimeType === 'string' && mimeType.startsWith('image/')
          ? 'IMAGE_OCR'
          : isScannedPdf
            ? 'SCAN_PDF_OCR'
            : 'TEXT_PDF_AI';

      const extractionPrompt = `Jesteś precyzyjnym silnikiem Vision OCR oraz ekstraktorem polskich dokumentów ZUS (ZAM, Z-3, Z-3a, ZAS-12, ZAS-53, Z-15A, Poświadczenie z PUE/eZUS oraz archiwalne druki sprzed 24.10.2026: ZUR, ZAO, Z-3b).
Przeanalizuj dokładnie załączone obrazy stron (skan może być lekko przekrzywiony, mieć pieczątki ZUS, pola wyboru [X]/[ ] lub pismo maszynowe/ręczne) oraz ewentualną warstwę tekstową.
Zasady OCR:
1. Przepisz wiernie najważniejsze odczytane linie i pola dokumentu do pola ocrTranscript (w języku polskim, bez zmyślania).
2. Wyodrębnij wyłącznie fakty widoczne w dokumencie (nie wymyślaj kwot, dni ani zadłużenia, jeśli ich nie widać; jeśli jakieś pole jest nieczytelne na skanie, wpisz ostrzeżenie do ocrWarnings).
3. Jeśli dokument dotyczy archiwalnego druku ZUR, ZAO lub Z-3b, zachowaj ten oryginalny symbol w polu formType.
4. Zwróć szczególną uwagę na: kod „B” (ciąża), liczbę dni ubezpieczenia chorobowego, ewentualne zadłużenie B2B w zł, przychód brutto / podstawę wymiaru, liczbę ubezpieczonych u płatnika oraz formę (UOP / B2B / ZLECENIE).
Nazwa pliku: ${String(fileName || 'dokument.pdf')}. Tryb wykryty na kliencie: ${detectedMode}.`;

      const contents: Array<Record<string, unknown>> = [{ text: extractionPrompt }];

      if (hasText) {
        contents.push({
          text: `Dodatkowa warstwa tekstowa wyodrębniona z PDF:\n${String(textContent).slice(0, 15000)}`,
        });
      }

      if (imageList.length > 0) {
        for (const imgBase64 of imageList) {
          contents.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: imgBase64,
            },
          });
        }
      }

      if (hasRawBinary && (!isScannedPdf || imageList.length === 0)) {
        contents.push({
          inlineData: {
            mimeType: typeof mimeType === 'string' && mimeType ? mimeType : 'application/pdf',
            data: base64Data,
          },
        });
      }

      let response;
      let lastAiError: unknown = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  formType: {
                    type: Type.STRING,
                    enum: VALID_FORMS,
                    description: 'Rozpoznany kod formularza ZUS',
                  },
                  applicantName: { type: Type.STRING },
                  insuredTitle: { type: Type.STRING, enum: VALID_TITLES },
                  payerInsuredCount: { type: Type.NUMBER },
                  insuranceDaysTotal: { type: Type.NUMBER },
                  gapBetweenPeriodsDays: { type: Type.NUMBER },
                  hasVoluntarySickness: { type: Type.BOOLEAN },
                  b2bDebtAmount: { type: Type.NUMBER },
                  monthlyGrossDeclared: { type: Type.NUMBER },
                  monthsInsuredLast12: { type: Type.NUMBER },
                  isPregnancyRelated: { type: Type.BOOLEAN },
                  usedSickDaysBeforePregnancy: { type: Type.NUMBER },
                  usedSickDaysWithCodeB: { type: Type.NUMBER },
                  hasSecondEmploymentTitle: { type: Type.BOOLEAN },
                  optOutSecondTitleL4_2027: { type: Type.BOOLEAN },
                  has10YearsMandatoryInsurance: { type: Type.BOOLEAN },
                  claimDaysAfterBirth: { type: Type.NUMBER },
                  submittedViaPue: { type: Type.BOOLEAN },
                  notes: { type: Type.STRING },
                  ocrTranscript: {
                    type: Type.STRING,
                    description: 'Czytelna transkrypcja OCR kluczowego tekstu i pól odczytanych ze skanu dokumentu',
                  },
                  ocrConfidence: {
                    type: Type.STRING,
                    enum: ['WYSOKA', 'SREDNIA', 'NISKA'],
                  },
                  ocrWarnings: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: [
                  'formType',
                  'applicantName',
                  'insuredTitle',
                  'payerInsuredCount',
                  'insuranceDaysTotal',
                  'hasVoluntarySickness',
                  'b2bDebtAmount',
                  'monthlyGrossDeclared',
                  'ocrTranscript',
                  'ocrConfidence',
                ],
              },
            },
          });
          lastAiError = null;
          break;
        } catch (aiErr) {
          lastAiError = aiErr;
          const errStr = aiErr instanceof Error ? aiErr.message : String(aiErr);
          const isTransient = /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand/i.test(errStr);
          if (isTransient && attempt === 0) {
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }
          break;
        }
      }

      if (lastAiError || !response) {
        const errStr = lastAiError instanceof Error ? lastAiError.message : String(lastAiError || '');
        const isTransient = /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand/i.test(errStr);
        if (hasText && String(textContent).replace(/\s+/g, '').length >= 40) {
          const extracted = parseZusDocumentTextFallback(
            String(textContent),
            String(fileName || '')
          );
          const verdict = auditZusCase(extracted, activeParams);
          res.json({
            extracted,
            verdict,
            ocrMeta: {
              mode: 'TEXT_FALLBACK_AI_BUSY',
              confidence: 'SREDNIA',
              transcript: String(textContent).slice(0, 4000),
              warnings: [
                'Serwer AI jest chwilowo przeciążony — dokument PDF odczytano deterministycznie z warstwy tekstowej.',
              ],
              pageCount: Number(pageCount) || 1,
            },
          });
          return;
        }
        res.status(isTransient ? 503 : 502).json({
          error: isTransient
            ? 'Usługa Vision OCR jest chwilowo bardzo obciążona (kod 503). Odczekaj kilka sekund i wgraj skan ponownie albo skoryguj pola ręcznie poniżej.'
            : 'Nie udało się odczytać dokumentu przez usługę AI. Możesz poprawić parametry ręcznie w panelu poniżej.',
        });
        return;
      }

      const rawText = response.text;
      if (!rawText) {
        res.status(502).json({ error: 'Model AI nie zwrócił danych strukturalnych z dokumentu.' });
        return;
      }

      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      const extracted = sanitizeAuditInput(parsed);
      const verdict = auditZusCase(extracted, activeParams);

      const ocrMeta = {
        mode: detectedMode,
        confidence:
          parsed.ocrConfidence === 'NISKA' || parsed.ocrConfidence === 'SREDNIA'
            ? parsed.ocrConfidence
            : 'WYSOKA',
        transcript: String(parsed.ocrTranscript || '').slice(0, 6000),
        warnings: Array.isArray(parsed.ocrWarnings)
          ? parsed.ocrWarnings.map((w) => String(w)).slice(0, 6)
          : [],
        pageCount: Number(pageCount) || Math.max(1, imageList.length),
      };

      res.json({ extracted, verdict, ocrMeta });
    } catch (error) {
      if (error instanceof ParamsValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Wystąpił nieoczekiwany błąd podczas analizy dokumentu PDF.' });
    }
  });

  app.post('/api/rag-chat', async (req, res) => {
    try {
      const { question, history, law2027Enabled } = req.body ?? {};
      if (typeof question !== 'string' || question.trim().length === 0) {
        res.status(400).json({ error: 'Pytanie nie może być puste.' });
        return;
      }
      if (question.length > 2000) {
        res.status(400).json({ error: 'Pytanie przekracza limit 2000 znaków.' });
        return;
      }

      const retrievedChunks = retrieveLegalChunks(question, 5);
      const groundedContext = retrievedChunks
        .map(
          (c, i) =>
            `[${i + 1}] ${c.article} (${c.sourceDoc}) — ${c.topic}\nTreść przepisu: ${c.excerpt}`
        )
        .join('\n\n');

      const ai = getAiClient();
      if (!ai) {
        const topChunks = retrievedChunks.slice(0, 3);
        const fallbackAnswer = topChunks
          .map((c) => `${c.topic} (${c.article}): ${c.excerpt}`)
          .join('\n\n');
        res.json({
          answer: `${fallbackAnswer}\n\n(Odpowiedź wygenerowana bezpośrednio z lokalnej bazy aktów prawnych — brak aktywnego klucza GEMINI_API_KEY na serwerze).`,
          citations: topChunks.map((c) => ({
            article: c.article,
            topic: c.topic,
            summary: c.excerpt,
          })),
          isFallback: true,
        });
        return;
      }

      const systemInstruction = `Jesteś „Asystentem Prawa ZUS” w aplikacji Kompas Rodzica ZUS.
Odpowiadasz wyłącznie po polsku, prostym, zrozumiałym i empatycznym językiem, bez zbędnego żargonu.
Stan przełącznika symulacji nowelizacji z 01.01.2027 r. (Dz.U. 2026 poz. 26): ${law2027Enabled ? 'WŁĄCZONY' : 'WYŁĄCZONY'}.
Opieraj odpowiedź WYŁĄCZNIE na poniższych fragmentach źródeł prawnych z bazy wiedzy aplikacji (nie wymyślaj kwot wyliczanych indywidualnie — jeśli pytanie wymaga wyliczenia konkretnej kwoty, wskaż regułę i skieruj użytkownika do Kalkulatora Osi Czasu):

${groundedContext}

Zwróć odpowiedź w JSON z polami: answer (zwięzła, czytelna odpowiedź bez znaczników markdown typu ** lub #) oraz citations (lista powołanych artykułów z powyższych źródeł).`;

      const historyText = Array.isArray(history)
        ? history
            .slice(-6)
            .map((h: { role?: string; text?: string }) => `${h.role === 'user' ? 'Użytkownik' : 'Asystent'}: ${String(h.text || '').slice(0, 600)}`)
            .join('\n')
        : '';

      const prompt = historyText
        ? `Historia rozmowy:\n${historyText}\n\nAktualne pytanie użytkownika: ${question.trim()}`
        : question.trim();

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: {
                type: Type.STRING,
                description: 'Zrozumiała odpowiedź w języku polskim bez formatowania markdown.',
              },
              citations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    article: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    summary: { type: Type.STRING },
                  },
                  required: ['article', 'topic', 'summary'],
                },
              },
            },
            required: ['answer', 'citations'],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        const topChunks = retrievedChunks.slice(0, 3);
        res.json({
          answer: topChunks.map((c) => `${c.topic}: ${c.excerpt}`).join('\n\n'),
          citations: topChunks.map((c) => ({
            article: c.article,
            topic: c.topic,
            summary: c.excerpt,
          })),
          isFallback: true,
        });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch {
      const q = String((req.body ?? {}).question || '');
      const topChunks = retrieveLegalChunks(q, 3);
      res.json({
        answer: `${topChunks.map((c) => `${c.topic} (${c.article}): ${c.excerpt}`).join('\n\n')}`,
        citations: topChunks.map((c) => ({
          article: c.article,
          topic: c.topic,
          summary: c.excerpt,
        })),
        isFallback: true,
      });
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: { server: httpServer },
        allowedHosts: true,
        ws: { server: httpServer },
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, HOST, () => {
    console.log(`Kompas Rodzica ZUS działa pod adresem http://localhost:${PORT}`);
  });
}

startServer();
