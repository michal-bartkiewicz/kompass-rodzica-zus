import { useEffect, useMemo, useState } from 'react';
import FAMILY_TIMELINE_IMAGE from '../assets/images/card_family_timeline_1795277721814.jpg';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CloudDownload,
  Download,
  Edit3,
  FileText,
  Info,
  Lock,
  LogIn,
  Printer,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  ANONYMOUS_EMPTY_PERSONA,
  ANONYMOUS_MANUAL_DAD,
  ANONYMOUS_MANUAL_MOM,
  PERSONA_PROFILES,
} from '../engine/presets.ts';
import {
  evaluateRiskRadar,
  simulateDualParentPlan,
} from '../engine/zusEngine.ts';
import type {
  InsuranceTitle,
  LegislativeParams,
  ParentInput,
  ScenarioConfig,
  ScenarioType,
} from '../engine/types.ts';
import {
  buildOfficialFormSpec,
  resolveDefaultFormKind,
} from '../utils/officialForms.ts';
import { PrintableFormSheet } from './PrintableFormSheet.tsx';
import type { AuthSession } from './ZusLoginModal.tsx';

interface CalculatorViewProps {
  mom: ParentInput;
  dad: ParentInput;
  scenario: ScenarioConfig;
  params: LegislativeParams;
  activePersonaId: string;
  authSession: AuthSession;
  onOpenLoginModal: () => void;
  onSelectPersona: (id: string) => void;
  onChangeMom: (next: ParentInput) => void;
  onChangeDad: (next: ParentInput) => void;
  onChangeScenario: (next: ScenarioConfig) => void;
  onGoToDocuments: () => void;
  onGoToCalmMode: () => void;
}

const SCENARIO_OPTIONS: { id: ScenarioType; label: string }[] = [
  { id: 'STANDARD', label: 'Poród standardowy' },
  { id: 'PREGNANCY_SICKNESS', label: 'W ciąży: L4 kod B / przed porodem' },
  { id: 'PRETERM_HOSPITAL', label: 'Wcześniak / szpital (art. 180² KP)' },
  { id: 'ADOPTION', label: 'Adopcja (przysposobienie do 14 lat)' },
  { id: 'FOSTER_CARE', label: 'Rodzina zastępcza niezawodowa (do 7/10 lat)' },
  { id: 'MOTHER_CRISIS', label: 'Przejęcie opieki (choroba matki)' },
  { id: 'STILLBIRTH', label: 'Urodzenie martwe (8 tyg. + 7 000 zł)' },
];

function formatPln(val: number): string {
  return `${val.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} zł`;
}

function ParentConfigBlock({
  label,
  parent,
  onChange,
}: {
  label: string;
  parent: ParentInput;
  onChange: (next: ParentInput) => void;
}) {
  const update = <K extends keyof ParentInput>(key: K, val: ParentInput[K]) => {
    onChange({ ...parent, [key]: val });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#DCECE3] pb-2">
        <span className="font-display text-base font-bold text-[#0F172A]">
          {label}: {parent.name}
        </span>
        <span className="text-xs font-medium text-[#64748B]">
          {parent.title === 'UOP'
            ? `Płatnik: ${parent.payerInsuredCount} os.`
            : parent.title}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-[#475569]">
            Imię i nazwisko
          </label>
          <input
            type="text"
            value={parent.name}
            onChange={(e) => update('name', e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#475569]">
            Tytuł ubezpieczenia
          </label>
          <select
            value={parent.title}
            onChange={(e) => update('title', e.target.value as InsuranceTitle)}
            className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A]"
          >
            <option value="UOP">Umowa o pracę (UoP)</option>
            <option value="B2B">Działalność gospodarcza (B2B)</option>
            <option value="ZLECENIE">Umowa zlecenia</option>
            <option value="BRAK">Brak ubezpieczenia chorobowego</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#475569]">
            {parent.title === 'B2B'
              ? 'Podstawa składek brutto (zł)'
              : 'Średnie wynagrodzenie brutto (zł)'}
          </label>
          <input
            type="number"
            min={0}
            step={100}
            value={parent.monthlyGross}
            onChange={(e) => update('monthlyGross', Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm tabular-nums text-[#0F172A]"
          />
        </div>

        {parent.title === 'UOP' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-[#475569]">
                Liczba ubezpieczonych w firmie (30.11)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={parent.payerInsuredCount}
                onChange={(e) =>
                  update('payerInsuredCount', Number(e.target.value) || 1)
                }
                className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569]">
                Premie kwartalne (suma 4 kw.)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={parent.quarterlyBonusesTotal}
                onChange={(e) =>
                  update('quarterlyBonusesTotal', Number(e.target.value) || 0)
                }
                className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569]">
                Premia roczna (doliczana w 1/12)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={parent.annualBonus}
                onChange={(e) =>
                  update('annualBonus', Number(e.target.value) || 0)
                }
                className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
            </div>

            <div className="sm:col-span-2 flex flex-wrap gap-4 pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#334155]">
                <input
                  type="checkbox"
                  checked={parent.fteChangedRecently}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onChange({
                      ...parent,
                      fteChangedRecently: checked,
                      newFteGross: checked
                        ? parent.newFteGross ?? Math.round(parent.monthlyGross * 0.5)
                        : parent.newFteGross,
                    });
                  }}
                  className="h-4 w-4 accent-[#00703C]"
                />
                <span>Zmiana etatu w ostatnich 12 mies. (art. 40)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#334155]">
                <input
                  type="checkbox"
                  checked={parent.fixedTermContract}
                  onChange={(e) => update('fixedTermContract', e.target.checked)}
                  className="h-4 w-4 accent-[#00703C]"
                />
                <span>Umowa na czas określony</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#334155]">
                <input
                  type="checkbox"
                  checked={Boolean(parent.has10YearsMandatoryInsurance)}
                  onChange={(e) =>
                    update('has10YearsMandatoryInsurance', e.target.checked)
                  }
                  className="h-4 w-4 accent-[#00703C]"
                />
                <span>Min. 10 lat ubezp. (brak 30 d. wyczekiwania)</span>
              </label>
            </div>
          </>
        )}

        {parent.title === 'UOP' && parent.fteChangedRecently && (
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#475569]">
              Wynagrodzenie brutto po zmianie etatu (art. 40)
            </label>
            <input
              type="number"
              min={0}
              step={100}
              value={parent.newFteGross ?? parent.monthlyGross}
              onChange={(e) => update('newFteGross', Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm tabular-nums text-[#0F172A]"
            />
          </div>
        )}

        {(parent.title === 'B2B' || parent.title === 'ZLECENIE') && (
          <>
            <div>
              <label className="block text-xs font-semibold text-[#475569]">
                Miesiące ubezpieczenia (z 12)
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={parent.monthsInsuredLast12}
                onChange={(e) =>
                  update('monthsInsuredLast12', Number(e.target.value) || 1)
                }
                className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569]">
                Dni dobrowolnego chorobowego
              </label>
              <input
                type="number"
                min={0}
                max={1000}
                value={parent.voluntarySicknessDays}
                onChange={(e) =>
                  update('voluntarySicknessDays', Math.max(0, Number(e.target.value) || 0))
                }
                className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm tabular-nums text-[#0F172A]"
              />
            </div>

            {parent.title === 'B2B' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#475569]">
                    Wariant składek B2B (art. 48a)
                  </label>
                  <select
                    value={parent.b2bContributionTier ?? 'STANDARD_60'}
                    onChange={(e) =>
                      update(
                        'b2bContributionTier',
                        e.target.value as 'STANDARD_60' | 'PREFERENTIAL_30'
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A]"
                  >
                    <option value="STANDARD_60">Standardowy ZUS (60% prognoz.)</option>
                    <option value="PREFERENTIAL_30">Preferencyjny Mały ZUS (30% min.)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569]">
                    Zaległość na koncie ZUS (zł)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={parent.b2bDebtAmount}
                    onChange={(e) =>
                      update('b2bDebtAmount', Number(e.target.value) || 0)
                    }
                    className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm tabular-nums text-[#0F172A]"
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2 flex flex-wrap gap-4 pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#334155]">
                <input
                  type="checkbox"
                  checked={parent.hasVoluntarySickness}
                  onChange={(e) => update('hasVoluntarySickness', e.target.checked)}
                  className="h-4 w-4 accent-[#00703C]"
                />
                <span>Opłacana dobrowolna składka chorobowa</span>
              </label>

              {parent.title === 'B2B' && (
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#334155]">
                  <input
                    type="checkbox"
                    checked={parent.isUlgaNaStart}
                    onChange={(e) => update('isUlgaNaStart', e.target.checked)}
                    className="h-4 w-4 accent-[#00703C]"
                  />
                  <span>Aktywna Ulga na start</span>
                </label>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function CalculatorView({
  mom,
  dad,
  scenario,
  params,
  activePersonaId,
  authSession,
  onOpenLoginModal,
  onSelectPersona,
  onChangeMom,
  onChangeDad,
  onChangeScenario,
  onGoToDocuments,
  onGoToCalmMode,
}: CalculatorViewProps) {
  const [manualMode, setManualMode] = useState(false);
  const [lastFetchedNote, setLastFetchedNote] = useState(
    'Profil demonstracyjny wczytany lokalnie'
  );
  const [showTimeline, setShowTimeline] = useState(false);
  const [showPregnancyDetails, setShowPregnancyDetails] = useState(true);
  const [timelineImgError, setTimelineImgError] = useState(false);

  useEffect(() => {
    if (authSession.loggedIn) {
      setManualMode(false);
    } else if (mom.monthlyGross === 0) {
      setManualMode(false);
    }
  }, [authSession.loggedIn, mom.monthlyGross]);

  const hasDataAccess = authSession.loggedIn || manualMode || mom.monthlyGross > 0;

  const result = useMemo(
    () => simulateDualParentPlan(mom, dad, scenario, params),
    [mom, dad, scenario, params]
  );

  const risks = useMemo(
    () => evaluateRiskRadar(mom, dad, scenario, params),
    [mom, dad, scenario, params]
  );

  const activeVariantData =
    scenario.selectedVariant === '81.5'
      ? result.variant815
      : result.variant10070;

  const maxMonthlyNet = Math.max(
    1,
    ...activeVariantData.timeline.map((row) => row.totalNet)
  );

  const activePersona = authSession.loggedIn
    ? PERSONA_PROFILES.find((p) => p.id === activePersonaId) ??
      ANONYMOUS_EMPTY_PERSONA
    : ANONYMOUS_EMPTY_PERSONA;

  const defaultFormKind = resolveDefaultFormKind(mom, scenario, result);
  const defaultFormTitle =
    defaultFormKind === 'ZAM'
      ? 'Druk ZUS ZAM'
      : defaultFormKind === 'ZAS-53'
        ? 'Druk ZUS ZAS-53'
        : defaultFormKind === 'Z-3'
          ? 'Zaświadczenie ZUS Z-3'
          : defaultFormKind === 'Z-3a'
            ? 'Zaświadczenie ZUS Z-3a'
            : 'Wniosek pracownika (§ 15 Rozp. MRPiPS z 11.03.2025 r.)';

  const defaultFormSpec = useMemo(
    () =>
      buildOfficialFormSpec({
        persona: activePersona,
        mom,
        dad,
        scenario,
        params,
        result,
        requestedKind: defaultFormKind,
      }),
    [activePersona, mom, dad, scenario, params, result, defaultFormKind]
  );

  const handleFetchFromZus = () => {
    if (!authSession.loggedIn) return;
    onSelectPersona(activePersonaId);
    setManualMode(false);
    setLastFetchedNote(
      `Załadowano lokalny profil demonstracyjny (${new Date().toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
      })})`
    );
  };

  const handleToggleManualMode = () => {
    if (!manualMode && !authSession.loggedIn && mom.monthlyGross === 0) {
      onChangeMom(ANONYMOUS_MANUAL_MOM);
      onChangeDad(ANONYMOUS_MANUAL_DAD);
    }
    setManualMode((prev) => !prev);
  };

  return (
    <>
    <div className="space-y-6 no-print">
      {/* Header + demo profile vs manual mode */}
      <section className="overflow-hidden rounded-2xl border border-[#DCECE3] bg-white p-6 space-y-6">
        <div className="grid items-stretch gap-6 lg:grid-cols-12">
          <div className="flex flex-col justify-between space-y-4 lg:col-span-8">
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-extrabold text-[#0F172A] [text-wrap:balance]">
                Kalkulator Świadczeń Rodzicielskich
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-[#475569]">
                Kalkulator działa na fikcyjnych profilach demonstracyjnych albo danych wpisanych ręcznie. Nie łączy się z eZUS i nie pobiera danych z ZUS.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {authSession.loggedIn ? (
                <button
                  type="button"
                  onClick={handleFetchFromZus}
                  className={`inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                    !manualMode
                      ? 'bg-[#00703C] text-white'
                      : 'border border-[#DCECE3] bg-[#F2FBF6] text-[#00703C] hover:bg-[#DCFCE7]'
                  }`}
                >
                  <CloudDownload className="h-4 w-4" />
                  <span>Załaduj profil demo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl bg-[#0052a5] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#003974]"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Wybierz profil demo</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleManualMode}
                className={`inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                  manualMode
                    ? 'bg-[#0F172A] text-white'
                    : 'border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC]'
                }`}
              >
                <Edit3 className="h-4 w-4" />
                <span>{manualMode ? 'Zakończ edycję ręczną' : 'Wypełnij samodzielnie'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-4">
            {!timelineImgError ? (
              <img
                src={FAMILY_TIMELINE_IMAGE}
                alt="Pastelowa ilustracja uśmiechniętej mamy i taty spacerujących z wózkiem wzdłuż osi czasu pierwszego roku życia dziecka"
                referrerPolicy="no-referrer"
                onError={() => setTimelineImgError(true)}
                className="h-36 w-full rounded-xl border border-[#DCECE3] object-cover lg:h-full lg:max-h-44"
              />
            ) : (
              <div className="flex h-36 items-center justify-center rounded-xl border border-[#DCECE3] bg-[#F2FBF6] lg:h-full">
                <Users className="h-10 w-10 text-[#00703C]" />
              </div>
            )}
          </div>
        </div>

        {/* Local demo profile readout */}
        <div className="border-t border-[#DCECE3] pt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#00703C]">
              {hasDataAccess ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <Lock className="h-4 w-4 shrink-0 text-[#475569]" />
              )}
              <span className={!hasDataAccess ? 'text-[#475569]' : undefined}>
                {manualMode
                  ? 'Tryb ręcznego wprowadzania danych (symulacja lokalna)'
                  : authSession.loggedIn
                    ? `${lastFetchedNote} · Profil: ${mom.name} (PESEL: ${activePersona.peselMask})`
                    : !hasDataAccess
                      ? 'Wybierz profil demo lub wpisz dane samodzielnie'
                      : 'Anonimowa symulacja na podstawie wprowadzonych danych'}
              </span>
            </div>

            {authSession.loggedIn ? (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="calc-persona-switch" className="text-xs font-semibold text-[#475569]">
                  Profil demonstracyjny:
                </label>
                <select
                  id="calc-persona-switch"
                  value={activePersonaId}
                  onChange={(e) => onSelectPersona(e.target.value)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0F172A]"
                >
                  {PERSONA_PROFILES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : hasDataAccess ? (
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="whitespace-nowrap shrink-0 rounded-xl bg-[#0052a5] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#003974]"
              >
                Wybierz profil demo
              </button>
            ) : null}
          </div>

          {hasDataAccess && !manualMode && (
            <div className="grid divide-y divide-[#E2E8F0] border-t border-[#E2E8F0] pt-4 text-xs sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              <div className="py-2 sm:py-0 sm:pr-4">
                <div className="text-[#475569]">
                  {authSession.loggedIn ? 'Rodzic 1 (profil demo)' : 'Rodzic 1'}
                </div>
                <div className="mt-0.5 font-bold text-[#0F172A]">{mom.name}</div>
                <div className="font-mono tabular-nums text-[#00703C]">
                  {mom.title} · {mom.monthlyGross.toLocaleString('pl-PL')} zł
                </div>
              </div>
              <div className="py-2 sm:px-4 sm:py-0">
                <div className="text-[#475569]">
                  {authSession.loggedIn ? 'Rodzic 2 (profil demo)' : 'Rodzic 2'}
                </div>
                <div className="mt-0.5 font-bold text-[#0F172A]">{dad.name}</div>
                <div className="font-mono tabular-nums text-[#00703C]">
                  {dad.title} · {dad.monthlyGross.toLocaleString('pl-PL')} zł
                </div>
              </div>
              <div className="py-2 sm:px-4 sm:py-0">
                <div className="text-[#475569]">Płatnik zasiłku</div>
                <div className="mt-0.5 font-bold text-[#0F172A]">
                  Mama: {result.payerMom}
                </div>
                <div className="text-[#475569]">Tata: {result.payerDad}</div>
              </div>
              <div className="py-2 sm:py-0 sm:pl-4">
                <div className="text-[#475569]">Scenariusz</div>
                <div className="mt-0.5 font-bold text-[#0F172A]">
                  {SCENARIO_OPTIONS.find((s) => s.id === scenario.scenarioType)?.label}
                </div>
                <div className="text-[#475569] tabular-nums">
                  {result.milestones ? `Poród: ${result.milestones.birthDate} · ` : ''}PIT-2: {scenario.applyPit2KwotaWolna ? 'Tak' : 'Nie'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Manual Form Inputs (Shown only when user clicks "Wypełnij samodzielnie") */}
        {manualMode && (
          <div className="grid gap-6 border-t border-[#DCECE3] pt-5 lg:grid-cols-12">
            <div className="lg:col-span-4 space-y-4">
              <h2 className="font-display text-base font-bold text-[#0F172A]">
                Sytuacja rodzinna i opieka
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#475569]">
                    Scenariusz życiowy
                  </label>
                  <select
                    value={scenario.scenarioType}
                    onChange={(e) =>
                      onChangeScenario({
                        ...scenario,
                        scenarioType: e.target.value as ScenarioType,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A]"
                  >
                    {SCENARIO_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569]">
                    Data porodu (planowana / rzeczywista)
                  </label>
                  <input
                    type="date"
                    value={scenario.expectedDeliveryDate ?? ''}
                    onChange={(e) =>
                      onChangeScenario({
                        ...scenario,
                        expectedDeliveryDate: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm tabular-nums text-[#0F172A]"
                  />
                </div>

                {scenario.scenarioType !== 'STILLBIRTH' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[#475569]">
                        Liczba dzieci przy porodzie
                      </label>
                      <select
                        value={scenario.childrenCount}
                        onChange={(e) =>
                          onChangeScenario({
                            ...scenario,
                            childrenCount: Number(e.target.value) || 1,
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm tabular-nums text-[#0F172A]"
                      >
                        <option value={1}>1 dziecko (20 tyg. mac.)</option>
                        <option value={2}>Bliźnięta (31 tyg. mac.)</option>
                        <option value={3}>Trojaczki (33 tyg. mac.)</option>
                        <option value={4}>Czworaczki (35 tyg. mac.)</option>
                        <option value={5}>Pięcioraczki+ (37 tyg. mac.)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-[#475569]">
                          Macierzyński mamy (tyg.)
                        </label>
                        <input
                          type="number"
                          min={scenario.scenarioType === 'MOTHER_CRISIS' ? 8 : 14}
                          max={37}
                          value={scenario.momWeeksOnMaternity}
                          onChange={(e) =>
                            onChangeScenario({
                              ...scenario,
                              momWeeksOnMaternity: Math.max(
                                scenario.scenarioType === 'MOTHER_CRISIS' ? 8 : 14,
                                Number(e.target.value) || 14
                              ),
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm tabular-nums text-[#0F172A]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#475569]">
                          Urlop rodz. taty (min. 9)
                        </label>
                        <input
                          type="number"
                          min={9}
                          max={65}
                          value={scenario.dadShareParentalWeeks}
                          onChange={(e) =>
                            onChangeScenario({
                              ...scenario,
                              dadShareParentalWeeks: Math.max(
                                9,
                                Number(e.target.value) || 9
                              ),
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm tabular-nums text-[#0F172A]"
                        />
                      </div>
                    </div>
                  </>
                )}

                {scenario.scenarioType === 'PRETERM_HOSPITAL' && (
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F8FAFC] p-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569]">
                        Tydzień
                      </label>
                      <input
                        type="number"
                        min={20}
                        max={42}
                        value={scenario.gestationalWeeks}
                        onChange={(e) =>
                          onChangeScenario({
                            ...scenario,
                            gestationalWeeks: Number(e.target.value) || 28,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569]">
                        Waga (g)
                      </label>
                      <input
                        type="number"
                        min={300}
                        max={5500}
                        step={50}
                        value={scenario.birthWeightGrams}
                        onChange={(e) =>
                          onChangeScenario({
                            ...scenario,
                            birthWeightGrams: Number(e.target.value) || 1000,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569]">
                        Dni szpitala
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={scenario.hospitalDays}
                        onChange={(e) =>
                          onChangeScenario({
                            ...scenario,
                            hospitalDays: Number(e.target.value) || 0,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-sm tabular-nums"
                      />
                    </div>
                  </div>
                )}

                {(scenario.scenarioType === 'ADOPTION' ||
                  scenario.scenarioType === 'FOSTER_CARE') && (
                  <div className="space-y-2 rounded-xl bg-[#F8FAFC] p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569]">
                          Wiek dziecka (limit:{' '}
                          {scenario.scenarioType === 'ADOPTION'
                            ? '14 lat'
                            : scenario.fosterSchoolDeferred
                              ? '10 lat'
                              : '7 lat'}
                          )
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={18}
                          value={scenario.adoptedChildAgeYears}
                          onChange={(e) =>
                            onChangeScenario({
                              ...scenario,
                              adoptedChildAgeYears: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569]">
                          Tyg. do limitu wieku (opc.)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={52}
                          placeholder="np. 6"
                          value={scenario.weeksUntilAdoptionAgeCap ?? ''}
                          onChange={(e) =>
                            onChangeScenario({
                              ...scenario,
                              weeksUntilAdoptionAgeCap:
                                e.target.value === ''
                                  ? undefined
                                  : Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-sm tabular-nums"
                        />
                      </div>
                    </div>
                    {scenario.scenarioType === 'FOSTER_CARE' && (
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#334155]">
                        <input
                          type="checkbox"
                          checked={Boolean(scenario.fosterSchoolDeferred)}
                          onChange={(e) =>
                            onChangeScenario({
                              ...scenario,
                              fosterSchoolDeferred: e.target.checked,
                            })
                          }
                          className="h-4 w-4 accent-[#00703C]"
                        />
                        <span>Odroczenie obowiązku szkolnego (limit 10 lat)</span>
                      </label>
                    )}
                  </div>
                )}

                {scenario.scenarioType === 'PREGNANCY_SICKNESS' && (
                  <div className="space-y-2 rounded-xl bg-[#F8FAFC] p-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569]">
                        Planowane dni na L4 z kodem B w ciąży (maks. 270)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={270}
                        value={scenario.pregnancySickDaysPlanned ?? 90}
                        onChange={(e) =>
                          onChangeScenario({
                            ...scenario,
                            pregnancySickDaysPlanned: Math.max(
                              1,
                              Math.min(270, Number(e.target.value) || 1)
                            ),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-sm tabular-nums"
                      />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#334155]">
                      <input
                        type="checkbox"
                        checked={Boolean(scenario.employerBankruptcyOrIllegalDismissal)}
                        onChange={(e) =>
                          onChangeScenario({
                            ...scenario,
                            employerBankruptcyOrIllegalDismissal: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-[#00703C]"
                      />
                      <span>Upadłość/likwidacja pracodawcy lub bezprawne zwolnienie w ciąży</span>
                    </label>
                  </div>
                )}

                {scenario.scenarioType === 'STILLBIRTH' && (
                  <button
                    type="button"
                    onClick={onGoToCalmMode}
                    className="w-full rounded-xl bg-[#334155] px-3 py-2 text-xs font-bold text-white"
                  >
                    Przejdź do Trybu Spokojnej Pomocy
                  </button>
                )}

                {scenario.scenarioType !== 'STILLBIRTH' && (
                  <div className="space-y-2 pt-1 text-xs text-[#334155]">
                    <label className="flex cursor-pointer items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        checked={scenario.hasZaZyciem}
                        onChange={(e) =>
                          onChangeScenario({
                            ...scenario,
                            hasZaZyciem: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-[#00703C]"
                      />
                      <span>
                        Zaświadczenie „Za życiem” (
                        {scenario.scenarioType === 'ADOPTION' ||
                        scenario.scenarioType === 'FOSTER_CARE'
                          ? '62 tyg. rodzicielskiego'
                          : '+24 tyg.'}
                        )
                      </span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        checked={scenario.dadTakesPaternity14Days}
                        onChange={(e) =>
                          onChangeScenario({
                            ...scenario,
                            dadTakesPaternity14Days: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-[#00703C]"
                      />
                      <span>Tata bierze urlop ojcowski (14 dni · 100%)</span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        checked={scenario.combineParentalWithWork}
                        onChange={(e) =>
                          onChangeScenario({
                            ...scenario,
                            combineParentalWithWork: e.target.checked,
                            workCombinationWeeks: e.target.checked
                              ? Math.max(8, scenario.workCombinationWeeks || 12)
                              : 0,
                          })
                        }
                        className="h-4 w-4 accent-[#00703C]"
                      />
                      <span>Łączenie rodzicielskiego z pracą (do 1/2 etatu)</span>
                    </label>

                    {scenario.combineParentalWithWork && (
                      <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F8FAFC] p-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#475569]">
                            Wymiar pracy
                          </label>
                          <select
                            value={scenario.workCombinationFraction}
                            onChange={(e) =>
                              onChangeScenario({
                                ...scenario,
                                workCombinationFraction: Number(e.target.value) || 0.25,
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-xs"
                          >
                            <option value={0.25}>1/4 etatu (25%)</option>
                            <option value={0.5}>1/2 etatu (50%)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#475569]">
                            Łączone tyg.
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={43}
                            value={scenario.workCombinationWeeks}
                            onChange={(e) =>
                              onChangeScenario({
                                ...scenario,
                                workCombinationWeeks: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-xs tabular-nums"
                          />
                        </div>
                      </div>
                    )}

                    <label className="flex cursor-pointer items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        checked={scenario.noParentalInFirstYear}
                        onChange={(e) =>
                          onChangeScenario({
                            ...scenario,
                            noParentalInFirstYear: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-[#00703C]"
                      />
                      <span>Brak rodz. w 1. roku (wyrównanie do 100%, art. 31 ust. 4)</span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        checked={scenario.applyPit2KwotaWolna}
                        onChange={(e) =>
                          onChangeScenario({
                            ...scenario,
                            applyPit2KwotaWolna: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-[#00703C]"
                      />
                      <span>Uwzględnij PIT-2 (300 zł ulgi mies.)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-4">
              <ParentConfigBlock
                label="Rodzic 1 (Mama)"
                parent={mom}
                onChange={onChangeMom}
              />
            </div>

            <div className="lg:col-span-4">
              <ParentConfigBlock
                label="Rodzic 2 (Tata)"
                parent={dad}
                onChange={onChangeDad}
              />
            </div>
          </div>
        )}
      </section>

      {!hasDataAccess ? (
        <section className="rounded-2xl border border-[#DCECE3] bg-[#F2FBF6]/60 p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#00703C]">
                <Lock className="h-4 w-4" />
                <span>Tryb demonstracyjny</span>
              </div>
              <h2 className="font-display text-xl font-extrabold text-[#0F172A]">
                Wybierz profil demo lub oblicz anonimowo
              </h2>
              <p className="text-sm leading-relaxed text-[#475569]">
                Zalogowanie w tej wersji jedynie ładuje fikcyjny profil testowy. Nie podawaj danych logowania do eZUS. Możesz też wybrać „Wypełnij samodzielnie” — wpisywane dane pozostają w bieżącej sesji aplikacji.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl bg-[#0052a5] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#003974]"
              >
                <LogIn className="h-4 w-4" />
                <span>Wybierz profil demo</span>
              </button>
              <button
                type="button"
                onClick={handleToggleManualMode}
                className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-sm font-bold text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
              >
                <Edit3 className="h-4 w-4" />
                <span>Wypełnij samodzielnie</span>
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
      {/* Variant Comparison Strip */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div
          className={`rounded-2xl border p-5 transition-colors ${
            scenario.selectedVariant === '81.5'
              ? 'border-[#00703C] bg-[#ECFDF5]/60'
              : 'border-[#DCECE3] bg-white'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#475569]">
              Wariant A: 81,5% (wniosek w 21 dni)
            </span>
            {result.recommendedVariant === '81.5' && (
              <span className="text-xs font-extrabold text-[#00703C]">
                Korzystniejszy
              </span>
            )}
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold tabular-nums text-[#0F172A]">
            {formatPln(result.variant815.totalNet)}
          </div>
          <div className="mt-1 text-xs text-[#475569] tabular-nums">
            Mama: {formatPln(result.variant815.momTotalNet)} · Tata:{' '}
            {formatPln(result.variant815.dadTotalNet)}
          </div>
          {scenario.noParentalInFirstYear && result.variant815.art31ust4RefundGross > 0 && (
            <div className="mt-1 text-[11px] font-bold text-[#0052a5] tabular-nums">
              + Wyrównanie do 100% (art. 31 ust. 4): {formatPln(result.variant815.art31ust4RefundGross)} brutto
            </div>
          )}
          <button
            type="button"
            onClick={() =>
              onChangeScenario({ ...scenario, selectedVariant: '81.5' })
            }
            className={`mt-4 w-full rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
              scenario.selectedVariant === '81.5'
                ? 'bg-[#00703C] text-white'
                : 'border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F2FBF6]'
            }`}
          >
            {scenario.selectedVariant === '81.5'
              ? 'Wybrano do wniosku'
              : 'Wybierz wariant 81,5%'}
          </button>
        </div>

        <div
          className={`rounded-2xl border p-5 transition-colors ${
            scenario.selectedVariant === '100+70'
              ? 'border-[#00703C] bg-[#ECFDF5]/60'
              : 'border-[#DCECE3] bg-white'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#475569]">
              Wariant B: 100% + 70%
            </span>
            {result.recommendedVariant === '100+70' && (
              <span className="text-xs font-extrabold text-[#00703C]">
                Korzystniejszy
              </span>
            )}
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold tabular-nums text-[#0F172A]">
            {formatPln(result.variant10070.totalNet)}
          </div>
          <div className="mt-1 text-xs text-[#475569] tabular-nums">
            Mama: {formatPln(result.variant10070.momTotalNet)} · Tata:{' '}
            {formatPln(result.variant10070.dadTotalNet)}
          </div>
          <button
            type="button"
            onClick={() =>
              onChangeScenario({ ...scenario, selectedVariant: '100+70' })
            }
            className={`mt-4 w-full rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
              scenario.selectedVariant === '100+70'
                ? 'bg-[#00703C] text-white'
                : 'border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F2FBF6]'
            }`}
          >
            {scenario.selectedVariant === '100+70'
              ? 'Wybrano do wniosku'
              : 'Wybierz wariant 100% + 70%'}
          </button>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-[#DCECE3] bg-white p-5">
          <div>
            <div className="text-xs font-bold text-[#475569]">
              Podsumowanie dla Waszej rodziny
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#0F172A]">
              {result.recommendationReason}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] pt-3 text-xs text-[#475569]">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#00703C]" />
              Łącznie: {result.durations.momMaternityWeeks + result.durations.supplementaryMaternityWeeks + result.durations.parentalTotalWeeks} tyg. + {result.durations.dadPaternityWeeks * 7} dni ojc.
            </span>
          </div>
        </div>
      </section>

      {/* Age-cap warning banner if adoption/foster age exceeded */}
      {result.durations.adoptionAgeBlocked && (
        <section className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-5 text-sm text-[#991B1B]">
          <strong>Przekroczono ustawowy limit wieku dziecka:</strong>{' '}
          {scenario.scenarioType === 'FOSTER_CARE'
            ? `W rodzinie zastępczej niezawodowej urlop na warunkach macierzyńskiego przysługuje do ukończenia 7 lat (lub 10 lat przy odroczeniu obowiązku szkolnego).`
            : 'Przy adopcji urlop na warunkach macierzyńskiego przysługuje maksymalnie do ukończenia 14. roku życia.'}
        </section>
      )}

      {/* Pregnancy Sickness (100% Code B) + Rehabilitation + Care Allowance (Z-15A/B) Strip */}
      <section className="rounded-2xl border border-[#DCECE3] bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-display text-base sm:text-lg font-bold text-[#0F172A]">
              Zasiłek chorobowy w ciąży (e-ZLA kod „B” · 100%) i zasiłek opiekuńczy
            </h2>
            <p className="text-xs text-[#475569]">
              Stawka dzienna na L4 w ciąży:{' '}
              <strong className="font-mono tabular-nums text-[#00703C]">
                {result.pregnancySummary.eligible
                  ? `${formatPln(result.pregnancySummary.dailyGross100)} brutto/dzień (~${formatPln(result.pregnancySummary.monthlyNet100)} netto/mies.)`
                  : 'Brak uprawnień (sprawdź okres wyczekiwania lub zadłużenie)'}
              </strong>
              {' · '}Okres wyczekiwania: {result.pregnancySummary.waitingPeriodRequiredDays} dni (
              {result.pregnancySummary.waitingPeriodMet ? 'spełniony' : 'niespełniony'})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void import('../utils/zusPdfGenerator.ts').then(
                  ({ downloadOfficialZusPdf }) =>
                    downloadOfficialZusPdf({
                      persona: activePersona,
                      mom,
                      dad,
                      scenario,
                      params,
                      result,
                      forceForm: 'ZAS-53',
                    })
                );
              }}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-xl border border-[#DCECE3] bg-[#F2FBF6] px-3.5 py-2 text-xs font-bold text-[#00703C] transition-colors hover:bg-[#DCFCE7]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Pobierz ZUS ZAS-53 (PDF)</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPregnancyDetails((prev) => !prev)}
              className="whitespace-nowrap shrink-0 text-xs font-bold text-[#00703C] hover:underline"
            >
              {showPregnancyDetails || scenario.scenarioType === 'PREGNANCY_SICKNESS'
                ? 'Zwiń szczegóły'
                : 'Rozwiń szczegóły'}
            </button>
          </div>
        </div>

        {(showPregnancyDetails || scenario.scenarioType === 'PREGNANCY_SICKNESS') && (
          <div className="grid gap-6 divide-y divide-[#E2E8F0] border-t border-[#E2E8F0] pt-5 text-xs lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <div className="space-y-2.5 pt-1 lg:pt-0 lg:pr-6">
              <div className="font-bold text-[#00703C]">
                Zasiłek chorobowy w ciąży (limit 270 dni + świadczenie rehabilitacyjne)
              </div>
              <div className="flex flex-wrap gap-4 font-mono tabular-nums text-[#0F172A]">
                <span>Pracodawca (art. 92 KP): {result.pregnancySummary.employerPaidDays} dni</span>
                <span>ZUS / FUS: {result.pregnancySummary.zusPaidDays} dni</span>
                <span>Limit: 270 dni</span>
              </div>
              <ul className="list-disc space-y-1.5 pl-4 leading-relaxed text-[#334155]">
                {result.pregnancySummary.notes.map((n, idx) => (
                  <li key={idx}>{n}</li>
                ))}
                <li>
                  <strong>Dokumenty:</strong> e-ZLA z kodem „B” trafia automatycznie do eZUS; na B2B złóż druk <strong>ZAS-53</strong> i powstrzymaj się od pracy, przy zleceniu pracodawca wysyła <strong>Z-3a</strong>, a przy UoP do 20 os. — <strong>Z-3 / ZAS-12</strong>.
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 pt-4 lg:pt-0 lg:pl-6">
              <div className="font-bold text-[#0F172A]">
                Zasiłek opiekuńczy (Z-15A / Z-15B — 80%) oraz upadłość pracodawcy
              </div>
              <ul className="list-disc space-y-1.5 pl-4 leading-relaxed text-[#334155]">
                <li>
                  <strong>Dziecko do 14 lat (Z-15A):</strong> do 60 dni w roku kalendarzowym (choroba dziecka lub nieprzewidziane zamknięcie żłobka/przedszkola).
                </li>
                <li>
                  <strong>Dziecko z niepełnosprawnością 14–18 lat / inny członek rodziny (Z-15B):</strong> odpowiednio do 30 dni lub do 14 dni w roku — bez okresu wyczekiwania.
                </li>
                <li>
                  <strong>Zasiłek w wysokości zasiłku macierzyńskiego (100% do porodu):</strong> przysługuje po ustaniu ubezpieczenia w razie upadłości/likwidacji/śmierci pracodawcy lub bezprawnego zwolnienia w ciąży.
                </li>
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* Generated demonstration document draft */}
      <section className="rounded-2xl border border-[#DCECE3] bg-gradient-to-br from-[#F2FBF6]/70 to-white p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#00703C]">
              <FileText className="h-4 w-4" />
              <span>Projekt demonstracyjny · nie jest oficjalnym formularzem ZUS</span>
            </div>
            <h2 className="font-display text-xl font-extrabold text-[#0F172A] [text-wrap:balance]">
              Projekt dokumentu: {defaultFormTitle}
            </h2>
            <p className="max-w-2xl text-sm text-[#475569]">
              To demonstracyjny szablon utworzony przez aplikację, a nie aktualny druk urzędowy. Sprawdź treść, właściwy formularz i wymagane załączniki na stronie ZUS przed użyciem.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                void import('../utils/zusPdfGenerator.ts').then(
                  ({ downloadOfficialZusPdf }) =>
                    downloadOfficialZusPdf({
                      persona: activePersona,
                      mom,
                      dad,
                      scenario,
                      params,
                      result,
                      forceForm: defaultFormKind,
                    })
                );
              }}
              className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl bg-[#00703C] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#005A30]"
            >
              <Download className="h-4 w-4" />
              <span>Pobierz projekt PDF</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#334155] transition-colors hover:bg-[#F8FAFC]"
            >
              <Printer className="h-4 w-4" />
              <span>Drukuj</span>
            </button>
          </div>
        </div>

        <div className="grid gap-6 divide-y divide-[#DCECE3] border-t border-[#DCECE3] pt-6 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
          <div className="space-y-3 lg:col-span-6 lg:pr-6">
            <h3 className="font-display text-base font-bold text-[#92400E]">
              Krótka instrukcja uzupełnienia pól urzędowych (4 kroki)
            </h3>
            <ol className="list-decimal space-y-2 pl-5 text-xs leading-relaxed text-[#475569]">
              <li>
                <strong className="text-[#0F172A]">Dane identyfikacyjne i NIP płatnika:</strong> wpisz pełny PESEL, adres zamieszkania oraz NIP/REGON pracodawcy lub płatnika składek (wielkimi literami, kolorem czarnym lub niebieskim).
              </li>
              <li>
                <strong className="text-[#0F172A]">Numer rachunku bankowego (IBAN):</strong> wpisz 26-cyfrowe konto do przelewu zasiłku (brak numeru konta skutkuje przekazem pocztowym).
              </li>
              <li>
                <strong className="text-[#0F172A]">Dokładne daty urlopu/zwolnienia i PESEL dziecka:</strong> uzupełnij okresy „od – do” oraz PESEL dziecka (przy wypłacie przez ZUS nie dołączasz aktu urodzenia — § 13 ust. 2–4).
              </li>
              <li>
                <strong className="text-[#0F172A]">Podpis i termin 21 dni:</strong> złóż czytelny podpis (lub podpisz na PUE/eZUS) i pamiętaj o terminie 21 dni od porodu dla stawki 81,5%.
              </li>
            </ol>
          </div>

          <div className="space-y-4 pt-5 lg:col-span-6 lg:pt-0 lg:pl-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-[#0F172A]">
                Podgląd wypełnionych wartości w pliku
              </h3>
              <button
                type="button"
                onClick={onGoToDocuments}
                className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 text-xs font-bold text-[#0052a5] hover:underline"
              >
                Więcej projektów dokumentów <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[#E2E8F0] pt-4 text-xs">
              <div>
                <dt className="text-[#475569]">Podstawa Mama</dt>
                <dd className="mt-0.5 font-mono font-bold tabular-nums text-[#0F172A]">
                  {formatPln(result.momBase.calculatedBase)}
                </dd>
              </div>
              <div>
                <dt className="text-[#475569]">Podstawa Tata</dt>
                <dd className="mt-0.5 font-mono font-bold tabular-nums text-[#0F172A]">
                  {formatPln(result.dadBase.calculatedBase)}
                </dd>
              </div>
              <div>
                <dt className="text-[#475569]">Urlop Mamy</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-[#0F172A]">
                  {result.durations.momMaternityWeeks + result.durations.supplementaryMaternityWeeks} tyg. mac. + {result.durations.momParentalWeeks} tyg. rodz.
                </dd>
              </div>
              <div>
                <dt className="text-[#475569]">Urlop Taty</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-[#0F172A]">
                  {result.durations.dadParentalWeeks} tyg. rodz. + {result.durations.dadPaternityWeeks * 7} dni ojc.
                </dd>
              </div>
              {result.milestones && (
                <>
                  <div>
                    <dt className="text-[#475569]">Termin 21 dni (stawka 81,5%)</dt>
                    <dd className="mt-0.5 font-mono font-bold tabular-nums text-[#B45309]">
                      do {result.milestones.deadline21Days} r.
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#475569]">Koniec macierzyńskiego / rodz.</dt>
                    <dd className="mt-0.5 font-mono font-bold tabular-nums text-[#0F172A]">
                      {result.milestones.maternityEndDate} / {result.milestones.parentalEndDate}
                    </dd>
                  </div>
                  {result.milestones.zua7DayDeadlineDate && (
                    <div className="col-span-2">
                      <dt className="text-[#475569]">Ponowne zgłoszenie ZUS ZUA (7 dni po B2B/Zlecenie)</dt>
                      <dd className="mt-0.5 font-mono font-bold tabular-nums text-[#00703C]">
                        do {result.milestones.zua7DayDeadlineDate} r.
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>
        </div>
      </section>

      {/* Bottom Row: Risk Radar + Collapsible Monthly Timeline */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-6 rounded-2xl border border-[#DCECE3] bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-[#B45309]" />
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              Ważne terminy i ostrzeżenia prawne ({risks.length})
            </h2>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {risks.map((risk) => (
              <div key={risk.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-2.5">
                  {risk.severity === 'CRITICAL' ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B91C1C]" />
                  ) : risk.severity === 'WARNING' ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]" />
                  ) : (
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0052a5]" />
                  )}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span
                        className={`text-sm font-bold ${
                          risk.severity === 'CRITICAL'
                            ? 'text-[#B91C1C]'
                            : risk.severity === 'WARNING'
                              ? 'text-[#92400E]'
                              : 'text-[#0F172A]'
                        }`}
                      >
                        {risk.title}
                      </span>
                      <span className="text-xs text-[#64748B]">· {risk.article}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-[#475569]">
                      {risk.summary}
                    </p>
                    <p className="text-xs font-semibold text-[#00703C]">
                      {risk.action}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-6 rounded-2xl border border-[#DCECE3] bg-white p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              Harmonogram miesięcznych wypłat ({scenario.selectedVariant}%)
            </h2>
            <button
              type="button"
              onClick={() => setShowTimeline((prev) => !prev)}
              className="whitespace-nowrap shrink-0 text-xs font-bold text-[#00703C] hover:underline"
            >
              {showTimeline ? 'Zwiń miesiące' : 'Pokaż wszystkie miesiące'}
            </button>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {(showTimeline
              ? activeVariantData.timeline
              : activeVariantData.timeline.slice(0, 6)
            ).map((row) => {
              const widthPct = Math.round((row.totalNet / maxMonthlyNet) * 100);
              return (
                <div
                  key={row.monthIndex}
                  className="grid grid-cols-12 items-center gap-3 py-2 text-xs"
                >
                  <div className="col-span-2 font-semibold tabular-nums text-[#0F172A]">
                    {row.label}
                  </div>
                  <div className="col-span-4 truncate text-[#475569]">
                    {row.phase}
                  </div>
                  <div className="col-span-3">
                    <div className="h-2.5 w-full overflow-hidden rounded-sm bg-[#F1F5F9]">
                      <div
                        className="h-full bg-[#16A34A]"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="col-span-3 text-right font-mono font-semibold tabular-nums text-[#0F172A]">
                    {formatPln(row.totalNet)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
        </>
      )}
    </div>
    <PrintableFormSheet spec={defaultFormSpec} yearLabel={params.yearLabel} />
    </>
  );
}
