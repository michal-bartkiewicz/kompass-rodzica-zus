import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { TopNav, type AppTab } from './components/TopNav.tsx';
import { WelcomeView } from './components/WelcomeView.tsx';
import {
  ZusLoginModal,
  type AuthMethod,
  type AuthSession,
} from './components/ZusLoginModal.tsx';
import {
  ANONYMOUS_EMPTY_DAD,
  ANONYMOUS_EMPTY_MOM,
  ANONYMOUS_EMPTY_PERSONA,
  ANONYMOUS_EMPTY_SCENARIO,
  DEFAULT_2026_PARAMS,
  PERSONA_PROFILES,
} from './engine/presets.ts';
import type {
  AuditInput,
  LegislativeParams,
  ParentInput,
  ScenarioConfig,
} from './engine/types.ts';

const CalculatorView = lazy(() =>
  import('./components/CalculatorView.tsx').then((module) => ({
    default: module.CalculatorView,
  }))
);
const AuditPdfView = lazy(() =>
  import('./components/AuditPdfView.tsx').then((module) => ({
    default: module.AuditPdfView,
  }))
);
const EcosystemView = lazy(() =>
  import('./components/EcosystemView.tsx').then((module) => ({
    default: module.EcosystemView,
  }))
);
const CalmSupportView = lazy(() =>
  import('./components/CalmSupportView.tsx').then((module) => ({
    default: module.CalmSupportView,
  }))
);
const LegalRagView = lazy(() =>
  import('./components/LegalRagView.tsx').then((module) => ({
    default: module.LegalRagView,
  }))
);
const AdminPanelView = lazy(() =>
  import('./components/AdminPanelView.tsx').then((module) => ({
    default: module.AdminPanelView,
  }))
);

export default function App() {
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<AppTab>('welcome');
  const [params, setParams] = useState<LegislativeParams>(DEFAULT_2026_PARAMS);
  const [activePersonaId, setActivePersonaId] = useState<string>('');
  const [mom, setMom] = useState<ParentInput>(ANONYMOUS_EMPTY_MOM);
  const [dad, setDad] = useState<ParentInput>(ANONYMOUS_EMPTY_DAD);
  const [scenario, setScenario] = useState<ScenarioConfig>(
    ANONYMOUS_EMPTY_SCENARIO
  );

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession>({
    loggedIn: false,
    method: 'Symulacja logowania · eZUS',
    loginTime: '',
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    try {
      return localStorage.getItem('krz-high-contrast') === 'true';
    } catch {
      return false;
    }
  });
  const [largeText, setLargeText] = useState<boolean>(() => {
    try {
      return localStorage.getItem('krz-large-text') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.highContrast = String(highContrast);
    document.documentElement.dataset.largeText = String(largeText);
    try {
      localStorage.setItem('krz-high-contrast', String(highContrast));
      localStorage.setItem('krz-large-text', String(largeText));
    } catch {
      // Ignore storage failures
    }
  }, [highContrast, largeText]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/params')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LegislativeParams | null) => {
        if (!cancelled && data && typeof data.minWage === 'number') {
          setParams({ ...DEFAULT_2026_PARAMS, ...data });
        }
      })
      .catch(() => {
        // Offline / fallback to defaults
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const calmMode = activeTab === 'calm';
  const activePersona =
    PERSONA_PROFILES.find((p) => p.id === activePersonaId) ??
    ANONYMOUS_EMPTY_PERSONA;

  const handleSelectPersona = (id: string) => {
    const found = PERSONA_PROFILES.find((p) => p.id === id);
    if (!found) return;
    setActivePersonaId(found.id);
    setMom(found.mom);
    setDad(found.dad);
    setScenario(found.scenario);
  };

  const handleLoginSuccess = (method: AuthMethod, personaId?: string) => {
    const targetId =
      personaId || activePersonaId || PERSONA_PROFILES[0]!.id;
    handleSelectPersona(targetId);
    setAuthSession({
      loggedIn: true,
      method,
      loginTime: new Date().toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
  };

  const handleLogout = () => {
    setAuthSession({
      loggedIn: false,
      method: 'Symulacja logowania · eZUS',
      loginTime: '',
    });
    setActivePersonaId('');
    setMom(ANONYMOUS_EMPTY_MOM);
    setDad(ANONYMOUS_EMPTY_DAD);
    setScenario(ANONYMOUS_EMPTY_SCENARIO);
  };

  const handleTransferAuditToCalculator = (audit: AuditInput) => {
    setMom({
      ...mom,
      name: authSession.loggedIn
        ? audit.applicantName || mom.name || 'Rodzic 1'
        : 'Rodzic 1',
      title: audit.insuredTitle,
      monthlyGross: audit.monthlyGrossDeclared,
      monthsInsuredLast12: audit.monthsInsuredLast12,
      hasVoluntarySickness: audit.hasVoluntarySickness,
      voluntarySicknessDays: audit.insuranceDaysTotal,
      gapBetweenPeriodsDays: audit.gapBetweenPeriodsDays,
      b2bDebtAmount: audit.b2bDebtAmount,
      payerInsuredCount: audit.payerInsuredCount,
      hasSecondEmploymentTitle: audit.hasSecondEmploymentTitle,
      has10YearsMandatoryInsurance: audit.has10YearsMandatoryInsurance,
    });
    if (!authSession.loggedIn && !dad.name) {
      setDad({
        ...dad,
        name: 'Rodzic 2',
      });
    }
    if (audit.formType === 'ZAS-53') {
      setScenario((prev) => ({
        ...prev,
        scenarioType: 'PREGNANCY_SICKNESS',
        pregnancySickDaysPlanned: Math.max(1, audit.usedSickDaysWithCodeB || 90),
      }));
    }
    setActiveTab('calculator');
  };

  const handleApplyPretermToCalculator = (patch: Partial<ScenarioConfig>) => {
    setScenario((prev) => ({ ...prev, ...patch }));
    setActiveTab('calculator');
  };

  const handleToggleAccessibility = () => {
    const next = !(highContrast || largeText);
    setHighContrast(next);
    setLargeText(next);
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        calmMode ? 'bg-[#F1F5F9] text-[#1E293B]' : 'bg-[#FFFDF7] text-[#1E293B]'
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#0052a5] focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white"
      >
        Przejdź do treści głównej
      </a>

      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        calmMode={calmMode}
        authSession={authSession}
        userName={authSession.loggedIn ? mom.name : ''}
        highContrast={highContrast}
        largeText={largeText}
        onToggleAccessibility={handleToggleAccessibility}
        onOpenLoginModal={() => setLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
          >
        <Suspense
          fallback={
            <div
              role="status"
              className="flex min-h-48 items-center justify-center gap-3 rounded-2xl border border-[#DCECE3] bg-white text-sm font-semibold text-[#475569]"
            >
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#DCECE3] border-t-[#00703C]" />
              Przygotowuję widok…
            </div>
          }
        >
        {activeTab === 'welcome' && (
          <WelcomeView
            authSession={authSession}
            userName={authSession.loggedIn ? mom.name : ''}
            onOpenLoginModal={() => setLoginModalOpen(true)}
            onGoToCalculator={() => setActiveTab('calculator')}
            onGoToAuditor={() => setActiveTab('auditor')}
            onGoToEcosystem={() => setActiveTab('ecosystem')}
            onGoToRag={() => setActiveTab('rag')}
            onGoToAdmin={() => setActiveTab('admin')}
            onGoToCalmMode={() => setActiveTab('calm')}
          />
        )}

        {activeTab === 'calculator' && (
          <CalculatorView
            mom={mom}
            dad={dad}
            scenario={scenario}
            params={params}
            activePersonaId={activePersonaId}
            authSession={authSession}
            onOpenLoginModal={() => setLoginModalOpen(true)}
            onChangeMom={setMom}
            onChangeDad={setDad}
            onChangeScenario={setScenario}
            onGoToDocuments={() => setActiveTab('ecosystem')}
            onGoToCalmMode={() => setActiveTab('calm')}
          />
        )}

        {activeTab === 'auditor' && (
          <AuditPdfView
            params={params}
            onTransferToCalculator={handleTransferAuditToCalculator}
          />
        )}

        {activeTab === 'ecosystem' && (
          <EcosystemView
            persona={activePersona}
            mom={mom}
            dad={dad}
            scenario={scenario}
            params={params}
            authSession={authSession}
            onOpenLoginModal={() => setLoginModalOpen(true)}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'rag' && (
          <LegalRagView law2027Enabled={params.enable2027Law} />
        )}

        {activeTab === 'admin' && (
          <AdminPanelView params={params} onChangeParams={setParams} />
        )}

        {activeTab === 'calm' && (
          <CalmSupportView
            params={params}
            scenario={scenario}
            onApplyPretermToCalculator={handleApplyPretermToCalculator}
          />
        )}
        </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <ZusLoginModal
        isOpen={loginModalOpen}
        activePersonaId={activePersonaId}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
