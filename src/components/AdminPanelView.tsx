import { useState } from 'react';
import ADMIN_SCALES_IMAGE from '../assets/images/tab_admin_scales_1795285878515.jpg';
import { Check, RotateCcw, Scale, ShieldCheck } from 'lucide-react';
import { DEFAULT_2026_PARAMS } from '../engine/presets.ts';
import type { LegislativeParams } from '../engine/types.ts';

interface AdminPanelViewProps {
  params: LegislativeParams;
  onChangeParams: (next: LegislativeParams) => void;
}

export function AdminPanelView({ params, onChangeParams }: AdminPanelViewProps) {
  const [imgError, setImgError] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const persistParams = async (next: LegislativeParams, label = 'Zapisano na serwerze') => {
    onChangeParams(next);
    setSaveError(null);
    try {
      const response = await fetch('/api/params', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!response.ok) {
        throw new Error('Błąd zapisu parametrów.');
      }
      setSaveMessage(label);
    } catch {
      setSaveError('Zmiana działa lokalnie — nie udało się zapisać na serwerze.');
    }
  };

  const resetParams = async () => {
    setSaveError(null);
    onChangeParams(DEFAULT_2026_PARAMS);
    try {
      const response = await fetch('/api/params/reset', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        if (data?.params) {
          onChangeParams(data.params);
        }
        setSaveMessage('Przywrócono i zapisano stan prawny listopad 2026');
      } else {
        throw new Error('Reset failed');
      }
    } catch {
      setSaveError('Przywrócono lokalnie — nie udało się zresetować pliku serwera.');
    }
  };

  const updateField = <K extends keyof LegislativeParams>(
    key: K,
    value: LegislativeParams[K]
  ) => {
    void persistParams({ ...params, [key]: value });
  };

  const minBasePreview = (
    params.minWage *
    (1 - params.socialDeductionRate)
  ).toFixed(2);
  const maxGross250Preview = (
    params.avgForecastSalary * params.b2bCapMultiplier
  ).toFixed(2);
  const maxBase250Preview = (
    Number(maxGross250Preview) *
    (1 - params.socialDeductionRate)
  ).toFixed(2);
  const debtThresholdPreview = (
    (params.minWage * params.b2bDebtThresholdPct) /
    100
  ).toFixed(2);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-[#DCECE3] bg-white p-6">
        <div className="grid items-stretch gap-6 lg:grid-cols-12">
          <div className="flex flex-col justify-center space-y-3 lg:col-span-8">
            <h1 className="font-display text-2xl font-bold text-[#0F172A] [text-wrap:balance]">
              Panel Legislacyjny i Parametry Systemowe
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#475569]">
              Wszystkie progi ustawowe, wskaźniki waloryzacji i stawki zasiłkowe są parametryzowane bez ingerencji w kod silnika i zapisywane po stronie serwera.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={resetParams}
                className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Przywróć stan prawny listopad 2026</span>
              </button>
              {saveMessage && !saveError && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00703C]">
                  <Check className="h-3.5 w-3.5" />
                  <span>{saveMessage}</span>
                </span>
              )}
              {saveError && (
                <span className="text-xs font-semibold text-[#B91C1C]">
                  {saveError}
                </span>
              )}
            </div>
          </div>
          <div className="lg:col-span-4">
            {!imgError ? (
              <img
                src={ADMIN_SCALES_IMAGE}
                alt="Pastelowa ilustracja wagi sprawiedliwości, kalendarza i zielonej rośliny symbolizującej prawo rodzinne"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-36 w-full rounded-xl border border-[#DCECE3] object-cover lg:h-full lg:max-h-40"
              />
            ) : (
              <div className="flex h-36 items-center justify-center rounded-xl border border-[#DCECE3] bg-[#F2FBF6] lg:h-full">
                <Scale className="h-10 w-10 text-[#00703C]" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2027 Law Toggle Banner */}
      <section className="rounded-2xl border border-[#DCECE3] bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
              <Scale className="h-4 w-4 text-[#00703C]" />
              <span>Symulacja Przyszłego Prawa (nowelizacja od 01.01.2027 r.)</span>
            </div>
            <p className="text-sm text-[#475569]">
              Włącza reguły Dz.U. z 2026 r. poz. 26: art. 17 ust. 1d–1e (możliwość wykonywania pracy zarobkowej z drugiego odmiennego tytułu w trakcie e-ZLA po oświadczeniu płatnikowi) oraz art. 9 ust. 4 (wspólny okres zasiłkowy dla wielu tytułów).
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-3 shrink-0">
            <input
              type="checkbox"
              checked={params.enable2027Law}
              onChange={(e) => {
                const enabled = e.target.checked;
                void persistParams(
                  {
                    ...params,
                    enable2027Law: enabled,
                    yearLabel: enabled
                      ? 'Symulacja: Styczeń 2027 (Dz.U. 2026 poz. 26)'
                      : DEFAULT_2026_PARAMS.yearLabel,
                  },
                  enabled
                    ? 'Zapisano na serwerze: tryb 2027'
                    : 'Zapisano na serwerze: tryb 2026'
                );
              }}
              className="h-5 w-5 rounded border-[#CBD5E1] accent-[#00703C]"
            />
            <span className="text-sm font-semibold text-[#0F172A]">
              {params.enable2027Law ? 'Aktywna (2027)' : 'Wyłączona (2026)'}
            </span>
          </label>
        </div>
      </section>

      {/* Parameter Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#DCECE3] bg-white p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">
            Wskaźniki płacowe i progi ZUS
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Płaca minimalna (zł brutto)
              </label>
              <input
                type="number"
                step="1"
                value={params.minWage}
                onChange={(e) => updateField('minWage', Number(e.target.value) || 0)}
                className="mt-1.5 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
              <p className="mt-1 text-xs text-[#475569] tabular-nums">
                Min. podstawa UoP: {minBasePreview} zł · Próg długu 1%: {debtThresholdPreview} zł
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Prognozowane przeciętne wynagr. (zł)
              </label>
              <input
                type="number"
                step="1"
                value={params.avgForecastSalary}
                onChange={(e) =>
                  updateField('avgForecastSalary', Number(e.target.value) || 0)
                }
                className="mt-1.5 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
              <p className="mt-1 text-xs text-[#475569] tabular-nums">
                Limit 250%: {maxGross250Preview} zł brutto ({maxBase250Preview} zł podstawa)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Potrącenie składek społecznych (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={(params.socialDeductionRate * 100).toFixed(2)}
                onChange={(e) =>
                  updateField('socialDeductionRate', (Number(e.target.value) || 0) / 100)
                }
                className="mt-1.5 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Próg zadłużenia B2B (% płacy min.)
              </label>
              <input
                type="number"
                step="0.1"
                value={params.b2bDebtThresholdPct}
                onChange={(e) =>
                  updateField('b2bDebtThresholdPct', Number(e.target.value) || 0)
                }
                className="mt-1.5 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Próg płatnika składek (osoby na 30.11)
              </label>
              <input
                type="number"
                step="1"
                value={params.payerInsuredThreshold}
                onChange={(e) =>
                  updateField('payerInsuredThreshold', Number(e.target.value) || 20)
                }
                className="mt-1.5 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Zasiłek pogrzebowy (zł)
              </label>
              <input
                type="number"
                step="100"
                value={params.funeralBenefit}
                onChange={(e) =>
                  updateField('funeralBenefit', Number(e.target.value) || 0)
                }
                className="mt-1.5 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#DCECE3] bg-white p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">
            Stawki procentowe i progi PIT
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Wariant uśredniony 21 dni (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={(params.rateCombined815 * 100).toFixed(1)}
                onChange={(e) =>
                  updateField('rateCombined815', (Number(e.target.value) || 0) / 100)
                }
                className="mt-1.5 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Urlop rodzicielski / 9 tyg. (%)
              </label>
              <input
                type="number"
                step="1"
                value={(params.rateParental70 * 100).toFixed(0)}
                onChange={(e) =>
                  updateField('rateParental70', (Number(e.target.value) || 0) / 100)
                }
                className="mt-1.5 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Świadczenie rodzicielskie min. (zł netto)
              </label>
              <input
                type="number"
                step="50"
                value={params.parentalBenefitFloorNet}
                onChange={(e) =>
                  updateField('parentalBenefitFloorNet', Number(e.target.value) || 0)
                }
                className="mt-1.5 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Zaliczka PIT I próg (%)
              </label>
              <input
                type="number"
                step="1"
                value={(params.pitRate * 100).toFixed(0)}
                onChange={(e) =>
                  updateField('pitRate', (Number(e.target.value) || 0) / 100)
                }
                className="mt-1.5 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Próg II skali PIT rocznie (zł)
              </label>
              <input
                type="number"
                step="5000"
                value={params.pitThreshold ?? 120000}
                onChange={(e) =>
                  updateField('pitThreshold', Math.max(0, Number(e.target.value) || 0))
                }
                className="mt-1.5 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Zaliczka PIT II próg (%)
              </label>
              <input
                type="number"
                step="1"
                value={((params.pitHigherRate ?? 0.32) * 100).toFixed(0)}
                onChange={(e) =>
                  updateField('pitHigherRate', (Number(e.target.value) || 0) / 100)
                }
                className="mt-1.5 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
            </div>
          </div>

          <div className="border-t border-[#E2E8F0] pt-4 text-sm text-[#334155]">
            <div className="flex items-center gap-2 font-semibold text-[#0F172A]">
              <ShieldCheck className="h-4 w-4 text-[#00703C]" />
              <span>Rejestr zmian formularzy ZUS</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#475569]">
              Stan prawny uwzględnia likwidację druków ZUR, ZAO i Z-3b od 24.10.2026 r. (zastąpionych wnioskiem ZAM) oraz zwolnienie z papierowego odpisu aktu urodzenia na mocy § 13 ust. 2–4 rozporządzenia z 27.09.2026 r.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

