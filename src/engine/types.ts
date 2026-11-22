export type InsuranceTitle = 'UOP' | 'B2B' | 'ZLECENIE' | 'BRAK';

export type ScenarioType =
  | 'STANDARD'
  | 'PREGNANCY_SICKNESS'
  | 'PRETERM_HOSPITAL'
  | 'ADOPTION'
  | 'FOSTER_CARE'
  | 'STILLBIRTH'
  | 'MOTHER_CRISIS';

export type FormType =
  | 'ZAM'
  | 'Z-3'
  | 'Z-3a'
  | 'ZAS-12'
  | 'ZAS-53'
  | 'Z-15A'
  | 'POSWIADCZENIE'
  | 'ZUR'
  | 'ZAO'
  | 'Z-3b'
  | 'INNY';

export interface LegislativeParams {
  yearLabel: string;
  minWage: number; // 2026: 4806.00
  socialDeductionRate: number; // 0.1371
  avgForecastSalary: number; // 2026: 9420.00 -> 250% = 23550.00
  b2bCapMultiplier: number; // 2.5
  b2bDebtThresholdPct: number; // 0.01 (1% of min wage = 48.06)
  rateMaternity100: number; // 1.0
  rateCombined815: number; // 0.815
  rateParental70: number; // 0.7
  rateSicknessPregnancy: number; // 1.0
  rateSicknessStandard: number; // 0.8
  pitRate: number; // 0.12
  pitThreshold?: number; // 120000.00 (I próg podatkowy PIT)
  pitHigherRate?: number; // 0.32 (II próg podatkowy PIT > 120 000 zł)
  parentalBenefitFloorNet: number; // 1000.00 (art. 31 ust. 3a)
  funeralBenefit: number; // 7000.00 (2026)
  payerInsuredThreshold: number; // 20 (>20 employer, <=20 ZUS)
  enable2027Law: boolean; // Symulacja 01.01.2027 (art. 17 ust. 1d-1e, art. 9 ust. 4)
}

export interface ParentInput {
  name: string;
  title: InsuranceTitle;
  monthlyGross: number; // Average or declared gross
  quarterlyBonusesTotal: number; // Total from last 4 quarters (1/12 added)
  annualBonus: number; // Total annual bonus (1/12 added)
  monthsInsuredLast12: number; // 1..12
  excludedUnder50PctMonths: number; // Months with <50% worked time (excluded from UoP avg)
  fteChangedRecently: boolean; // art. 40 KP/Ustawa zasiłkowa trap
  previousFteGross?: number;
  newFteGross?: number;
  hasVoluntarySickness: boolean; // For B2B / Zlecenie
  voluntarySicknessDays: number; // Waiting period check (90 days)
  gapBetweenPeriodsDays: number; // <= 30 days sums periods
  isUlgaNaStart: boolean;
  hasConcurrentFullMinWageUop: boolean; // Blocks voluntary sickness on B2B
  b2bDebtAmount: number; // Unpaid ZUS debt in PLN
  payerInsuredCount: number; // >20 vs <=20 on Nov 30
  fixedTermContract: boolean;
  isReplacementContract: boolean;
  pregnancyMonthAtContractEnd: number; // >= 4 -> extended under art. 177 § 3 KP
  hasSecondEmploymentTitle: boolean; // Relevant for 2027 law toggle
  b2bContributionTier?: 'STANDARD_60' | 'PREFERENTIAL_30'; // Art. 48a najniższa podstawa (60% średniej vs 30% min.)
  has10YearsMandatoryInsurance?: boolean; // Art. 4 ust. 3 pkt 3 zwolnienie z 30 dni wyczekiwania na UoP
}

export interface ScenarioConfig {
  scenarioType: ScenarioType;
  childrenCount: number; // 1..5
  hasZaZyciem: boolean;
  gestationalWeeks: number; // For preterm art. 180^2
  birthWeightGrams: number; // Lowest birth weight for multiples
  hospitalDays: number; // Longest hospital stay
  fullTermLateHosp: boolean; // >37w hospitalized >=2 days in days 5..28
  adoptedChildAgeYears: number;
  fosterSchoolDeferred?: boolean; // Odroczenie obowiązku szkolnego -> limit 10 lat (Poradnik str. 30)
  pregnancySickDaysPlanned?: number; // L4 z kodem B w ciąży
  employerBankruptcyOrIllegalDismissal?: boolean; // Zasiłek w wysokości zasiłku macierzyńskiego (str. 4 wyzwania)
  momWeeksOnMaternity: number; // Min 14 (or 8 in crisis/transfer)
  dadShareParentalWeeks: number; // Includes 9 non-transferable weeks
  dadTakesPaternity14Days: boolean;
  combineParentalWithWork: boolean;
  workCombinationFraction: number; // 0 .. 0.5
  workCombinationWeeks: number; // Weeks of parental leave combined with work
  noParentalInFirstYear: boolean; // Triggers art. 31 ust. 4 equalization check
  selectedVariant: '81.5' | '100+70';
  applyPit2KwotaWolna: boolean; // 300 PLN/mo tax-free relief
  childAlreadyHasPesel: boolean; // USC § 13 ust. 2-4 check
  expectedDeliveryDate?: string; // ISO YYYY-MM-DD (data porodu / planowana data porodu)
  weeksUntilAdoptionAgeCap?: number; // Pozostałe tygodnie do ukończenia 7/10/14 lat (art. 183 § 3 KP)
}

export interface PregnancyBenefitSummary {
  eligible: boolean;
  waitingPeriodRequiredDays: number;
  waitingPeriodMet: boolean;
  dailyGross100: number;
  monthlyNet100: number;
  employerPaidDays: number; // 33 days (or 14 after age 50) for UoP, 0 for B2B
  zusPaidDays: number;
  maxPeriodDays: number; // 270 days
  rehabEligibleAfter270: boolean;
  maternityLevelPostEmploymentEligible: boolean;
  notes: string[];
}

export interface BaseCalculationDetail {
  eligible: boolean;
  grossInputMonthly: number;
  effectiveMonthlyGross: number;
  bonusMonthlyAddition: number;
  deduction1371: number;
  calculatedBase: number;
  minFloorApplied: boolean;
  maxCapApplied: boolean;
  art48aApplied: boolean;
  art40Applied: boolean;
  notes: string[];
}

export interface LeaveDurations {
  maternityWeeks: number;
  supplementaryMaternityWeeks: number;
  parentalBaseWeeks: number;
  parentalExtendedWeeks: number;
  parentalTotalWeeks: number;
  dadReservedWeeks: number;
  momMaternityWeeks: number;
  momParentalWeeks: number;
  dadParentalWeeks: number;
  dadPaternityWeeks: number;
  combinedEffectiveRatePct: number;
  adoptionAgeBlocked?: boolean;
}

export interface MonthlyTimelineRow {
  monthIndex: number; // 1..N
  label: string;
  phase: string;
  momDays: number;
  dadDays: number;
  momGross: number;
  momNet: number;
  dadGross: number;
  dadNet: number;
  totalNet: number;
  topUpApplied: number;
}

export interface VariantTotals {
  variant: '81.5' | '100+70';
  totalGross: number;
  totalNet: number;
  momTotalNet: number;
  dadTotalNet: number;
  topUpTotalNet: number;
  art31ust4RefundGross: number;
  timeline: MonthlyTimelineRow[];
}

export interface CalculationResult {
  momBase: BaseCalculationDetail;
  dadBase: BaseCalculationDetail;
  pregnancySummary: PregnancyBenefitSummary;
  durations: LeaveDurations;
  variant815: VariantTotals;
  variant10070: VariantTotals;
  recommendedVariant: '81.5' | '100+70';
  netAdvantagePln: number;
  recommendationReason: string;
  payerMom: 'PRACODAWCA' | 'ZUS' | 'BRAK';
  payerDad: 'PRACODAWCA' | 'ZUS' | 'BRAK';
  milestones?: {
    birthDate: string;
    deadline21Days: string;
    maternityEndDate: string;
    parentalEndDate: string;
    paternityDeadlineDate: string;
    zua7DayDeadlineDate?: string;
  };
}

export type RiskSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface RiskAlert {
  id: string;
  severity: RiskSeverity;
  title: string;
  article: string;
  summary: string;
  action: string;
}

export interface AuditInput {
  caseId?: string;
  formType: FormType;
  applicantName: string;
  insuredTitle: InsuranceTitle;
  payerInsuredCount: number;
  insuranceDaysTotal: number;
  gapBetweenPeriodsDays: number;
  hasVoluntarySickness: boolean;
  b2bDebtAmount: number;
  monthlyGrossDeclared: number;
  monthsInsuredLast12: number;
  isPregnancyRelated: boolean;
  usedSickDaysBeforePregnancy: number;
  usedSickDaysWithCodeB: number;
  hasSecondEmploymentTitle: boolean;
  optOutSecondTitleL4_2027: boolean;
  has10YearsMandatoryInsurance?: boolean;
  claimDaysAfterBirth: number;
  submittedViaPue: boolean;
  notes?: string;
}

export interface AuditStep {
  step: string;
  passed: boolean;
  detail: string;
  article: string;
}

export interface AuditVerdict {
  verdict: 'MA PRAWO' | 'BRAK PRAWA' | 'WYMAGA KOREKTY';
  payer: 'PRACODAWCA' | 'ZUS' | 'BRAK';
  legacyFormMappedTo?: 'ZAM';
  legacyFormNotice?: string;
  estimatedBase: number;
  estimatedDaily100: number;
  estimatedDaily815: number;
  estimatedMonthlyNet815: number;
  steps: AuditStep[];
  risks: RiskAlert[];
}

export interface EZlaEntry {
  id: string;
  series: string;
  fromDate: string;
  toDate: string;
  days: number;
  code: 'B' | 'C' | 'BRAK';
  countsToward270: boolean;
  note: string;
}

export interface PersonaProfile {
  id: string;
  label: string;
  shortRole: string;
  peselMask: string;
  /** Synthetic, checksum-invalid PESEL used only in clearly marked test documents. */
  testPesel?: string;
  /** Synthetic PESEL for the second parent, used in paternity-only test documents. */
  testPeselDad?: string;
  mom: ParentInput;
  dad: ParentInput;
  scenario: ScenarioConfig;
  eZlaHistory: EZlaEntry[];
  pueDebt: number;
}

export interface CharityOrg {
  name: string;
  krs: string;
  focus: string;
  phone?: string;
  website: string;
  note: string;
}
