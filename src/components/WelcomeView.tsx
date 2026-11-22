import { useState } from 'react';
import HERO_IMAGE from '../assets/images/hero_mama_baby_storybook_1795277721622.jpg';
import DOCS_IMAGE from '../assets/images/card_zus_documents_1795277721950.jpg';
import {
  ArrowRight,
  Calculator,
  FileCheck2,
  FileSearch,
  HeartHandshake,
  LogIn,
  Scale,
  Sparkles,
} from 'lucide-react';
import { CrayonCompassIcon } from './CrayonCompassIcon.tsx';
import type { AuthSession } from './ZusLoginModal.tsx';

interface WelcomeViewProps {
  authSession: AuthSession;
  userName: string;
  onOpenLoginModal: () => void;
  onGoToCalculator: () => void;
  onGoToAuditor: () => void;
  onGoToEcosystem: () => void;
  onGoToRag: () => void;
  onGoToAdmin: () => void;
  onGoToCalmMode: () => void;
}

export function WelcomeView({
  authSession,
  userName,
  onOpenLoginModal,
  onGoToCalculator,
  onGoToAuditor,
  onGoToEcosystem,
  onGoToRag,
  onGoToAdmin,
  onGoToCalmMode,
}: WelcomeViewProps) {
  const [heroImgError, setHeroImgError] = useState(false);
  const [docsImgError, setDocsImgError] = useState(false);

  return (
    <div className="space-y-12 pb-8">
      {/* Storybook Hero Section */}
      <section className="overflow-hidden rounded-2xl border border-[#DCECE3] bg-gradient-to-br from-[#F2FBF6] via-[#FFFDF7] to-[#FEF9EC] p-6 sm:p-10 lg:p-12">
        <div className="grid items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left Copy Column */}
          <div className="flex flex-col justify-between space-y-6 lg:col-span-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 text-sm font-bold text-[#00703C]">
                <CrayonCompassIcon className="h-12 w-12 shrink-0" />
                <span>Przyjazny przewodnik ZUS dla przyszłych rodziców</span>
              </div>

              <h1
                className="font-display font-extrabold leading-tight tracking-tight text-[#0F172A] [text-wrap:balance]"
                style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)' }}
              >
                Spokojna droga przez urlopy i zasiłki dla mamy i taty
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-[#475569]">
                Nie musisz znać ustaw na pamięć ani przepisywać skomplikowanych tabelek. Przetestuj przewodnik na fikcyjnym profilu albo wpisz dane samodzielnie, porównaj warianty wypłat i zobacz projekt wniosku PDF.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onGoToCalculator}
                  className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 rounded-xl bg-[#00703C] px-6 py-3.5 font-display text-base font-bold text-white transition-colors hover:bg-[#005A30]"
                >
                  <Calculator className="h-5 w-5" />
                  <span>Otwórz Kalkulator ZUS</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={onGoToAuditor}
                  className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl border border-[#DCECE3] bg-white px-5 py-3.5 font-display text-sm font-bold text-[#00703C] transition-colors hover:bg-[#F2FBF6]"
                >
                  <FileSearch className="h-4 w-4" />
                  <span>Sprawdź dokument PDF</span>
                </button>
              </div>

              <div>
                {authSession.loggedIn ? (
                  <button
                    type="button"
                    onClick={onOpenLoginModal}
                    className="inline-flex items-center gap-1.5 text-left text-xs font-bold text-[#0052a5] hover:underline"
                  >
                    <LogIn className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Konto testowe: {userName} — zmień przypadek
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenLoginModal}
                    className="inline-flex items-center gap-1.5 text-left text-xs font-bold text-[#0052a5] hover:underline"
                  >
                    <LogIn className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Zaloguj się do eZUS
                    </span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs font-medium text-[#475569]">
              Aktualny stan prawny: listopad 2026 r. · Uwzględnia wniosek ZAM oraz brak wymogu papierowego aktu urodzenia
            </p>
          </div>

          {/* Right Storybook Illustration Column */}
          <div className="lg:col-span-6">
            {!heroImgError ? (
              <div className="relative h-full min-h-[280px] overflow-hidden rounded-2xl border border-[#DCECE3] bg-[#EAF7F0]">
                <img
                  src={HERO_IMAGE}
                  alt="Uśmiechnięta mama niosąca bobasa w zielonej chuście obok wózka na słonecznej łące"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-[#DCECE3] bg-[#EAF7F0] p-8 text-center">
                <CrayonCompassIcon className="h-20 w-20" />
                <p className="mt-4 font-display text-lg font-bold text-[#00703C]">
                  Bezpieczny start z maleństwem
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Hand-drawn pastel wavy divider */}
      <div className="flex justify-center" aria-hidden="true">
        <svg viewBox="0 0 280 18" className="h-4 w-64 text-[#86EFAC]" fill="none">
          <path
            d="M4 9C24 2 44 16 64 9C84 2 104 16 124 9C144 2 164 16 184 9C204 2 224 16 244 9C258 4 268 12 276 9"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* How It Works — Clean Editorial Hairline-Divided Steps */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="font-display text-2xl font-extrabold text-[#0F172A] [text-wrap:balance] sm:text-3xl">
            Jak to działa w 3 prostych krokach?
          </h2>
          <p className="mt-1.5 text-sm text-[#475569]">
            Wszystko w przyjaznej formie, bez skomplikowanego słownictwa urzędowego.
          </p>
        </div>

        <div className="grid divide-y divide-[#DCECE3] rounded-2xl border border-[#DCECE3] bg-white md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="space-y-2.5 p-6 sm:p-7">
            <div className="font-mono text-xs font-bold tracking-wider text-[#00703C]">
              01. LOGOWANIE LUB WŁASNE DANE
            </div>
            <h3 className="font-display text-lg font-bold text-[#0F172A]">
              Wybierasz scenariusz do obliczeń
            </h3>
            <p className="text-sm leading-relaxed text-[#475569]">
              Zaloguj się do eZUS, a w oknie logowania wybierz przypadek testowy. Możesz też przejść do formularza i wpisać własne dane.
            </p>
          </div>

          <div className="space-y-2.5 p-6 sm:p-7">
            <div className="font-mono text-xs font-bold tracking-wider text-[#00703C]">
              02. OPTYMALNE OBLICZENIA
            </div>
            <h3 className="font-display text-lg font-bold text-[#0F172A]">
              Dobieramy korzystniejszy wariant
            </h3>
            <p className="text-sm leading-relaxed text-[#475569]">
              Porównujemy opcję 81,5% oraz 100% + 70%, liczymy 9 tygodni urlopu taty, zasiłek chorobowy w ciąży (kod B · 100%) oraz ostrzegamy o terminach i zaległości powyżej 48,06 zł.
            </p>
          </div>

          <div className="space-y-2.5 p-6 sm:p-7">
            <div className="font-mono text-xs font-bold tracking-wider text-[#00703C]">
              03. PROJEKT DOKUMENTU PDF
            </div>
            <h3 className="font-display text-lg font-bold text-[#0F172A]">
              Pobierasz wzór do sprawdzenia
            </h3>
            <p className="text-sm leading-relaxed text-[#475569]">
              Generator tworzy demonstracyjny projekt na podstawie obliczeń. Sprawdź go i porównaj z aktualnym formularzem udostępnionym przez ZUS przed użyciem.
            </p>
          </div>
        </div>
      </section>

      {/* Ready-to-Submit Document Storybook Feature + Calm Support Banner */}
      <section className="grid items-stretch gap-6 lg:grid-cols-12">
        <div className="flex flex-col justify-between gap-6 overflow-hidden rounded-2xl border border-[#DCECE3] bg-white p-6 sm:p-8 lg:col-span-7">
          <div className="grid items-center gap-6 sm:grid-cols-12">
            <div className="space-y-3 sm:col-span-7">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00703C]">
                <FileCheck2 className="h-4 w-4" />
                <span>Projekty dokumentów</span>
              </div>
              <h3 className="font-display text-xl font-extrabold text-[#0F172A] [text-wrap:balance]">
                Wzory do omówienia i dalszego uzupełnienia
              </h3>
              <p className="text-sm leading-relaxed text-[#475569]">
                Podgląd i wydruk pomagają przejść przez wymagane pola. To nie jest oficjalny formularz ZUS ani wysyłka dokumentu — aktualny druk i wymagane załączniki sprawdź w ZUS.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={onGoToEcosystem}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-xl bg-[#00703C] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#005A30]"
                >
                  Otwórz symulator eZUS
                </button>
                <button
                  type="button"
                  onClick={onGoToRag}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-bold text-[#334155] transition-colors hover:bg-[#F2FBF6]"
                >
                  Zapytaj Asystenta Prawa
                </button>
              </div>
            </div>

            <div className="sm:col-span-5">
              {!docsImgError ? (
                <img
                  src={DOCS_IMAGE}
                  alt="Ilustracja dokumentów ZUS przewiązanych zieloną wstążką i pastelowego kompasu na drewnianym stoliku"
                  referrerPolicy="no-referrer"
                  onError={() => setDocsImgError(true)}
                  className="h-44 w-full rounded-xl border border-[#DCECE3] object-cover"
                />
              ) : (
                <div className="flex h-44 items-center justify-center rounded-xl border border-[#DCECE3] bg-[#F2FBF6]">
                  <Sparkles className="h-10 w-10 text-[#00703C]" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#CBD5E1] bg-[#F1F5F9] p-6 sm:p-8 lg:col-span-5">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-[#334155]">
              <HeartHandshake className="h-5 w-5 text-[#475569]" />
              <span>Potrzebujesz spokojnego wsparcia?</span>
            </div>
            <h3 className="font-display text-xl font-bold text-[#0F172A] [text-wrap:balance]">
              Tryb Spokojnej Pomocy
            </h3>
            <p className="text-sm leading-relaxed text-[#475569]">
              Jeśli Wasze dziecko urodziło się przedwcześnie, przebywa w szpitalu lub przeżywacie trudny czas po stracie czy chorobie, ten tryb wycisza kolory i pokazuje tylko najważniejsze kroki oraz bezpłatną pomoc fundacji OPP.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToCalmMode}
            className="inline-flex w-fit items-center gap-2 whitespace-nowrap shrink-0 rounded-xl bg-[#334155] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1E293B]"
          >
            Otwórz Tryb Spokojnej Pomocy
          </button>
        </div>
      </section>

      {/* Quiet Storybook Footer with AI Transparency & Legislation Link */}
      <footer className="space-y-2 border-t border-[#DCECE3] pt-6 text-xs text-[#475569]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>
            Kompas Rodzica ZUS · Stan prawny na listopad 2026 r. (Kodeks pracy oraz Ustawa zasiłkowa)
          </span>
          <button
            type="button"
            onClick={onGoToAdmin}
            className="inline-flex items-center gap-1.5 font-semibold text-[#00703C] hover:underline"
          >
            <Scale className="h-3.5 w-3.5" />
            <span>Panel legislacyjny i symulacja zmian 2027</span>
          </button>
        </div>
        <p className="text-[11px] text-[#475569]">
          <strong>Przejrzystość użycia AI:</strong> Kwoty i wymiary urlopów oblicza deterministyczny silnik reguł. Jeśli serwer ma skonfigurowany Gemini, AI pomaga odczytać wgrane pliki w „Audytorze PDF” i formułować odpowiedzi „Asystenta Prawa”. W audytorze treść PDF lub obrazy skanu są wysyłane z przeglądarki do serwera, a serwer może przekazać je do Gemini. Nie wgrywaj dokumentów z prawdziwymi danymi osobowymi. Logowanie i profile są symulowane; aplikacja nie pobiera danych z ZUS.
        </p>
      </footer>
    </div>
  );
}
