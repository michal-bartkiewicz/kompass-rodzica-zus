import { useState } from 'react';
import CALM_SUPPORT_IMAGE from '../assets/images/tab_calm_support_1795285877967.jpg';
import { ExternalLink, HeartHandshake, Phone, Shield } from 'lucide-react';
import {
  OFFICIAL_SUPPORT_LINKS,
  VERIFIED_CHARITIES,
} from '../engine/presets.ts';
import { calculateSupplementaryMaternityWeeks } from '../engine/zusEngine.ts';
import type { LegislativeParams, ScenarioConfig } from '../engine/types.ts';

interface CalmSupportViewProps {
  params: LegislativeParams;
  scenario: ScenarioConfig;
  onApplyPretermToCalculator: (next: Partial<ScenarioConfig>) => void;
}

type CrisisPathway = 'preterm' | 'loss' | 'maternal';

export function CalmSupportView({
  params,
  scenario,
  onApplyPretermToCalculator,
}: CalmSupportViewProps) {
  const [imgError, setImgError] = useState(false);
  const isPretermScenario = scenario.scenarioType === 'PRETERM_HOSPITAL';
  const [pathway, setPathway] = useState<CrisisPathway>('preterm');
  const [gestWeeks, setGestWeeks] = useState(
    isPretermScenario ? scenario.gestationalWeeks : 27
  );
  const [weightGrams, setWeightGrams] = useState(
    isPretermScenario ? scenario.birthWeightGrams : 940
  );
  const [hospitalDays, setHospitalDays] = useState(
    isPretermScenario ? scenario.hospitalDays : 92
  );
  const [fullTermLate, setFullTermLate] = useState(
    isPretermScenario ? scenario.fullTermLateHosp : false
  );

  const suppWeeks = calculateSupplementaryMaternityWeeks({
    ...scenario,
    scenarioType: 'PRETERM_HOSPITAL',
    gestationalWeeks: gestWeeks,
    birthWeightGrams: weightGrams,
    hospitalDays,
    fullTermLateHosp: fullTermLate,
  });

  return (
    <div className="space-y-8 text-[#1E293B]">
      {/* Calm Header */}
      <section className="rounded-2xl border border-[#CBD5E1] bg-white p-6 sm:p-8">
        <div className="grid items-stretch gap-6 lg:grid-cols-12">
          <div className="flex flex-col justify-center space-y-2 lg:col-span-8">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-[#475569]">
              <HeartHandshake className="h-5 w-5 text-[#475569]" />
              <span>Wyciszona ścieżka wsparcia</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-[#0F172A] [text-wrap:balance]">
              Tryb Spokojnej Pomocy
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#475569]">
              W trudnych sytuacjach zdrowotnych i rodzinnych nie musisz samodzielnie analizować ustaw. Wybierz ścieżkę, aby zobaczyć tylko konkretne uprawnienia, spokojne kroki formalne oraz zweryfikowane wsparcie psychologiczne i prawne.
            </p>
          </div>
          <div className="lg:col-span-4">
            {!imgError ? (
              <img
                src={CALM_SUPPORT_IMAGE}
                alt="Spokojna akwarelowa ilustracja dłoni rodzica delikatnie trzymającej małą rączkę dziecka"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-36 w-full rounded-xl border border-[#CBD5E1] object-cover lg:h-full lg:max-h-44"
              />
            ) : (
              <div className="flex h-36 items-center justify-center rounded-xl border border-[#CBD5E1] bg-[#F1F5F9] lg:h-full">
                <HeartHandshake className="h-10 w-10 text-[#475569]" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setPathway('preterm')}
            className={`rounded-lg border px-4 py-3 text-left transition-colors ${
              pathway === 'preterm'
                ? 'border-[#334155] bg-[#334155] text-white'
                : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] hover:bg-[#F1F5F9]'
            }`}
          >
            <div className="text-sm font-semibold">Wcześniak lub pobyt w szpitalu</div>
            <div
              className={`mt-0.5 text-xs ${
                pathway === 'preterm' ? 'text-[#E2E8F0]' : 'text-[#64748B]'
              }`}
            >
              Uzupełniający urlop macierzyński (art. 180² KP)
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPathway('loss')}
            className={`rounded-lg border px-4 py-3 text-left transition-colors ${
              pathway === 'loss'
                ? 'border-[#334155] bg-[#334155] text-white'
                : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] hover:bg-[#F1F5F9]'
            }`}
          >
            <div className="text-sm font-semibold">Urodzenie martwe lub strata dziecka</div>
            <div
              className={`mt-0.5 text-xs ${
                pathway === 'loss' ? 'text-[#E2E8F0]' : 'text-[#64748B]'
              }`}
            >
              8 tygodni zasiłku, zasiłek pogrzebowy {params.funeralBenefit.toLocaleString('pl-PL')} zł
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPathway('maternal')}
            className={`rounded-lg border px-4 py-3 text-left transition-colors ${
              pathway === 'maternal'
                ? 'border-[#334155] bg-[#334155] text-white'
                : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] hover:bg-[#F1F5F9]'
            }`}
          >
            <div className="text-sm font-semibold">Ciężka choroba lub zgon matki</div>
            <div
              className={`mt-0.5 text-xs ${
                pathway === 'maternal' ? 'text-[#E2E8F0]' : 'text-[#64748B]'
              }`}
            >
              Przejęcie opieki przez ojca lub najbliższą rodzinę
            </div>
          </button>
        </div>
      </section>

      {/* Pathway Details */}
      {pathway === 'preterm' && (
        <section className="rounded-2xl border border-[#CBD5E1] bg-white p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#0F172A]">
                Kalkulator uzupełniającego urlopu macierzyńskiego (art. 180² Kodeksu pracy)
              </h2>
              <p className="mt-1 text-sm text-[#475569]">
                Przysługuje na 100% podstawy wymiaru bezpośrednio po zakończeniu podstawowego urlopu macierzyńskiego. Przy porodzie mnogim pod uwagę bierze się dziecko o najniższej wadze i najdłuższym pobycie w szpitalu.
              </p>
            </div>
            <div className="rounded-lg bg-[#F1F5F9] px-5 py-3 text-right">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Przysługujący wymiar dodatkowy
              </div>
              <div className="font-display text-2xl font-bold tabular-nums text-[#0F172A]">
                {suppWeeks} {suppWeeks === 1 ? 'tydzień' : suppWeeks < 5 && suppWeeks > 0 ? 'tygodnie' : 'tygodni'}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Tydzień ciąży w chwili porodu
              </label>
              <input
                type="number"
                min={20}
                max={43}
                value={gestWeeks}
                onChange={(e) => setGestWeeks(Number(e.target.value) || 28)}
                className="mt-1.5 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Najniższa masa urodzeniowa (g)
              </label>
              <input
                type="number"
                min={300}
                max={6000}
                step={50}
                value={weightGrams}
                onChange={(e) => setWeightGrams(Number(e.target.value) || 1000)}
                className="mt-1.5 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">
                Dni hospitalizacji dziecka
              </label>
              <input
                type="number"
                min={0}
                max={365}
                value={hospitalDays}
                onChange={(e) => setHospitalDays(Number(e.target.value) || 0)}
                className="mt-1.5 w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm tabular-nums"
              />
            </div>

            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#334155]">
                <input
                  type="checkbox"
                  checked={fullTermLate}
                  onChange={(e) => setFullTermLate(e.target.checked)}
                  className="h-4 w-4 accent-[#334155]"
                />
                <span>Dziecko donoszone (&gt;37 tyg.) w szpitalu min. 2 dni między 5. a 28. dniem życia</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E2E8F0] pt-4 text-sm text-[#475569]">
            <div>
              Wymiar: 1 tydzień urlopu za każdy rozpoczęty tydzień pobytu w szpitalu (do 15 tyg. poniżej 28. tyg. lub &le;1000 g; do 8 tyg. w pozostałych grupach). Wniosek składa się min. 21 dni przed końcem macierzyńskiego wraz z zaświadczeniem ze szpitala.
            </div>
            <button
              type="button"
              onClick={() =>
                onApplyPretermToCalculator({
                  scenarioType: 'PRETERM_HOSPITAL',
                  gestationalWeeks: gestWeeks,
                  birthWeightGrams: weightGrams,
                  hospitalDays,
                  fullTermLateHosp: fullTermLate,
                })
              }
              className="rounded-lg bg-[#334155] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E293B]"
            >
              Przelicz w głównym kalkulatorze
            </button>
          </div>
        </section>
      )}

      {pathway === 'loss' && (
        <section className="rounded-2xl border border-[#CBD5E1] bg-white p-6 space-y-5">
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">
            Uprawnienia po poronieniu lub urodzeniu martwym
          </h2>
          <div className="divide-y divide-[#E2E8F0] text-sm">
            <div className="py-3">
              <div className="font-semibold text-[#0F172A]">
                1. Skrócony urlop i zasiłek macierzyński — 8 tygodni (100% podstawy)
              </div>
              <p className="mt-1 text-[#475569]">
                Przysługuje na podstawie art. 180¹ § 1 Kodeksu pracy (nie mniej niż 7 dni od dnia zgonu dziecka). Do wniosku ZAM (lub wniosku do pracodawcy) dołącza się zaświadczenie lekarza lub położnej o urodzeniu martwym albo akt urodzenia z odpowiednią adnotacją — niezależnie od czasu trwania ciąży.
              </p>
            </div>
            <div className="py-3">
              <div className="font-semibold text-[#0F172A]">
                2. Zasiłek pogrzebowy — {params.funeralBenefit.toLocaleString('pl-PL')} zł (formularz Z-12)
              </div>
              <p className="mt-1 text-[#475569]">
                W 2026 r. zryczałtowany zasiłek pogrzebowy wynosi {params.funeralBenefit.toLocaleString('pl-PL')} zł dla członka rodziny (niezależnie od niższych faktycznych rachunków za pochówek). Wniosek Z-12 można złożyć w ciągu 12 miesięcy od dnia pogrzebu na podstawie zaświadczenia o urodzeniu martwym lub karty zgonu.
              </p>
            </div>
            <div className="py-3">
              <div className="font-semibold text-[#0F172A]">
                3. Brak obowiązku rejestracji pełnego aktu lub możliwość nadania imienia
              </div>
              <p className="mt-1 text-[#475569]">
                Dzięki aktualnym przepisom do uzyskania zasiłku macierzyńskiego i pogrzebowego w razie poronienia bez oznaczonej płci wystarcza zaświadczenie medyczne wystawione przez lekarza specjalistę lub położną.
              </p>
            </div>
          </div>
        </section>
      )}

      {pathway === 'maternal' && (
        <section className="rounded-2xl border border-[#CBD5E1] bg-white p-6 space-y-5">
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">
            Przejęcie opieki w przypadku ciężkiej choroby, hospitalizacji lub śmierci matki
          </h2>
          <div className="divide-y divide-[#E2E8F0] text-sm">
            <div className="py-3">
              <div className="font-semibold text-[#0F172A]">
                Przejęcie natychmiastowe (zgon matki lub porzucenie dziecka)
              </div>
              <p className="mt-1 text-[#475569]">
                Ojciec wychowujący dziecko (albo inny ubezpieczony członek najbliższej rodziny) ma prawo do niewykorzystanej części urlopu i zasiłku macierzyńskiego już od pierwszego dnia po zdarzeniu — bez wymogu wykorzystania 8 tygodni przez matkę.
              </p>
            </div>
            <div className="py-3">
              <div className="font-semibold text-[#0F172A]">
                Hospitalizacja matki lub orzeczenie o niezdolności do samodzielnej egzystencji
              </div>
              <p className="mt-1 text-[#475569]">
                Po wykorzystaniu przez matkę co najmniej 8 tygodni urlopu macierzyńskiego po porodzie, jej dalszą część może przejąć ojciec lub inny ubezpieczony członek najbliższej rodziny (na okres pobytu matki w szpitalu lub trwania orzeczenia). Przerwany urlop matki chroni ciągłość finansową rodziny.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Verified OPP Charity & Official Support Directory */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#CBD5E1] bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#475569]" />
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">
              Zweryfikowane organizacje pożytku publicznego (OPP)
            </h2>
          </div>
          <p className="text-xs text-[#64748B]">
            Wyłącznie sprawdzone fundacje o statusie non-profit zapewniające bezpłatne wsparcie psychologiczne i prawne.
          </p>
          <div className="divide-y divide-[#E2E8F0]">
            {VERIFIED_CHARITIES.map((org) => (
              <div key={org.krs} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-sm text-[#0F172A]">
                    {org.name}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-[#64748B]">
                    KRS {org.krs}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#475569]">{org.focus}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-[#334155]">
                  <span>{org.note}</span>
                  {org.phone && (
                    <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                      <Phone className="h-3 w-3" />
                      {org.phone}
                    </span>
                  )}
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[#0B5ED7] hover:underline"
                  >
                    Strona organizacji <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#CBD5E1] bg-white p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">
            Bezpośrednie kanały pomocy instytucjonalnej
          </h2>
          <div className="divide-y divide-[#E2E8F0]">
            {OFFICIAL_SUPPORT_LINKS.map((link) => (
              <div key={link.label} className="py-3.5">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B5ED7] hover:underline"
                >
                  {link.label}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <p className="mt-1 text-xs text-[#475569]">{link.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
