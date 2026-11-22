import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Contrast, HeartHandshake, LogIn, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { CrayonCompassIcon } from './CrayonCompassIcon.tsx';
import type { AuthSession } from './ZusLoginModal.tsx';

export type AppTab =
  | 'welcome'
  | 'calculator'
  | 'auditor'
  | 'ecosystem'
  | 'rag'
  | 'admin'
  | 'calm';

interface TopNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  calmMode: boolean;
  authSession: AuthSession;
  userName: string;
  highContrast: boolean;
  largeText: boolean;
  onToggleAccessibility: () => void;
  onOpenLoginModal: () => void;
  onLogout: () => void;
}

const NAV_ITEMS: { id: AppTab; label: string }[] = [
  { id: 'welcome', label: 'Start' },
  { id: 'calculator', label: 'Kalkulator' },
  { id: 'auditor', label: 'Audytor PDF' },
  { id: 'ecosystem', label: 'Symulator eZUS' },
  { id: 'rag', label: 'Asystent Prawa' },
];

export function TopNav({
  activeTab,
  onSelectTab,
  calmMode,
  authSession,
  userName,
  highContrast,
  largeText,
  onToggleAccessibility,
  onOpenLoginModal,
  onLogout,
}: TopNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const firstName = authSession.loggedIn ? userName.split(' ')[0] || 'Konto' : '';

  const handleSelect = (tab: AppTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors no-print ${
        calmMode
          ? 'border-[#CBD5E1] bg-[#F1F5F9]/95 backdrop-blur-sm'
          : 'border-[#DCECE3] bg-[#FFFDF7]/95 backdrop-blur-sm'
      }`}
    >
      <div className="border-b border-[#FCD34D] bg-[#FFFBEB] px-3 py-1.5 text-center text-[10px] font-semibold leading-relaxed text-[#78350F] sm:text-xs">
        <span className="font-extrabold tracking-wide">TRYB DEMO</span>
        {' · '}Brak połączenia z ZUS. Profile są przykładowe; nie wpisuj prawdziwych danych logowania.
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-2.5 sm:h-[76px] sm:gap-5 sm:px-6 lg:gap-6 lg:px-8">
        {/* Zone 1: Brand Wordmark with enlarged pastel crayon ZUS-green compass */}
        <button
          type="button"
          onClick={() => handleSelect('welcome')}
          className="flex min-w-0 items-center gap-1.5 text-left whitespace-nowrap shrink-0 focus:outline-none sm:gap-2.5"
        >
          <CrayonCompassIcon
            className="h-10 w-10 shrink-0 sm:h-14 sm:w-14"
            calmMode={calmMode}
          />
          <span className="font-display text-[13px] font-extrabold tracking-tight text-[#0F172A] sm:text-lg">
            Kompas <span className="hidden sm:inline">Rodzica </span>ZUS
          </span>
        </button>

        {/* Zone 2: Clean typographic navigation links (zero pills) */}
        <nav className="hidden items-center gap-5 lg:flex" aria-label="Nawigacja główna">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`relative whitespace-nowrap shrink-0 py-5 text-sm font-semibold transition-colors ${
                  isActive
                    ? calmMode
                      ? 'text-[#0F172A]'
                      : 'text-[#00703C]'
                    : 'text-[#475569] hover:text-[#00703C]'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="active-nav-underline"
                    className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full ${
                      calmMode ? 'bg-[#334155]' : 'bg-[#00703C]'
                    }`}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: demo profile + accessibility + calm support + mobile menu */}
        <div className="flex items-center gap-1.5 shrink-0 sm:gap-2.5">
          {authSession.loggedIn ? (
            <div className="inline-flex items-center rounded-lg border border-[#CBD5E1] bg-white px-2 py-1.5 text-[11px] font-semibold text-[#0F172A] sm:px-3 sm:text-xs">
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="inline-flex items-center gap-1 whitespace-nowrap hover:text-[#0052a5] sm:gap-1.5"
                title={`Aktywny profil demonstracyjny (${authSession.method})`}
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#00703C]" />
                <span className="max-w-[60px] truncate sm:max-w-none">
                  {firstName}
                </span>
                <span className="hidden xl:inline max-w-[130px] truncate font-normal text-[#475569]">
                  · DEMO
                </span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] sm:ml-1.5"
                aria-label="Zakończ profil demonstracyjny"
                title="Zakończ demo"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0052a5] px-2.5 py-2 text-xs font-bold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-[#003974] sm:px-4"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Wybierz profil demo</span>
              <span className="sm:hidden">Demo</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleAccessibility}
            aria-pressed={highContrast || largeText}
            aria-label="Przełącz tryb wysokiego kontrastu i większego tekstu (WCAG)"
            title={
              highContrast || largeText
                ? 'Wyłącz wysoki kontrast i powiększenie (WCAG)'
                : 'Włącz wysoki kontrast i powiększony tekst (WCAG)'
            }
            className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold whitespace-nowrap shrink-0 transition-colors sm:h-9 sm:px-2.5 ${
              highContrast || largeText
                ? 'bg-[#0F172A] text-white'
                : 'border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F1F5F9]'
            }`}
          >
            <Contrast className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden xl:inline">Aa+</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(calmMode ? 'welcome' : 'calm')}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm ${
              calmMode
                ? 'bg-[#334155] text-white hover:bg-[#1E293B]'
                : 'border border-[#DCECE3] bg-white text-[#334155] hover:border-[#00703C] hover:text-[#00703C]'
            }`}
            title="Tryb Spokojnej Pomocy"
          >
            <HeartHandshake className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="hidden md:inline">
              {calmMode ? 'Wróć na start' : 'Spokojna Pomoc'}
            </span>
            <span className="md:hidden">{calmMode ? 'Powrót' : 'Pomoc'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#334155] sm:h-9 sm:w-9 lg:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? 'Zamknij menu' : 'Otwórz menu'}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      <AnimatePresence initial={false}>
      {mobileMenuOpen && (
        <motion.div
          key="mobile-menu"
          id="mobile-navigation"
          initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: 'easeOut' }}
          className="overflow-hidden border-t border-[#DCECE3] bg-[#FFFDF7] px-4 py-3 lg:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold ${
                    isActive
                      ? 'bg-[#ECFDF5] text-[#00703C]'
                      : 'text-[#334155] hover:bg-[#F2FBF6]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => handleSelect('admin')}
              className="rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold text-[#475569] hover:bg-[#F2FBF6]"
            >
              Panel legislacyjny (2026/2027)
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </header>
  );
}
