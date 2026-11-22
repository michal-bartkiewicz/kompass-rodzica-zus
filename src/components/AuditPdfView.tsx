import { useState } from 'react';
import AUDITOR_IMAGE from '../assets/images/tab_auditor_pdf_1795285878491.jpg';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSearch,
  FileUp,
  Loader2,
  ScanText,
  XCircle,
} from 'lucide-react';
import { CURATED_AUDIT_CASES } from '../engine/presets.ts';
import { auditZusCase } from '../engine/zusEngine.ts';
import type {
  AuditInput,
  AuditVerdict,
  FormType,
  InsuranceTitle,
  LegislativeParams,
} from '../engine/types.ts';
import { prepareAuditDocument } from '../utils/pdfScanRasterizer.ts';
import { downloadSampleAuditPdf } from '../utils/zusPdfGenerator.ts';

interface OcrMeta {
  mode: string;
  confidence: 'WYSOKA' | 'SREDNIA' | 'NISKA';
  transcript: string;
  warnings: string[];
  pageCount: number;
}

interface AuditPdfViewProps {
  params: LegislativeParams;
  onTransferToCalculator: (input: AuditInput) => void;
}

export function AuditPdfView({
  params,
  onTransferToCalculator,
}: AuditPdfViewProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    CURATED_AUDIT_CASES[0]!.id
  );
  const [currentInput, setCurrentInput] = useState<AuditInput>(
    CURATED_AUDIT_CASES[0]!.input
  );
  const [fileName, setFileName] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [serverVerdict, setServerVerdict] = useState<AuditVerdict | null>(null);
  const [scanPreviews, setScanPreviews] = useState<string[]>([]);
  const [ocrMeta, setOcrMeta] = useState<OcrMeta | null>(null);
  const [imgError, setImgError] = useState(false);

  const verdict = serverVerdict ?? auditZusCase(currentInput, params);
  const pageCountLabel =
    ocrMeta?.pageCount === 1
      ? 'strona'
      : ocrMeta && ocrMeta.pageCount < 5
        ? 'strony'
        : 'stron';
  const confidenceLabel =
    ocrMeta?.confidence === 'WYSOKA'
      ? 'wysoka'
      : ocrMeta?.confidence === 'SREDNIA'
        ? 'średnia'
        : 'niska';

  const updateInputField = <K extends keyof AuditInput>(
    key: K,
    value: AuditInput[K]
  ) => {
    setServerVerdict(null);
    setCurrentInput((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectCurated = (id: string) => {
    setSelectedCaseId(id);
    setServerVerdict(null);
    setErrorMsg(null);
    setFileName('');
    setScanPreviews([]);
    setOcrMeta(null);
    const found = CURATED_AUDIT_CASES.find((c) => c.id === id);
    if (found) {
      setCurrentInput(found.input);
    }
  };

  const handleFileUpload = async (file: File) => {
    setErrorMsg(null);
    setIsAnalyzing(true);
    setFileName(file.name);
    setScanPreviews([]);
    setOcrMeta(null);
    setStatusLabel('Renderuję strony i sprawdzam warstwę tekstową...');

    try {
      const prepared = await prepareAuditDocument(file);
      if (prepared.previewDataUrls.length > 0) {
        setScanPreviews(prepared.previewDataUrls);
      }

      setStatusLabel(
        prepared.isScannedPdf
          ? 'Wykryto skan (brak warstwy tekstowej) — uruchamiam Vision OCR...'
          : 'Analizuję dokument PDF i weryfikuję pola w silniku ZUS...'
      );

      const response = await fetch('/api/audit-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: prepared.fileName,
          mimeType: prepared.mimeType,
          base64Data: prepared.base64Data,
          textContent: prepared.extractedText,
          pageImagesBase64: prepared.pageImagesBase64,
          isScannedPdf: prepared.isScannedPdf,
          pageCount: prepared.pageCount,
          params,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Błąd analizy pliku PDF przez serwer.');
      }

      setCurrentInput(data.extracted);
      setServerVerdict(data.verdict);
      if (data.ocrMeta) {
        setOcrMeta(data.ocrMeta);
      }
      setSelectedCaseId('custom-upload');
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Nie udało się przeanalizować pliku PDF.'
      );
    } finally {
      setIsAnalyzing(false);
      setStatusLabel('');
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-[#DCECE3] bg-white p-6">
        <div className="grid items-stretch gap-6 lg:grid-cols-12">
          <div className="flex flex-col justify-center space-y-2 lg:col-span-8">
            <h1 className="font-display text-2xl font-bold text-[#0F172A] [text-wrap:balance]">
              Audytor PDF i Tester Spraw ZUS
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#475569]">
              Wgraj zanonimizowany dokument do demonstracyjnego audytu albo wybierz jeden z syntetycznych zestawów testowych. Gemini odczytuje pola dokumentu, a kwoty i werdykt oblicza deterministyczny silnik reguł.
            </p>
          </div>
          <div className="lg:col-span-4">
            {!imgError ? (
              <img
                src={AUDITOR_IMAGE}
                alt="Pastelowa ilustracja zielonej lupy, kompasu oraz dokumentów zasiłkowych i bucików dziecięcych"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-36 w-full rounded-xl border border-[#DCECE3] object-cover lg:h-full lg:max-h-40"
              />
            ) : (
              <div className="flex h-36 items-center justify-center rounded-xl border border-[#DCECE3] bg-[#F2FBF6] lg:h-full">
                <FileSearch className="h-10 w-10 text-[#00703C]" />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 5 cols: Upload & Curated Test Cases */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-2xl border border-[#DCECE3] bg-white p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">
              1. Wgraj zanonimizowany PDF, skan lub zdjęcie
            </h2>
            <div className="rounded-lg border border-[#FCD34D] bg-[#FFFBEB] p-3 text-xs leading-relaxed text-[#78350F]">
              Plik, wyodrębniony tekst i obrazy stron są przesyłane do serwera tej aplikacji. Jeśli serwer ma skonfigurowany Gemini, jego usługa otrzyma treść do analizy OCR. Używaj wyłącznie dokumentów syntetycznych lub pozbawionych danych osobowych.
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-7 text-center transition-colors hover:border-[#00703C] hover:bg-[#ECFDF5]/40">
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-[#00703C]" />
                  <span className="mt-2 text-sm font-semibold text-[#0F172A]">
                    {statusLabel || `Analizuję dokument ${fileName}...`}
                  </span>
                </>
              ) : (
                <>
                  <FileUp className="h-8 w-8 text-[#00703C]" />
                  <span className="mt-2 text-sm font-semibold text-[#0F172A]">
                    Wybierz plik PDF (również skan) lub zdjęcie dokumentu
                  </span>
                  <span className="mt-1 text-xs text-[#475569]">
                    Obsługuje skany bez warstwy tekstowej (PDF, JPG, PNG, WebP) · Druki: ZAM, Z-3, Z-3a, ZAS-12, ZAS-53, Z-3b, ZUR, ZAO
                  </span>
                </>
              )}
              <input
                type="file"
                accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={isAnalyzing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </label>

            <div className="space-y-2 border-t border-[#E2E8F0] pt-3">
              <div className="text-xs font-semibold text-[#475569]">
                Nie masz pliku pod ręką? Pobierz syntetyczny PDF demo do przetestowania funkcjonalności:
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadSampleAuditPdf('Z-3b')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#0F172A] transition-colors hover:bg-[#ECFDF5] hover:border-[#00703C]"
                >
                  <Download className="h-3.5 w-3.5 text-[#00703C]" />
                  <span>Przykładowy PDF: Z-3b (B2B)</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadSampleAuditPdf('ZAS-53')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#0F172A] transition-colors hover:bg-[#ECFDF5] hover:border-[#00703C]"
                >
                  <Download className="h-3.5 w-3.5 text-[#00703C]" />
                  <span>Przykładowy PDF: ZAS-53 (L4 ciąża)</span>
                </button>
              </div>
            </div>

            {scanPreviews.length > 0 && (
              <div className="space-y-2 border-t border-[#E2E8F0] pt-3">
                <div className="text-xs font-semibold text-[#0F172A]">
                  Podgląd wgranego dokumentu ({scanPreviews.length} str.):
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {scanPreviews.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Podgląd strony ${idx + 1} wgranego dokumentu`}
                      className="h-36 w-full rounded-lg border border-[#CBD5E1] bg-white object-contain"
                    />
                  ))}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-medium text-[#991B1B]">
                {errorMsg}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#DCECE3] bg-white p-6 space-y-3">
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">
              2. Syntetyczne zestawy testowe
            </h2>
            <p className="text-xs leading-relaxed text-[#64748B]">
              To przykłady utworzone w aplikacji, a nie akta ani zanonimizowane sprawy przekazane przez ZUS.
            </p>
            <div className="space-y-2">
              {CURATED_AUDIT_CASES.map((testCase) => {
                const isSelected = selectedCaseId === testCase.id;
                return (
                  <button
                    key={testCase.id}
                    type="button"
                    onClick={() => handleSelectCurated(testCase.id)}
                    className={`w-full rounded-lg border p-3.5 text-left transition-colors ${
                      isSelected
                        ? 'border-[#00703C] bg-[#ECFDF5]/60'
                        : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[#0F172A]">
                      {testCase.label}
                    </div>
                    <p className="mt-1 text-xs text-[#475569]">
                      {testCase.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right 7 cols: Verdict, Extracted Data & Audit Trail */}
        <div className="lg:col-span-7 space-y-6">
          {/* Abolished Form Alert (24.10.2026) */}
          {verdict.legacyFormNotice && (
            <section className="rounded-xl border border-[#F59E0B] bg-[#FFFBEB] p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#B45309]" />
                <div>
                  <h3 className="font-display text-sm font-bold text-[#92400E]">
                    Aktualizacja formularzy ZUS (24.10.2026 r.) — automatyczne mapowanie na {verdict.legacyFormMappedTo}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#78350F]">
                    {verdict.legacyFormNotice}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Verdict Header */}
          <section className="rounded-2xl border border-[#DCECE3] bg-white p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[#475569]">
                  Werdykt silnika deterministycznego ·{' '}
                  {selectedCaseId !== 'custom-upload'
                    ? 'Profil demonstracyjny (dane syntetyczne)'
                    : currentInput.applicantName}
                </div>
                <div className="mt-1 flex items-center gap-2.5">
                  {verdict.verdict === 'MA PRAWO' ? (
                    <CheckCircle2 className="h-7 w-7 text-[#00703C]" />
                  ) : verdict.verdict === 'BRAK PRAWA' ? (
                    <XCircle className="h-7 w-7 text-[#B91C1C]" />
                  ) : (
                    <AlertTriangle className="h-7 w-7 text-[#B45309]" />
                  )}
                  <span
                    className={`font-display text-2xl font-bold ${
                      verdict.verdict === 'MA PRAWO'
                        ? 'text-[#00703C]'
                        : verdict.verdict === 'BRAK PRAWA'
                          ? 'text-[#B91C1C]'
                          : 'text-[#B45309]'
                    }`}
                  >
                    {verdict.verdict}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onTransferToCalculator(currentInput)}
                className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[#00703C] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#005A30]"
              >
                Przenieś dane do Kalkulatora
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-[#E2E8F0] pt-4 sm:grid-cols-4">
              <div>
                <div className="text-xs text-[#475569]">Rozpoznany druk</div>
                <div className="font-mono text-base font-bold text-[#0F172A]">
                  {currentInput.formType}
                  {verdict.legacyFormMappedTo ? ` → ${verdict.legacyFormMappedTo}` : ''}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#475569]">Płatnik zasiłku</div>
                <div className="text-base font-bold text-[#0F172A]">
                  {verdict.payer}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#475569]">Podstawa wymiaru</div>
                <div className="font-mono text-base font-bold tabular-nums text-[#0F172A]">
                  {verdict.estimatedBase.toLocaleString('pl-PL', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  zł
                </div>
              </div>
              <div>
                <div className="text-xs text-[#475569]">Szac. netto (81,5%)</div>
                <div className="font-mono text-base font-bold tabular-nums text-[#00703C]">
                  {verdict.estimatedMonthlyNet815.toLocaleString('pl-PL', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  zł
                </div>
              </div>
            </div>
          </section>

          {/* Step-by-step Audit Trail */}
          <section className="rounded-2xl border border-[#DCECE3] bg-white p-5 sm:p-6">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 marker:hidden focus-visible:rounded-xl">
                <span className="flex items-center gap-2">
                  <FileSearch className="h-5 w-5 text-[#00703C]" />
                  <span>
                    <span className="block font-display text-base font-semibold text-[#0F172A]">
                      Jak powstał wynik?
                    </span>
                    <span className="mt-1 block text-xs text-[#64748B]">
                      Zobacz sprawdzone warunki i podstawy prawne
                    </span>
                  </span>
                </span>
                <span className="rounded-full border border-[#DCECE3] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#475569] group-open:hidden">
                  Pokaż
                </span>
                <span className="hidden rounded-full border border-[#DCECE3] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#475569] group-open:inline-flex">
                  Ukryj
                </span>
              </summary>

              <div className="mt-4 divide-y divide-[#E2E8F0] border-t border-[#E2E8F0] pt-2">
                {verdict.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    {step.passed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#00703C]" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#B91C1C]" />
                    )}
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-semibold text-[#0F172A]">
                          {step.step}
                        </span>
                        <span className="text-xs text-[#475569]">· {step.article}</span>
                      </div>
                      <p className="text-xs text-[#475569]">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </section>

          {/* Live Editable Extracted Parameters */}
          <section className="rounded-2xl border border-[#DCECE3] bg-white p-5 sm:p-6">
            <details className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 marker:hidden focus-visible:rounded-xl">
                <span>
                  <span className="block font-display text-base font-semibold text-[#0F172A]">
                    Sprawdź lub popraw rozpoznane dane
                  </span>
                  <span className="mt-1 block text-xs text-[#64748B]">
                    {currentInput.formType} · {currentInput.insuredTitle} · zmiany odświeżają wynik od razu
                  </span>
                </span>
                <span className="rounded-full border border-[#DCECE3] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#475569] group-open:hidden">
                  Pokaż pola
                </span>
                <span className="hidden rounded-full border border-[#DCECE3] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#475569] group-open:inline-flex">
                  Ukryj pola
                </span>
              </summary>

              <div className="mt-4 space-y-4 border-t border-[#E2E8F0] pt-4">

            <div className="grid grid-cols-2 gap-4 border-t border-[#E2E8F0] pt-4 text-xs sm:grid-cols-3">
              <div>
                <label className="block font-semibold text-[#475569]">
                  Rodzaj druku
                  <select
                    value={currentInput.formType}
                    onChange={(e) =>
                      updateInputField('formType', e.target.value as FormType)
                    }
                    className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0F172A]"
                  >
                    <option value="ZAM">ZAM (zasiłek macierzyński)</option>
                    <option value="ZAS-53">ZAS-53 (zasiłek chorobowy)</option>
                    <option value="Z-3">Z-3 (pracodawca UoP)</option>
                    <option value="Z-3a">Z-3a (zleceniodawca)</option>
                    <option value="Z-3b">Z-3b (historyczny B2B)</option>
                    <option value="ZUR">ZUR (historyczny rodzic.)</option>
                    <option value="ZAO">ZAO (historyczny ojcowski)</option>
                    <option value="ZAS-12">ZAS-12 (zaświadczenie)</option>
                    <option value="POSWIADCZENIE">Poświadczenie PUE</option>
                  </select>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-[#475569]">
                  Tytuł ubezpieczenia
                  <select
                    value={currentInput.insuredTitle}
                    onChange={(e) =>
                      updateInputField('insuredTitle', e.target.value as InsuranceTitle)
                    }
                    className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0F172A]"
                  >
                    <option value="UOP">UOP (umowa o pracę)</option>
                    <option value="B2B">B2B (działalność)</option>
                    <option value="ZLECENIE">ZLECENIE</option>
                    <option value="BRAK">BRAK ubezpieczenia</option>
                  </select>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-[#475569]">
                  Przychód / podstawa brutto (zł)
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={currentInput.monthlyGrossDeclared}
                    onChange={(e) =>
                      updateInputField(
                        'monthlyGrossDeclared',
                        Math.max(0, Number(e.target.value) || 0)
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums text-[#0F172A]"
                  />
                </label>
              </div>

              <div>
                <label className="block font-semibold text-[#475569]">
                  Zadłużenie składek B2B (zł)
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={currentInput.b2bDebtAmount}
                    onChange={(e) =>
                      updateInputField(
                        'b2bDebtAmount',
                        Math.max(0, Number(e.target.value) || 0)
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums text-[#0F172A]"
                  />
                </label>
              </div>

              <div>
                <label className="block font-semibold text-[#475569]">
                  Staż ubezpieczenia (dni)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={currentInput.insuranceDaysTotal}
                    onChange={(e) =>
                      updateInputField(
                        'insuranceDaysTotal',
                        Math.max(0, Number(e.target.value) || 0)
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums text-[#0F172A]"
                  />
                </label>
              </div>

              <div>
                <label className="block font-semibold text-[#475569]">
                  Przerwa między okresami (dni)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={currentInput.gapBetweenPeriodsDays}
                    onChange={(e) =>
                      updateInputField(
                        'gapBetweenPeriodsDays',
                        Math.max(0, Number(e.target.value) || 0)
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums text-[#0F172A]"
                  />
                </label>
              </div>

              <div>
                <label className="block font-semibold text-[#475569]">
                  Liczba ubezpieczonych u płatnika
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={currentInput.payerInsuredCount}
                    onChange={(e) =>
                      updateInputField(
                        'payerInsuredCount',
                        Math.max(1, Number(e.target.value) || 1)
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums text-[#0F172A]"
                  />
                </label>
              </div>

              <div>
                <label className="block font-semibold text-[#475569]">
                  Dzień złożenia po porodzie
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={currentInput.claimDaysAfterBirth}
                    onChange={(e) =>
                      updateInputField(
                        'claimDaysAfterBirth',
                        Math.max(0, Number(e.target.value) || 0)
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums text-[#0F172A]"
                  />
                </label>
              </div>

              <div>
                <label className="block font-semibold text-[#475569]">
                  Wykorzystane dni L4 (kod B)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={currentInput.usedSickDaysWithCodeB}
                    onChange={(e) =>
                      updateInputField(
                        'usedSickDaysWithCodeB',
                        Math.max(0, Number(e.target.value) || 0)
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums text-[#0F172A]"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 border-t border-[#E2E8F0] pt-3 text-xs text-[#0F172A]">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentInput.hasVoluntarySickness}
                  onChange={(e) =>
                    updateInputField('hasVoluntarySickness', e.target.checked)
                  }
                  className="h-4 w-4 accent-[#00703C]"
                />
                <span>Składka chorobowa opłacana</span>
              </label>

              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentInput.isPregnancyRelated}
                  onChange={(e) =>
                    updateInputField('isPregnancyRelated', e.target.checked)
                  }
                  className="h-4 w-4 accent-[#00703C]"
                />
                <span>Związane z ciążą / porodem (kod B)</span>
              </label>

              {currentInput.insuredTitle === 'UOP' && (
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(currentInput.has10YearsMandatoryInsurance)}
                    onChange={(e) =>
                      updateInputField(
                        'has10YearsMandatoryInsurance',
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 accent-[#00703C]"
                  />
                  <span>Min. 10 lat ubezp. obowiązkowego (art. 4 ust. 3 pkt 3)</span>
                </label>
              )}

              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentInput.submittedViaPue}
                  onChange={(e) =>
                    updateInputField('submittedViaPue', e.target.checked)
                  }
                  className="h-4 w-4 accent-[#00703C]"
                />
                <span>Złożono elektronicznie (PUE/eZUS)</span>
              </label>
            </div>
              </div>
            </details>
          </section>

          {ocrMeta && (
            <section className="rounded-2xl border border-[#DCECE3] bg-white p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ScanText className="h-5 w-5 text-[#00703C]" />
                  <h2 className="font-display text-base font-semibold text-[#0F172A]">
                    Odczyt dokumentu
                  </h2>
                </div>
                <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#166534]">
                  {ocrMeta.pageCount} {pageCountLabel} · czytelność {confidenceLabel}
                </span>
              </div>

              {ocrMeta.warnings.length > 0 && (
                <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#92400E] space-y-1">
                  <div className="font-bold">Uwagi do czytelności skanu:</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {ocrMeta.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {ocrMeta.transcript && (
                <details className="group rounded-xl border border-[#E2E8F0] bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[#475569] marker:hidden focus-visible:rounded-xl">
                    <span>Opcje zaawansowane · pokaż rozpoznany tekst</span>
                    <span className="text-xs font-medium text-[#64748B] group-open:hidden">Pokaż</span>
                    <span className="hidden text-xs font-medium text-[#64748B] group-open:inline">Ukryj</span>
                  </summary>
                  <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap border-t border-[#E2E8F0] bg-[#F8FAFC] p-4 font-mono text-xs leading-relaxed text-[#334155]">
                    {ocrMeta.transcript}
                  </pre>
                </details>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

