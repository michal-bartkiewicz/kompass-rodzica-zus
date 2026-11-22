import { useEffect, useState } from 'react';
import EZUS_PORTAL_IMAGE from '../assets/images/tab_ezus_portal_1795285878553.jpg';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Landmark,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Printer,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { OFFICIAL_SUPPORT_LINKS } from '../engine/presets.ts';
import { simulateDualParentPlan } from '../engine/zusEngine.ts';
import type {
  LegislativeParams,
  ParentInput,
  PersonaProfile,
  ScenarioConfig,
} from '../engine/types.ts';
import {
  buildOfficialFormSpec,
  formatOfficialFormAsPlainText,
  type OfficialFormKind,
} from '../utils/officialForms.ts';
import { downloadOfficialZusPdf } from '../utils/zusPdfGenerator.ts';
import { PrintableFormSheet } from './PrintableFormSheet.tsx';
import type { AuthSession } from './ZusLoginModal.tsx';

interface EcosystemViewProps {
  persona: PersonaProfile;
  mom: ParentInput;
  dad: ParentInput;
  scenario: ScenarioConfig;
  params: LegislativeParams;
  authSession: AuthSession;
  onOpenLoginModal: () => void;
  onLogout: () => void;
}

type DocTemplateId =
  | 'WNIOSEK_PRACODAWCA_815'
  | 'ZAM_ZUS'
  | 'ZAS53_CHOROBOWY'
  | 'Z3_Z3A_PLATNIK'
  | 'OJCOWSKI_ZAM';

export function EcosystemView({
  persona,
  mom,
  dad,
  scenario,
  params,
  authSession,
  onOpenLoginModal,
  onLogout,
}: EcosystemViewProps) {
  const [imgError, setImgError] = useState(false);
  const [selectedDoc, setSelectedDoc] =
    useState<DocTemplateId>('WNIOSEK_PRACODAWCA_815');
  const [copied, setCopied] = useState(false);
  const [pueQuestion, setPueQuestion] = useState(
    'Proszę o potwierdzenie salda składek na dzień powstania prawa do zasiłku macierzyńskiego oraz statusu wniosku ZAM.'
  );
  const [pueReply, setPueReply] = useState<string | null>(null);
  const [showDebtCertificate, setShowDebtCertificate] = useState(false);
  const [uscCopyType, setUscCopyType] = useState<'SKROCONY' | 'ZUPELNY'>('SKROCONY');
  const [uscSubmittedRef, setUscSubmittedRef] = useState<string | null>(null);

  const momIsZUsPayer =
    mom.title !== 'UOP' || mom.payerInsuredCount <= params.payerInsuredThreshold;

  useEffect(() => {
    if (scenario.scenarioType === 'PREGNANCY_SICKNESS') {
      setSelectedDoc('ZAS53_CHOROBOWY');
    } else if (mom.title !== 'UOP' || mom.payerInsuredCount <= params.payerInsuredThreshold) {
      setSelectedDoc('ZAM_ZUS');
    } else {
      setSelectedDoc('WNIOSEK_PRACODAWCA_815');
    }
  }, [
    scenario.scenarioType,
    mom.title,
    mom.payerInsuredCount,
    params.payerInsuredThreshold,
  ]);

  const daysCodeB = persona.eZlaHistory
    .filter((e) => e.countsToward270)
    .reduce((acc, e) => acc + e.days, 0);
  const pct270 = Math.min(100, Math.round((daysCodeB / 270) * 100));

  const debtThreshold = (params.minWage * params.b2bDebtThresholdPct) / 100;
  const hasBlockingDebt = mom.title === 'B2B' && mom.b2bDebtAmount > debtThreshold;

  const calcResult = simulateDualParentPlan(mom, dad, scenario, params);

  const selectedOfficialKind: OfficialFormKind = (() => {
    switch (selectedDoc) {
      case 'WNIOSEK_PRACODAWCA_815':
        return 'WNIOSEK_PRACODAWCA';
      case 'ZAM_ZUS':
        return 'ZAM';
      case 'ZAS53_CHOROBOWY':
        return 'ZAS-53';
      case 'Z3_Z3A_PLATNIK':
        return mom.title === 'UOP' ? 'Z-3' : mom.title === 'ZLECENIE' ? 'Z-3a' : 'ZAM';
      case 'OJCOWSKI_ZAM':
        return dad.title === 'UOP' ? 'WNIOSEK_OJCOWSKI_PRACODAWCA' : 'ZAM_OJCOWSKI';
    }
  })();

  const activeFormSpec = buildOfficialFormSpec({
    persona,
    mom,
    dad,
    scenario,
    params,
    result: calcResult,
    requestedKind: selectedOfficialKind,
  });

  const plainText = formatOfficialFormAsPlainText(activeFormSpec);
  const docText =
    `PROJEKT DEMONSTRACYJNY — NIE JEST OFICJALNYM FORMULARZEM ZUS. NIE SKŁADAJ.\n\n` +
    (selectedDoc === 'Z3_Z3A_PLATNIK' && mom.title === 'B2B'
      ? `W tym przykładzie pokazano przejście ze starego symbolu Z-3b do projektu ZAM. To szablon demonstracyjny.\n\n${plainText}`
      : plainText);

  const formHighlights = activeFormSpec.sections
    .flatMap((section) => section.rows ?? [])
    .filter((row) => !row.isManualFill && row.value.trim().length > 0)
    .slice(0, 4);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(docText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored cleanly
    }
  };

  return (
    <>
      <div className="space-y-6 no-print">
        <section className="overflow-hidden rounded-2xl border border-[#DCECE3] bg-white p-6">
          <div className="grid items-stretch gap-6 lg:grid-cols-12">
            <div className="flex flex-col justify-center space-y-2.5 lg:col-span-8">
              <h1 className="font-display text-2xl font-bold text-[#0F172A] [text-wrap:balance]">
                Symulator eZUS, e-ZLA i Kreatorów Dokumentów
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-[#475569]">
                Demonstracja profilu ubezpieczonego, e-ZLA, salda składek i ścieżek USC. Nie łączy się z systemami ZUS ani USC; profile, dane i potwierdzenia są przykładowe.
              </p>
              <div className="text-xs font-semibold text-[#00703C]">
                {authSession.loggedIn
                  ? `Aktywny profil demo · ${mom.name} · ${authSession.method}`
                  : 'Tryb demonstracyjny — wybierz przykładowy profil lub wpisz własne dane'}
              </div>
            </div>
            <div className="lg:col-span-4">
              {!imgError ? (
                <img
                  src={EZUS_PORTAL_IMAGE}
                  alt="Pastelowa ilustracja laptopa i telefonu z zieloną tarczą eZUS oraz przewiązanych wniosków rodzinnych"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="h-36 w-full rounded-xl border border-[#DCECE3] object-cover lg:h-full lg:max-h-40"
                />
              ) : (
                <div className="flex h-36 items-center justify-center rounded-xl border border-[#DCECE3] bg-[#F2FBF6] lg:h-full">
                  <Landmark className="h-10 w-10 text-[#00703C]" />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Top Row: login.gov.pl (mObywatel) + eZUS + USC */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Identity & eZUS Login Card */}
          <section className="rounded-2xl border border-[#DCECE3] bg-white p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
                <Smartphone className="h-4 w-4 shrink-0 text-[#0052a5]" />
                <span>Symulacja logowania · mObywatel</span>
              </div>
              <span
                className={`text-xs font-semibold ${
                  authSession.loggedIn ? 'text-[#00703C]' : 'text-[#B45309]'
                }`}
              >
                {authSession.loggedIn ? 'Profil demo' : 'Bez profilu demo'}
              </span>
            </div>

            <dl className="divide-y divide-[#E2E8F0] border-t border-[#E2E8F0] text-xs">
              <div className="flex justify-between py-2">
                <dt className="text-[#475569]">Ubezpieczona</dt>
                <dd className="font-semibold text-[#0F172A]">
                  {authSession.loggedIn ? `${mom.name} (przykład)` : 'Nie wybrano'}
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-[#475569]">PESEL</dt>
                <dd className="font-mono font-semibold tabular-nums text-[#0F172A]">
                  {authSession.loggedIn ? `${persona.peselMask} (testowe)` : '-----------'}
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-[#475569]">Drugi rodzic</dt>
                <dd className="font-semibold text-[#0F172A]">
                  {authSession.loggedIn ? `${dad.name} (przykład)` : 'Nie wybrano'}
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-[#475569]">Tytuł ubezp.</dt>
                <dd className="font-semibold text-[#0F172A]">
                  {authSession.loggedIn ? mom.title : '---'}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              {authSession.loggedIn ? (
                <>
                  <button
                    type="button"
                    onClick={onOpenLoginModal}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap shrink-0 rounded-xl bg-[#0052a5] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#003974]"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Zmień profil demo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDebtCertificate(false);
                      setPueReply(null);
                      onLogout();
                    }}
                    className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Zakończ demo</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap shrink-0 rounded-xl bg-[#0052a5] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#003974]"
                >
                  <LogIn className="h-3.5 w-3.5" />
                <span>Wybierz profil demo</span>
                </button>
              )}
            </div>

            <p className="text-xs leading-relaxed text-[#475569]">
              Wybór profilu jedynie symuluje logowanie mObywatel. Dane o składkach, podstawie i e-ZLA są przykładowe i nie pochodzą z systemu ZUS.
            </p>
          </section>

          {/* PUE/eZUS Status, 270-day Sick Limit & Debt Certificate Simulation */}
          <section className="rounded-2xl border border-[#DCECE3] bg-white p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
                <Landmark className="h-4 w-4 text-[#00703C]" />
                <span>Podgląd konta · dane demo</span>
              </div>
              <span
                className={`text-xs font-bold ${
                  !authSession.loggedIn
                    ? 'text-[#475569]'
                    : hasBlockingDebt
                      ? 'text-[#B91C1C]'
                      : 'text-[#00703C]'
                }`}
              >
                {!authSession.loggedIn
                  ? 'Wybierz profil demo'
                  : hasBlockingDebt
                    ? `Zaległość ${mom.b2bDebtAmount.toFixed(2)} zł`
                    : 'Przykładowe saldo'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#334155]">
                  Limit okresu zasiłkowego w ciąży (270 dni)
                </span>
                <span className="font-mono font-bold tabular-nums text-[#0F172A]">
                  {authSession.loggedIn ? `${daysCodeB} / 270 dni` : '--- / 270 dni'}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-sm bg-[#F1F5F9]">
                <div
                  className="h-full bg-[#00703C]"
                  style={{ width: `${authSession.loggedIn ? pct270 : 0}%` }}
                />
              </div>
            </div>

            {!authSession.loggedIn ? (
              <p className="text-xs leading-relaxed text-[#475569]">
                Wybierz profil demonstracyjny, aby zobaczyć przykładową historię e-ZLA i saldo. Nie są one pobierane z ZUS.
              </p>
            ) : persona.eZlaHistory.length > 0 ? (
              <div className="divide-y divide-[#F1F5F9] text-xs">
                {persona.eZlaHistory.map((ezla) => (
                  <div key={ezla.id} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between font-semibold text-[#0F172A]">
                      <span className="font-mono">
                        e-ZLA {ezla.series} {ezla.code === 'B' ? '(kod B)' : '(zwykłe)'}
                      </span>
                      <span className="tabular-nums">{ezla.days} dni</span>
                    </div>
                    <p className="mt-0.5 text-[#475569]">{ezla.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#475569]">
                Brak aktywnych zwolnień e-ZLA w bieżącym okresie rozliczeniowym.
              </p>
            )}

            {/* Simulated ZUS Contribution Debt Certificate on Benefit Start Date */}
            <div className="border-t border-[#E2E8F0] pt-3 space-y-2">
              {authSession.loggedIn ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowDebtCertificate((prev) => !prev)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#BBF7D0] bg-[#F2FBF6] px-3 py-2 text-xs font-bold text-[#00703C] hover:bg-[#DCFCE7]"
                  >
                    <FileCheck className="h-3.5 w-3.5" />
                    <span>
                      {showDebtCertificate
                        ? 'Ukryj podgląd przykładowego salda'
                        : 'Pokaż podgląd przykładowego salda'}
                    </span>
                  </button>

                  {showDebtCertificate && (
                    <div className="rounded-xl border border-[#CBD5E1] bg-[#FFFDF7] p-3 text-[11px] space-y-1 text-[#0F172A]">
                      <div className="font-bold text-[#00703C]">
                        PODGLĄD DEMONSTRACYJNY · PRZYKŁADOWE SALDO SKŁADEK
                      </div>
                      <div>
                        Płatnik: <strong>{mom.name}</strong> ({mom.title})
                      </div>
                      <div className="font-mono tabular-nums">
                        Saldo na dzień powstania prawa: <strong>{mom.b2bDebtAmount.toFixed(2)} zł</strong> (próg art. 2a: {debtThreshold.toFixed(2)} zł)
                      </div>
                      <div className={hasBlockingDebt ? 'font-bold text-[#B91C1C]' : 'font-bold text-[#00703C]'}>
                        Status:{' '}
                        {hasBlockingDebt
                          ? 'SYMULACJA: zadłużenie powyżej progu — przykład blokady prawa do zasiłku.'
                          : 'SYMULACJA: saldo nie przekracza progu z przykładu.'}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs font-bold text-[#0052a5] hover:bg-[#F0F5FA]"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Wybierz profil demo, aby zobaczyć saldo przykładowe</span>
                </button>
              )}
            </div>
          </section>

          {/* USC / gov.pl § 13 ust. 2-4 Rule + Simulated Birth Certificate Request */}
          <section className="rounded-2xl border border-[#DCECE3] bg-white p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
              <ShieldCheck className="h-4 w-4 text-[#00703C]" />
              <span>Rejestr USC / § 13 ust. 2–4 (27.09.2026)</span>
            </div>

            <div className="border-t border-[#E2E8F0] pt-3 text-xs leading-relaxed text-[#065F46]">
              {!authSession.loggedIn ? (
                <>
                  <strong>Zasada § 13 ust. 2–4 (27.09.2026 r.):</strong> Gdy płatnikiem zasiłku jest ZUS, nie dostarczasz papierowego aktu urodzenia (wystarczy PESEL dziecka we wniosku ZAM). Gdy wypłaca pracodawca (&gt;20 os.), odpis skrócony składasz w kadrach.
                </>
              ) : momIsZUsPayer ? (
                <>
                  <strong>Płatnikiem zasiłku jest ZUS:</strong> Nie musisz dostarczać papierowego ani elektronicznego odpisu skróconego aktu urodzenia dziecka. Wystarczy podać imię, datę urodzenia i numer PESEL dziecka we wniosku ZAM.
                </>
              ) : (
                <>
                  <strong>Płatnikiem jest pracodawca (&gt;20 os.):</strong> ZUS nie weryfikuje aktu urodzenia w pierwszej linii — odpis aktu urodzenia lub oświadczenie okazuje się w kadrach pracodawcy zgodnie z rozporządzeniem z 11.03.2025 r.
                </>
              )}
            </div>

            {/* Simulated USC Birth Certificate Application */}
            <div className="space-y-2 border-t border-[#E2E8F0] pt-3 text-xs">
              <div className="font-semibold text-[#0F172A]">
                Symulacja wniosku o odpis aktu urodzenia (USC):
              </div>
              <div className="flex gap-2">
                <select
                  value={uscCopyType}
                  onChange={(e) =>
                    setUscCopyType(e.target.value as 'SKROCONY' | 'ZUPELNY')
                  }
                  className="flex-1 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs text-[#0F172A]"
                >
                  <option value="SKROCONY">Odpis skrócony aktu urodzenia</option>
                  <option value="ZUPELNY">Odpis zupełny aktu urodzenia</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setUscSubmittedRef(
                      `USC-2026-${uscCopyType === 'SKROCONY' ? 'SKR' : 'ZUP'}-4091`
                    )
                  }
                  className="whitespace-nowrap shrink-0 rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1E293B]"
                >
                  Złóż symulację
                </button>
              </div>
              {uscSubmittedRef && (
                <div className="text-[11px] font-medium text-[#065F46]">
                  Przykładowy numer symulacji <strong>{uscSubmittedRef}</strong> ({uscCopyType === 'SKROCONY' ? 'odpis skrócony' : 'odpis zupełny'}). Wniosek nie został wysłany.
                </div>
              )}
              <a
                href="https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#0052a5] hover:underline"
              >
                <span>Oficjalny wniosek na gov.pl/rejestr-stanu-cywilnego</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="space-y-1 border-t border-[#E2E8F0] pt-3 text-xs">
              <div className="flex items-center gap-2 text-[#334155]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#00703C]" />
                <span>
                  {!authSession.loggedIn
                    ? 'Wybierz profil demo, aby zobaczyć przykładową ścieżkę wypłaty'
                    : momIsZUsPayer
                      ? `Wypłata przez ZUS (${mom.title}) → ZAM na PUE/eZUS`
                      : `Wypłata przez pracodawcę (${mom.payerInsuredCount} os.) → Wniosek do kadr`}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Row: Kreator Wniosków + PUE Message Simulator */}
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="lg:col-span-8 rounded-2xl border border-[#DCECE3] bg-white p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#00703C]" />
                <h2 className="font-display text-lg font-semibold text-[#0F172A]">
                  Kreator Wniosków i Druków (Rozp. 11.03.2025 i ZUS 2026)
                </h2>
              </div>

              {authSession.loggedIn && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadOfficialZusPdf({
                        persona,
                        mom,
                        dad,
                        scenario,
                        params,
                        result: calcResult,
                        forceForm: selectedOfficialKind,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#00703C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#005A30]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Pobierz projekt PDF ({selectedOfficialKind === 'WNIOSEK_PRACODAWCA' ? 'Wniosek § 15' : selectedOfficialKind === 'WNIOSEK_OJCOWSKI_PRACODAWCA' ? 'Wniosek § 17' : selectedOfficialKind === 'ZAM_OJCOWSKI' ? 'ZUS ZAM' : selectedOfficialKind})
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC]"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Drukuj
                  </button>
                </div>
              )}
            </div>

            {!authSession.loggedIn ? (
              <div className="border-t border-[#E2E8F0] pt-5 space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-[#00703C]">
                  <Lock className="h-4 w-4" />
                  <span>Projekty dokumentów są dostępne w profilu demo</span>
                </div>
                <p className="max-w-xl text-xs leading-relaxed text-[#475569]">
                  Wybór profilu demo wypełni przykładowe dane w projektach ZAM, ZAS-53, Z-3/Z-3a oraz wnioskach do pracodawcy. To nie są oficjalne druki ani połączenie z eZUS.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={onOpenLoginModal}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0052a5] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#003974]"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Wybierz profil demo</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 border-b border-[#E2E8F0] pb-3">
                  {(
                    [
                      { id: 'WNIOSEK_PRACODAWCA_815', label: 'Wniosek do pracodawcy' },
                      { id: 'ZAM_ZUS', label: 'Zasiłek macierzyński' },
                      { id: 'ZAS53_CHOROBOWY', label: 'Zwolnienie w ciąży' },
                      {
                        id: 'Z3_Z3A_PLATNIK',
                        label:
                          mom.title === 'UOP'
                          ? 'Zaświadczenie płatnika'
                            : mom.title === 'ZLECENIE'
                              ? 'Zaświadczenie zleceniodawcy'
                              : 'Dane o ubezpieczeniu',
                      },
                      {
                        id: 'OJCOWSKI_ZAM',
                        label:
                          dad.title === 'UOP'
                            ? 'Wniosek o urlop ojcowski'
                            : 'Zasiłek ojcowski',
                      },
                    ] as const
                  ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedDoc(tab.id)}
                    className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                        selectedDoc === tab.id
                        ? 'bg-[#00703C] text-white shadow-sm'
                        : 'border border-[#DCECE3] bg-white text-[#334155] hover:border-[#00703C] hover:text-[#00703C]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-4 rounded-2xl border border-[#DCECE3] bg-gradient-to-br from-[#F2FBF6] to-[#FFFDF7] p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#00703C] ring-1 ring-[#DCECE3]">
                        <FileCheck className="h-3.5 w-3.5" />
                        Projekt do sprawdzenia
                      </div>
                      <h3 className="mt-3 font-display text-lg font-extrabold leading-snug text-[#0F172A] sm:text-xl">
                        {activeFormSpec.title}
                      </h3>
                      <p className="mt-1 text-xs text-[#475569]">
                        {activeFormSpec.symbol} · {activeFormSpec.issuerHeader}
                      </p>
                    </div>
                    <span className="rounded-lg border border-[#FECACA] bg-white px-3 py-2 text-center text-[10px] font-extrabold leading-snug text-[#991B1B]">
                      WZÓR DEMO
                      <br />
                      NIE SKŁADAJ
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {formHighlights.map((row) => (
                      <div key={row.label} className="rounded-xl border border-white bg-white/90 p-3 shadow-sm">
                        <div className="text-[11px] font-medium text-[#64748B]">{row.label}</div>
                        <div className="mt-1 whitespace-pre-line text-sm font-semibold leading-relaxed text-[#0F172A]">
                          {row.value}
                        </div>
                      </div>
                    ))}
                    {formHighlights.length === 0 && (
                      <p className="text-sm text-[#475569]">
                        Projekt zawiera pola do ręcznego uzupełnienia. Otwórz pełny podgląd, aby zobaczyć ich układ.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#DCECE3] pt-3 text-xs text-[#475569]">
                    <span>{activeFormSpec.attachments.length} pozycji na liście załączników</span>
                    <span>Stan prawny: {params.yearLabel}</span>
                  </div>
                </div>

                <details className="group rounded-xl border border-[#E2E8F0] bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[#0F172A] marker:hidden focus-visible:rounded-xl">
                    <span>Otwórz pełny podgląd projektu</span>
                    <span className="text-xs font-medium text-[#64748B] group-open:hidden">Pokaż</span>
                    <span className="hidden text-xs font-medium text-[#64748B] group-open:inline">Ukryj</span>
                  </summary>
                  <div className="max-h-[70vh] overflow-auto border-t border-[#E2E8F0] bg-[#F1F5F9] p-3 sm:p-5">
                    <PrintableFormSheet
                      spec={activeFormSpec}
                      yearLabel={params.yearLabel}
                      variant="preview"
                    />
                  </div>
                </details>

                <details className="group rounded-xl border border-[#E2E8F0] bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[#475569] marker:hidden focus-visible:rounded-xl">
                    <span>Opcje zaawansowane · tekst do kopiowania</span>
                    <span className="text-xs font-medium text-[#64748B] group-open:hidden">Pokaż</span>
                    <span className="hidden text-xs font-medium text-[#64748B] group-open:inline">Ukryj</span>
                  </summary>
                  <div className="space-y-3 border-t border-[#E2E8F0] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs leading-relaxed text-[#64748B]">
                        Prosty tekst przydaje się przy kopiowaniu treści do innego edytora.
                      </p>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-[#00703C]" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? 'Skopiowano' : 'Kopiuj tekst'}
                      </button>
                    </div>
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 font-mono text-xs leading-relaxed text-[#334155]">
                      {docText}
                    </pre>
                  </div>
                </details>
              </>
            )}
          </section>

          <section className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-[#DCECE3] bg-white p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#0052a5]" />
                <h2 className="font-display text-lg font-semibold text-[#0F172A]">
                  Symulator pytania do ZUS (PUE)
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-[#475569]">
                Zobacz, jak mogłaby wyglądać odpowiedź na pytanie o status sprawy. To tylko przykład — nic nie jest wysyłane do ZUS.
              </p>
              <details className="group rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-semibold text-[#475569] marker:hidden focus-visible:rounded-xl">
                  <span>Opcje zaawansowane · edytuj treść pytania</span>
                  <span className="text-[#64748B] group-open:hidden">Pokaż</span>
                  <span className="hidden text-[#64748B] group-open:inline">Ukryj</span>
                </summary>
                <div className="border-t border-[#E2E8F0] p-3">
                  <textarea
                    rows={4}
                    value={pueQuestion}
                    onChange={(e) => {
                      setPueQuestion(e.target.value);
                      setPueReply(null);
                    }}
                    aria-label="Treść przykładowego pytania do ZUS"
                    className="w-full rounded-lg border border-[#CBD5E1] bg-white p-3 text-sm leading-relaxed text-[#0F172A]"
                  />
                </div>
              </details>
              {authSession.loggedIn ? (
                <button
                  type="button"
                  onClick={() =>
                    setPueReply(
                        `Pytanie: ${pueQuestion.trim() || 'Prośba o sprawdzenie statusu sprawy.'}\n\nSYMULACJA PUE/eZUS dla profilu demo ${mom.name}: Płatnik ${
                        momIsZUsPayer ? 'ZUS (bezpośrednio)' : 'Pracodawca'
                      }. ${
                        hasBlockingDebt
                          ? `UWAGA: wykryto zaległość ${mom.b2bDebtAmount.toFixed(2)} zł (> ${debtThreshold.toFixed(2)} zł). Spłać saldo przed wnioskiem ZAM.`
                          : 'W tym przykładzie nie wykryto blokady w saldzie. Sprawdź aktualne wymagania dla wniosku w ZUS.'
                      }`
                    )
                  }
                  className="w-full rounded-lg bg-[#0052a5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#003974]"
                >
                  Pokaż przykładową odpowiedź
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0052a5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#003974]"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Wybierz profil demo, aby zobaczyć odpowiedź przykładową</span>
                </button>
              )}

              {authSession.loggedIn && pueReply && (
                <div className="border-t border-[#E2E8F0] pt-3 text-xs leading-relaxed text-[#0F172A]">
                  <div className="font-semibold text-[#00703C]">
                    Przykładowa odpowiedź (symulacja PUE/eZUS):
                  </div>
                  <p className="mt-2 whitespace-pre-line rounded-xl bg-[#F8FAFC] p-3 font-normal text-[#334155]">{pueReply}</p>
                </div>
              )}
            </div>

            {/* Official Government & ZUS Links required by Challenge Section 4 (p. 14) */}
            <div className="rounded-2xl border border-[#DCECE3] bg-white p-6 space-y-3">
              <h2 className="font-display text-base font-bold text-[#0F172A]">
                Oficjalne portale i wsparcie (ZUS, MRPiPS, PIP, USC)
              </h2>
              <ul className="space-y-2.5 text-xs">
                {OFFICIAL_SUPPORT_LINKS.map((item) => (
                  <li key={item.url} className="border-b border-[#F1F5F9] pb-2 last:border-b-0 last:pb-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-[#00703C] hover:underline"
                    >
                      <span>{item.label}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-[11px] text-[#475569]">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>

      <PrintableFormSheet spec={activeFormSpec} yearLabel={params.yearLabel} />
    </>
  );
}

