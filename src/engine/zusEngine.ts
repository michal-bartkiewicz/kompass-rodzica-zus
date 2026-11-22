import type {
  AuditInput,
  AuditStep,
  AuditVerdict,
  BaseCalculationDetail,
  CalculationResult,
  LeaveDurations,
  LegislativeParams,
  MonthlyTimelineRow,
  ParentInput,
  PregnancyBenefitSummary,
  RiskAlert,
  ScenarioConfig,
  VariantTotals,
} from './types.ts';

function round2(val: number): number {
  return Math.round((val + 1e-8) * 100) / 100;
}

export function roundPln(val: number): number {
  return Math.round(val);
}

const PL_MONTH_SHORT = [
  'Sty',
  'Lut',
  'Mar',
  'Kwi',
  'Maj',
  'Cze',
  'Lip',
  'Sie',
  'Wrz',
  'Paź',
  'Lis',
  'Gru',
];

export function parseIsoDate(iso?: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

export function addDaysIso(iso: string, days: number): string {
  const dt = parseIsoDate(iso);
  if (!dt) return '';
  dt.setUTCDate(dt.getUTCDate() + days);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatPlDate(iso?: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

/**
 * Computes benefit base ("podstawa wymiaru zasiłku") deterministically
 * according to Ustawa zasiłkowa (UoP & non-UoP rules).
 */
export function calculateBenefitBase(
  parent: ParentInput,
  params: LegislativeParams
): BaseCalculationDetail {
  if (parent.title === 'BRAK') {
    return {
      eligible: false,
      grossInputMonthly: 0,
      effectiveMonthlyGross: 0,
      bonusMonthlyAddition: 0,
      deduction1371: 0,
      calculatedBase: 0,
      minFloorApplied: false,
      maxCapApplied: false,
      art48aApplied: false,
      art40Applied: false,
      notes: ['Brak aktywnego tytułu do ubezpieczenia chorobowego.'],
    };
  }

  const notes: string[] = [];
  const minBaseFloor = round2(params.minWage * (1 - params.socialDeductionRate));
  const maxGrossCap = round2(params.avgForecastSalary * params.b2bCapMultiplier);
  const maxBaseCap = round2(maxGrossCap * (1 - params.socialDeductionRate));

  // Check B2B / Zlecenie eligibility hurdles
  if (parent.title === 'B2B' || parent.title === 'ZLECENIE') {
    if (!parent.hasVoluntarySickness) {
      return {
        eligible: false,
        grossInputMonthly: parent.monthlyGross,
        effectiveMonthlyGross: 0,
        bonusMonthlyAddition: 0,
        deduction1371: 0,
        calculatedBase: 0,
        minFloorApplied: false,
        maxCapApplied: false,
        art48aApplied: false,
        art40Applied: false,
        notes: [
          'Brak zgłoszenia do dobrowolnego ubezpieczenia chorobowego — brak prawa do zasiłku.',
        ],
      };
    }
    if (parent.title === 'B2B' && parent.isUlgaNaStart) {
      return {
        eligible: false,
        grossInputMonthly: parent.monthlyGross,
        effectiveMonthlyGross: 0,
        bonusMonthlyAddition: 0,
        deduction1371: 0,
        calculatedBase: 0,
        minFloorApplied: false,
        maxCapApplied: false,
        art48aApplied: false,
        art40Applied: false,
        notes: [
          'Ulga na start wyklucza podleganie ubezpieczeniom społecznym (w tym chorobowemu).',
        ],
      };
    }
    if (parent.title === 'B2B' && parent.hasConcurrentFullMinWageUop) {
      notes.push(
        'Zbieg z pełnym etatem (>= płacy minimalnej): z działalności B2B składka chorobowa nie przysługuje (podstawa liczona z etatu).'
      );
    }
  }

  if (parent.title === 'UOP') {
    let workingGross = Math.max(0, parent.monthlyGross);
    let art40Applied = false;

    if (parent.fteChangedRecently && parent.newFteGross && parent.newFteGross > 0) {
      workingGross = parent.newFteGross;
      art40Applied = true;
      notes.push(
        `Art. 40 ustawy zasiłkowej: po zmianie wymiaru etatu do podstawy przyjęto wyłącznie wynagrodzenie po zmianie (${round2(workingGross).toFixed(2)} zł).`
      );
    }

    if (parent.excludedUnder50PctMonths > 0) {
      notes.push(
        `Art. 38 ust. 2: wyłączono ${parent.excludedUnder50PctMonths} mies. z nieobecnością >50% wymiaru czasu pracy.`
      );
    }

    const bonusMonthlyAddition = round2(
      Math.max(0, parent.quarterlyBonusesTotal) / 12 +
        Math.max(0, parent.annualBonus) / 12
    );
    if (bonusMonthlyAddition > 0) {
      notes.push(
        `Składniki kwartalne i roczne doliczono w wysokości 1/12 (+${bonusMonthlyAddition.toFixed(2)} zł brutto/mies.).`
      );
    }

    const effectiveMonthlyGross = round2(workingGross + bonusMonthlyAddition);
    let calculatedBase = round2(
      effectiveMonthlyGross * (1 - params.socialDeductionRate)
    );
    const deduction1371 = round2(effectiveMonthlyGross - calculatedBase);

    let minFloorApplied = false;
    if (calculatedBase < minBaseFloor) {
      calculatedBase = minBaseFloor;
      minFloorApplied = true;
      notes.push(
        `Art. 45: podstawa podniesiona do gwarantowanego minimum dla pełnego etatu (${minBaseFloor.toFixed(2)} zł).`
      );
    }

    return {
      eligible: true,
      grossInputMonthly: parent.monthlyGross,
      effectiveMonthlyGross,
      bonusMonthlyAddition,
      deduction1371,
      calculatedBase,
      minFloorApplied,
      maxCapApplied: false,
      art48aApplied: false,
      art40Applied,
      notes,
    };
  }

  // Non-UoP (B2B / ZLECENIE)
  let cappedGross = Math.max(0, parent.monthlyGross);
  let maxCapApplied = false;
  if (cappedGross > maxGrossCap) {
    cappedGross = maxGrossCap;
    maxCapApplied = true;
    notes.push(
      `Limit 250% przeciętnego wynagrodzenia: przychód do podstawy ograniczono do ${maxGrossCap.toFixed(2)} zł.`
    );
  }

  const rawBase = round2(cappedGross * (1 - params.socialDeductionRate));
  const deduction1371 = round2(cappedGross - rawBase);

  // Art. 48a ust. 1 i 5: averaging when B2B insured < 12 full calendar months above lowest statutory base:
  // - Standard ZUS (art. 18 ust. 8 SUS): 60% prognozowanego przeciętnego wynagrodzenia (5 652,00 zł -> 4 877,11 zł netto podstawy)
  // - Preferencyjny Mały ZUS (art. 18a SUS): 30% płacy minimalnej (1 441,80 zł -> 1 244,13 zł netto podstawy)
  let calculatedBase = rawBase;
  let art48aApplied = false;
  const fullMonths = Math.max(1, Math.min(12, Math.round(parent.monthsInsuredLast12)));
  const b2bTier = parent.b2bContributionTier ?? 'STANDARD_60';
  const b2bFloorGross =
    b2bTier === 'PREFERENTIAL_30'
      ? round2(0.3 * params.minWage)
      : round2(0.6 * params.avgForecastSalary);
  const b2bMinFloorBase = round2(b2bFloorGross * (1 - params.socialDeductionRate));

  if (parent.title === 'B2B' && fullMonths < 12 && rawBase > b2bMinFloorBase) {
    const excessOverFloor = rawBase - b2bMinFloorBase;
    calculatedBase = round2(b2bMinFloorBase + (excessOverFloor * fullMonths) / 12);
    art48aApplied = true;
    notes.push(
      `Art. 48a: przy stażu ${fullMonths}/12 mies. nadwyżka ponad najniższą podstawę (${b2bTier === 'PREFERENTIAL_30' ? '30% min.' : '60% prognozowanej'} = ${b2bMinFloorBase.toFixed(2)} zł) została uśredniona proporcjonalnie (1/12 za każdy miesiąc ubezpieczenia).`
    );
  }

  if (calculatedBase > maxBaseCap) {
    calculatedBase = maxBaseCap;
    maxCapApplied = true;
  }

  return {
    eligible: true,
    grossInputMonthly: parent.monthlyGross,
    effectiveMonthlyGross: cappedGross,
    bonusMonthlyAddition: 0,
    deduction1371,
    calculatedBase,
    minFloorApplied: false,
    maxCapApplied,
    art48aApplied,
    art40Applied: false,
    notes,
  };
}

/**
 * Oblicza uprawnienia i kwoty świadczeń w czasie ciąży (L4 kod B, okres wyczekiwania,
 * limit 270 dni, świadczenie rehabilitacyjne oraz zasiłek w wysokości macierzyńskiego po upadłości pracodawcy).
 */
export function calculatePregnancyBenefits(
  mom: ParentInput,
  scenario: ScenarioConfig,
  params: LegislativeParams
): PregnancyBenefitSummary {
  const notes: string[] = [];
  const baseDetail = calculateBenefitBase(mom, params);
  const debtLimit = round2((params.minWage * params.b2bDebtThresholdPct) / 100);
  const debtBlocked = mom.title === 'B2B' && mom.b2bDebtAmount > debtLimit;

  const waitingPeriodRequiredDays =
    mom.title === 'UOP'
      ? mom.has10YearsMandatoryInsurance
        ? 0
        : 30
      : mom.title === 'B2B' || mom.title === 'ZLECENIE'
        ? 90
        : 0;

  const waitingPeriodMet =
    mom.title !== 'BRAK' &&
    baseDetail.eligible &&
    mom.voluntarySicknessDays >= waitingPeriodRequiredDays &&
    mom.gapBetweenPeriodsDays <= 30;

  const maternityLevelPostEmploymentEligible = Boolean(
    scenario.employerBankruptcyOrIllegalDismissal && mom.title !== 'BRAK'
  );

  const eligible = baseDetail.eligible && waitingPeriodMet && !debtBlocked;

  const dailyGross100 = eligible
    ? round2((baseDetail.calculatedBase / 30) * params.rateSicknessPregnancy)
    : 0;
  const monthlyNet100 = eligible
    ? calcNetFromGross(
        round2(dailyGross100 * 30),
        params,
        scenario.applyPit2KwotaWolna
      )
    : 0;

  const plannedDays = Math.max(
    1,
    Math.min(270, Math.round(scenario.pregnancySickDaysPlanned ?? 90))
  );
  const employerPaidDays =
    eligible && mom.title === 'UOP' ? Math.min(33, plannedDays) : 0;
  const zusPaidDays = eligible ? Math.max(0, plannedDays - employerPaidDays) : 0;

  if (mom.title === 'BRAK') {
    notes.push(
      'Brak ubezpieczenia chorobowego — zasiłek chorobowy w ciąży nie przysługuje.'
    );
  } else if (!waitingPeriodMet) {
    notes.push(
      `Niespełniony okres wyczekiwania: wymagane ${waitingPeriodRequiredDays} dni nieprzerwanego ubezpieczenia (lub przerwa ≤ 30 dni).`
    );
  } else if (debtBlocked) {
    notes.push(
      `Zaległość składkowa B2B (${mom.b2bDebtAmount.toFixed(2)} zł > ${debtLimit.toFixed(2)} zł) wstrzymuje prawo do zasiłku chorobowego do czasu spłaty.`
    );
  } else {
    notes.push(
      'Zwolnienie lekarskie w ciąży z kodem „B” płatne jest w wysokości 100% podstawy wymiaru (maksymalnie przez 270 dni).'
    );
  }

  if (mom.title === 'UOP' && eligible) {
    notes.push(
      'Pierwsze 33 dni niezdolności do pracy w roku kalendarzowym (14 dni po ukończeniu 50 r.ż.) finansuje pracodawca jako wynagrodzenie chorobowe, a od 34. dnia zasiłek wypłaca ZUS/płatnik z FUS.'
    );
  } else if ((mom.title === 'B2B' || mom.title === 'ZLECENIE') && eligible) {
    notes.push(
      'Dla działalności B2B i umowy zlecenia nie ma 33 dni wynagrodzenia chorobowego — zasiłek chorobowy od 1. dnia e-ZLA wypłaca ZUS.'
    );
  }

  notes.push(
    'Wcześniejsze zwolnienie chorobowe przed ciążą (bez kodu B) nie wlicza się do nowego, 270-dniowego okresu zasiłkowego przypadającego na ciążę.'
  );
  notes.push(
    'Przed porodem możesz wykorzystać do 6 tygodni urlopu macierzyńskiego (wniosek min. 14 dni wcześniej), a po 270 dniach L4 przysługuje 100% świadczenia rehabilitacyjnego do dnia porodu.'
  );

  if (maternityLevelPostEmploymentEligible) {
    notes.push(
      'Upadłość/likwidacja pracodawcy lub bezprawne rozwiązanie umowy w ciąży: przysługuje zasiłek w wysokości zasiłku macierzyńskiego (100%) aż do dnia porodu, a następnie pełny zasiłek macierzyński.'
    );
  }

  return {
    eligible,
    waitingPeriodRequiredDays,
    waitingPeriodMet,
    dailyGross100,
    monthlyNet100,
    employerPaidDays,
    zusPaidDays,
    maxPeriodDays: 270,
    rehabEligibleAfter270: eligible,
    maternityLevelPostEmploymentEligible,
    notes,
  };
}

/**
 * Art. 180^2 KP: Uzupełniający urlop macierzyński dla rodziców wcześniaków i dzieci hospitalizowanych.
 */
export function calculateSupplementaryMaternityWeeks(
  scenario: ScenarioConfig
): number {
  if (
    scenario.scenarioType === 'STILLBIRTH' ||
    scenario.scenarioType === 'ADOPTION' ||
    scenario.scenarioType === 'FOSTER_CARE' ||
    scenario.scenarioType === 'PREGNANCY_SICKNESS'
  ) {
    return 0;
  }
  const days = Math.max(0, Math.round(scenario.hospitalDays));
  if (days === 0) return 0;

  // < 28 weeks OR <= 1000g -> up to 15 weeks (1 week per started 7 days of hospital stay)
  if (scenario.gestationalWeeks < 28 || scenario.birthWeightGrams <= 1000) {
    return Math.min(15, Math.ceil(days / 7));
  }

  // 28-37 weeks AND > 1000g -> up to 8 weeks
  if (scenario.gestationalWeeks >= 28 && scenario.gestationalWeeks <= 37) {
    return Math.min(8, Math.ceil(days / 7));
  }

  // > 37 weeks: requires >= 2 consecutive hospital days starting between day 5 and day 28
  if (scenario.gestationalWeeks > 37 && scenario.fullTermLateHosp && days >= 2) {
    return Math.min(8, Math.ceil(days / 7));
  }

  return 0;
}

/**
 * Computes exact leave durations for both parents including Za życiem, adoption/foster age limits & art. 182^1f § 7 extension.
 */
export function calculateLeaveDurations(
  scenario: ScenarioConfig,
  momEligible: boolean,
  dadEligible: boolean
): LeaveDurations {
  if (scenario.scenarioType === 'STILLBIRTH') {
    return {
      maternityWeeks: 8,
      supplementaryMaternityWeeks: 0,
      parentalBaseWeeks: 0,
      parentalExtendedWeeks: 0,
      parentalTotalWeeks: 0,
      dadReservedWeeks: 0,
      momMaternityWeeks: momEligible ? 8 : 0,
      momParentalWeeks: 0,
      dadParentalWeeks: 0,
      dadPaternityWeeks: 0,
      combinedEffectiveRatePct: 100,
    };
  }

  const isAdoption = scenario.scenarioType === 'ADOPTION';
  const isFoster = scenario.scenarioType === 'FOSTER_CARE';
  const fosterMaxAge = scenario.fosterSchoolDeferred ? 10 : 7;
  const ageExceeded =
    (isAdoption && scenario.adoptedChildAgeYears > 14) ||
    (isFoster && scenario.adoptedChildAgeYears > fosterMaxAge);

  if (ageExceeded) {
    return {
      maternityWeeks: 0,
      supplementaryMaternityWeeks: 0,
      parentalBaseWeeks: 0,
      parentalExtendedWeeks: 0,
      parentalTotalWeeks: 0,
      dadReservedWeeks: 0,
      momMaternityWeeks: 0,
      momParentalWeeks: 0,
      dadParentalWeeks: 0,
      dadPaternityWeeks: 0,
      combinedEffectiveRatePct: 100,
      adoptionAgeBlocked: true,
    };
  }

  const count = Math.max(1, Math.min(5, scenario.childrenCount));
  let maternityWeeks = 20;
  if (count === 2) maternityWeeks = 31;
  else if (count === 3) maternityWeeks = 33;
  else if (count === 4) maternityWeeks = 35;
  else if (count >= 5) maternityWeeks = 37;

  const shortenedByAgeCap =
    (isAdoption || isFoster) &&
    typeof scenario.weeksUntilAdoptionAgeCap === 'number' &&
    scenario.weeksUntilAdoptionAgeCap >= 0 &&
    scenario.weeksUntilAdoptionAgeCap < maternityWeeks;

  if (shortenedByAgeCap) {
    // Art. 183 § 3 KP: nie krócej niż 9 tygodni, nawet gdy zbliża się granica 7/10/14 lat
    maternityWeeks = Math.max(9, Math.floor(scenario.weeksUntilAdoptionAgeCap!));
  } else if ((isAdoption || isFoster) && scenario.adoptedChildAgeYears >= 7) {
    maternityWeeks = Math.max(9, maternityWeeks);
  }

  const supplementaryMaternityWeeks =
    calculateSupplementaryMaternityWeeks(scenario);

  // Parental leave base: 41w (1 child) / 43w (2+), 38w when shortened under art. 183 § 4,
  // or 65w / 67w with Za życiem (62w for adoption/foster under Za życiem — Poradnik ZUS str. 32)
  let parentalBaseWeeks = count === 1 ? 41 : 43;
  if (shortenedByAgeCap && !scenario.hasZaZyciem) {
    parentalBaseWeeks = 38;
  }
  if (scenario.hasZaZyciem) {
    if (isAdoption || isFoster) {
      parentalBaseWeeks = 62;
    } else {
      parentalBaseWeeks = count === 1 ? 65 : 67;
    }
  }

  const dadReservedWeeks = dadEligible ? 9 : 0;

  // Mom must take at least 14w maternity (or 8w in maternal crisis)
  const minMomMat = scenario.scenarioType === 'MOTHER_CRISIS' ? 8 : 14;
  const momMaternityWeeks = momEligible
    ? Math.max(minMomMat, Math.min(maternityWeeks, scenario.momWeeksOnMaternity))
    : 0;

  const dadShareTarget = dadEligible
    ? Math.max(dadReservedWeeks, Math.min(parentalBaseWeeks, scenario.dadShareParentalWeeks))
    : 0;

  const momParentalBaseWeeks = momEligible
    ? Math.max(0, parentalBaseWeeks - dadShareTarget)
    : 0;

  // Art. 182^1f § 7 KP work-combination extension (applied to Mom's parental portion or combined block)
  let parentalExtendedWeeks = 0;
  const maxParentalCeiling = scenario.hasZaZyciem
    ? isAdoption || isFoster
      ? 124
      : count === 1
        ? 130
        : 134
    : count === 1
      ? 82
      : 86;

  if (
    scenario.combineParentalWithWork &&
    scenario.workCombinationFraction > 0 &&
    scenario.workCombinationFraction <= 0.5 &&
    scenario.workCombinationWeeks > 0
  ) {
    const combinedWeeks = Math.min(
      momParentalBaseWeeks,
      scenario.workCombinationWeeks
    );
    // Art. 182^1f § 7: if continuing to work during the extended portion, total duration = W / (1 - f)
    const expanded = Math.round(
      combinedWeeks / (1 - scenario.workCombinationFraction)
    );
    const bonus = Math.max(0, expanded - combinedWeeks);
    parentalExtendedWeeks = Math.min(
      bonus,
      maxParentalCeiling - parentalBaseWeeks
    );
  }

  const momParentalWeeks = momParentalBaseWeeks + parentalExtendedWeeks;
  const parentalTotalWeeks = momParentalWeeks + dadShareTarget;
  const dadPaternityWeeks =
    dadEligible && scenario.dadTakesPaternity14Days ? 2 : 0;

  const combinedEffectiveRatePct = scenario.combineParentalWithWork
    ? round2((1 - scenario.workCombinationFraction) * 100)
    : 100;

  return {
    maternityWeeks,
    supplementaryMaternityWeeks,
    parentalBaseWeeks,
    parentalExtendedWeeks,
    parentalTotalWeeks,
    dadReservedWeeks,
    momMaternityWeeks,
    momParentalWeeks,
    dadParentalWeeks: dadShareTarget,
    dadPaternityWeeks,
    combinedEffectiveRatePct,
    adoptionAgeBlocked: false,
  };
}

function calcNetFromGross(
  grossMonthly: number,
  params: LegislativeParams,
  applyPit2: boolean,
  annualGrossSoFar = 0
): number {
  if (grossMonthly <= 0) return 0;
  const threshold = params.pitThreshold ?? 120000;
  const higherRate = params.pitHigherRate ?? 0.32;
  const remainingLowerRoom = Math.max(0, threshold - annualGrossSoFar);
  const lowerPart = Math.min(grossMonthly, remainingLowerRoom);
  const higherPart = Math.max(0, grossMonthly - lowerPart);
  const rawTax = roundPln(lowerPart * params.pitRate + higherPart * higherRate);
  const tax = applyPit2 ? Math.max(0, rawTax - 300) : rawTax;
  return round2(grossMonthly - tax);
}

function buildVariantSimulation(
  variant: '81.5' | '100+70',
  momBase: BaseCalculationDetail,
  dadBase: BaseCalculationDetail,
  durations: LeaveDurations,
  scenario: ScenarioConfig,
  params: LegislativeParams
): VariantTotals {
  const timeline: MonthlyTimelineRow[] = [];

  const momDailyBase = momBase.eligible ? momBase.calculatedBase / 30 : 0;
  const dadDailyBase = dadBase.eligible ? dadBase.calculatedBase / 30 : 0;

  const momMatDays =
    (durations.momMaternityWeeks + durations.supplementaryMaternityWeeks) * 7;

  // Split Mom's parental leave into uncombined phase (full rate) + combined phase (reduced rate)
  const momParentalBaseWeeks = Math.max(
    0,
    durations.momParentalWeeks - durations.parentalExtendedWeeks
  );
  const hasCombined =
    scenario.combineParentalWithWork &&
    scenario.workCombinationFraction > 0 &&
    scenario.workCombinationFraction <= 0.5 &&
    scenario.workCombinationWeeks > 0;
  const combinedBaseWeeks = hasCombined
    ? Math.min(momParentalBaseWeeks, scenario.workCombinationWeeks)
    : 0;
  const momParUncombinedWeeks = Math.max(0, momParentalBaseWeeks - combinedBaseWeeks);
  const momParCombinedWeeks = hasCombined
    ? combinedBaseWeeks + durations.parentalExtendedWeeks
    : 0;

  const momParUncombinedDays = momParUncombinedWeeks * 7;
  const momParCombinedDays = momParCombinedWeeks * 7;
  const momParDays = momParUncombinedDays + momParCombinedDays;
  const dadParDays = durations.dadParentalWeeks * 7;
  const dadPatDays = durations.dadPaternityWeeks * 7;

  // Determine Mom's rates per phase
  const momMatRate =
    variant === '81.5' ? params.rateCombined815 : params.rateMaternity100;
  const momParRateRaw =
    variant === '81.5' ? params.rateCombined815 : params.rateParental70;
  const momParCombinedRate = hasCombined
    ? round2(momParRateRaw * (1 - scenario.workCombinationFraction))
    : momParRateRaw;

  const totalMomDays = momMatDays + momParDays;
  const totalDadDays = dadParDays + dadPatDays;
  const totalMonths = Math.max(
    1,
    Math.ceil(Math.max(totalMomDays, totalDadDays) / 30)
  );

  const startBirthDate = parseIsoDate(scenario.expectedDeliveryDate);
  const getMonthMeta = (monthNumber: number): { label: string; yearKey: number } => {
    if (!startBirthDate) {
      return {
        label: `Mies. ${monthNumber}`,
        yearKey: Math.floor((monthNumber - 1) / 12),
      };
    }
    const targetMonthDate = new Date(
      Date.UTC(
        startBirthDate.getUTCFullYear(),
        startBirthDate.getUTCMonth() + (monthNumber - 1),
        1
      )
    );
    const y = targetMonthDate.getUTCFullYear();
    const mIdx = targetMonthDate.getUTCMonth();
    return {
      label: `${PL_MONTH_SHORT[mIdx]} ${y}`,
      yearKey: y,
    };
  };

  let remMomMat = momMatDays;
  let remMomParUncombined = momParUncombinedDays;
  let remMomParCombined = momParCombinedDays;
  let remDadPat = dadPatDays;
  let remDadPar = dadParDays;

  let totalGross = 0;
  let totalNet = 0;
  let momTotalNet = 0;
  let dadTotalNet = 0;
  let topUpTotalNet = 0;

  let currentYearKey: number | null = null;
  let momAnnualGross = 0;
  let dadAnnualGross = 0;

  for (let m = 1; m <= totalMonths; m++) {
    const meta = getMonthMeta(m);
    if (currentYearKey !== meta.yearKey) {
      currentYearKey = meta.yearKey;
      momAnnualGross = 0;
      dadAnnualGross = 0;
    }

    const takeMomMat = Math.min(30, remMomMat);
    remMomMat -= takeMomMat;
    let freeSlotsMom = 30 - takeMomMat;
    const takeMomParUncombined = Math.min(freeSlotsMom, remMomParUncombined);
    remMomParUncombined -= takeMomParUncombined;
    freeSlotsMom -= takeMomParUncombined;
    const takeMomParCombined = Math.min(freeSlotsMom, remMomParCombined);
    remMomParCombined -= takeMomParCombined;
    const takeMomPar = takeMomParUncombined + takeMomParCombined;

    // Dad takes paternity early (month 1) and parental after Mom or concurrent
    const takeDadPat = m === 1 ? Math.min(30, remDadPat) : 0;
    remDadPat -= takeDadPat;

    const remMomParTotal = remMomParUncombined + remMomParCombined;
    let takeDadPar = 0;
    if (remMomMat === 0 && remMomParTotal <= 30) {
      takeDadPar = Math.min(30 - takeDadPat, remDadPar);
      remDadPar -= takeDadPar;
    } else if (m === totalMonths && remDadPar > 0) {
      takeDadPar = Math.min(30 - takeDadPat, remDadPar);
      remDadPar -= takeDadPar;
    }

    const momDays = takeMomMat + takeMomPar;
    const dadDays = takeDadPat + takeDadPar;

    const momGross = round2(
      takeMomMat * momDailyBase * momMatRate +
        takeMomParUncombined * momDailyBase * momParRateRaw +
        takeMomParCombined * momDailyBase * momParCombinedRate
    );
    let momNet =
      momDays > 0
        ? calcNetFromGross(
            momGross,
            params,
            scenario.applyPit2KwotaWolna,
            momAnnualGross
          )
        : 0;
    momAnnualGross = round2(momAnnualGross + momGross);

    // Art. 31 ust. 3a top-up to 1000 PLN net if active full month < 1000 PLN
    let topUpApplied = 0;
    if (
      momDays >= 28 &&
      momNet > 0 &&
      momNet < params.parentalBenefitFloorNet
    ) {
      topUpApplied = round2(params.parentalBenefitFloorNet - momNet);
      momNet = params.parentalBenefitFloorNet;
    }

    const dadGross = round2(
      takeDadPat * dadDailyBase * params.rateMaternity100 +
        takeDadPar * dadDailyBase * params.rateParental70
    );
    const dadNet =
      dadDays > 0
        ? calcNetFromGross(
            dadGross,
            params,
            scenario.applyPit2KwotaWolna,
            dadAnnualGross
          )
        : 0;
    dadAnnualGross = round2(dadAnnualGross + dadGross);

    let phase = 'Urlop rodzicielski';
    if (takeMomMat > 0 && takeDadPat > 0) {
      phase = 'Macierzyński + Ojcowski';
    } else if (takeMomMat > 0) {
      phase =
        m * 7 > durations.maternityWeeks * 7 &&
        durations.supplementaryMaternityWeeks > 0
          ? 'Uzupełniający macierzyński'
          : 'Urlop macierzyński';
    } else if (takeMomParCombined > 0 && takeMomParUncombined === 0) {
      phase = 'Rodzicielski + praca (wydłużony)';
    } else if (takeDadPar > 0 && takeMomPar === 0) {
      phase = '9 tyg. drugiego rodzica (70%)';
    }

    const monthTotalNet = round2(momNet + dadNet);

    totalGross = round2(totalGross + momGross + dadGross);
    totalNet = round2(totalNet + monthTotalNet);
    momTotalNet = round2(momTotalNet + momNet);
    dadTotalNet = round2(dadTotalNet + dadNet);
    topUpTotalNet = round2(topUpTotalNet + topUpApplied);

    timeline.push({
      monthIndex: m,
      label: meta.label,
      phase,
      momDays,
      dadDays,
      momGross,
      momNet,
      dadGross,
      dadNet,
      totalNet: monthTotalNet,
      topUpApplied,
    });
  }

  // Handle any remaining dad parental days if Mom finished later
  while (remDadPar > 0) {
    const nextIdx = timeline.length + 1;
    const meta = getMonthMeta(nextIdx);
    if (currentYearKey !== meta.yearKey) {
      currentYearKey = meta.yearKey;
      dadAnnualGross = 0;
    }

    const takeDadPar = Math.min(30, remDadPar);
    remDadPar -= takeDadPar;
    const dadGross = round2(takeDadPar * dadDailyBase * params.rateParental70);
    const dadNet = calcNetFromGross(
      dadGross,
      params,
      scenario.applyPit2KwotaWolna,
      dadAnnualGross
    );
    dadAnnualGross = round2(dadAnnualGross + dadGross);

    totalGross = round2(totalGross + dadGross);
    totalNet = round2(totalNet + dadNet);
    dadTotalNet = round2(dadTotalNet + dadNet);
    timeline.push({
      monthIndex: nextIdx,
      label: meta.label,
      phase: '9 tyg. drugiego rodzica (70%)',
      momDays: 0,
      dadDays: takeDadPar,
      momGross: 0,
      momNet: 0,
      dadGross,
      dadNet,
      totalNet: dadNet,
      topUpApplied: 0,
    });
  }

  // Art. 31 ust. 4: one-time equalization to 100% if 81.5% chosen and NO parental leave taken in 1st year
  let art31ust4RefundGross = 0;
  if (
    variant === '81.5' &&
    scenario.noParentalInFirstYear &&
    momBase.eligible
  ) {
    const diffRate = params.rateMaternity100 - params.rateCombined815;
    art31ust4RefundGross = round2(momMatDays * momDailyBase * diffRate);
  }

  return {
    variant,
    totalGross,
    totalNet,
    momTotalNet,
    dadTotalNet,
    topUpTotalNet,
    art31ust4RefundGross,
    timeline,
  };
}

/**
 * Full dual-parent simulation comparing 81.5% vs 100%+70%.
 */
export function simulateDualParentPlan(
  mom: ParentInput,
  dad: ParentInput,
  scenario: ScenarioConfig,
  params: LegislativeParams
): CalculationResult {
  const momBase = calculateBenefitBase(mom, params);
  const dadBase = calculateBenefitBase(dad, params);
  const pregnancySummary = calculatePregnancyBenefits(mom, scenario, params);

  // Check B2B debt disqualification for calculation clarity
  const debtLimit = round2((params.minWage * params.b2bDebtThresholdPct) / 100);
  const momDebtBlocked = mom.title === 'B2B' && mom.b2bDebtAmount > debtLimit;
  const dadDebtBlocked = dad.title === 'B2B' && dad.b2bDebtAmount > debtLimit;

  const effectiveMomEligible = momBase.eligible && !momDebtBlocked;
  const effectiveDadEligible = dadBase.eligible && !dadDebtBlocked;

  const durations = calculateLeaveDurations(
    scenario,
    effectiveMomEligible,
    effectiveDadEligible
  );

  const variant815 = buildVariantSimulation(
    '81.5',
    { ...momBase, eligible: effectiveMomEligible },
    { ...dadBase, eligible: effectiveDadEligible },
    durations,
    scenario,
    params
  );

  const variant10070 = buildVariantSimulation(
    '100+70',
    { ...momBase, eligible: effectiveMomEligible },
    { ...dadBase, eligible: effectiveDadEligible },
    durations,
    scenario,
    params
  );

  const diff = round2(variant815.totalNet - variant10070.totalNet);
  const recommendedVariant = diff >= 0 ? '81.5' : '100+70';
  const netAdvantagePln = Math.abs(diff);

  let recommendationReason = '';
  if (durations.adoptionAgeBlocked) {
    recommendationReason =
      scenario.scenarioType === 'FOSTER_CARE'
        ? `Przekroczono ustawowy limit wieku dziecka w rodzinie zastępczej niezawodowej (${scenario.fosterSchoolDeferred ? '10 lat przy odroczeniu obowiązku szkolnego' : '7 lat'}). Zasiłek na warunkach urlopu macierzyńskiego i rodzicielskiego nie przysługuje.`
        : 'Przekroczono ustawowy limit wieku dziecka przy adopcji (14 lat). Zasiłek na warunkach urlopu macierzyńskiego i urlop rodzicielski nie przysługują.';
  } else if (scenario.scenarioType === 'STILLBIRTH') {
    recommendationReason =
      'W przypadku urodzenia martwego przysługuje 8 tygodni zasiłku macierzyńskiego w wysokości 100% podstawy oraz zasiłek pogrzebowy 7 000 zł.';
  } else if (scenario.scenarioType === 'PREGNANCY_SICKNESS') {
    recommendationReason = pregnancySummary.eligible
      ? `W ciąży przysługuje 100% zasiłku chorobowego z kodem B (${pregnancySummary.monthlyNet100.toLocaleString('pl-PL')} zł netto/mies.) do 270 dni, a następnie porównany poniżej zasiłek po porodzie.`
      : 'Brak prawa do zasiłku chorobowego w ciąży (sprawdź okres wyczekiwania 30/90 dni lub zaległość B2B). Poniżej symulacja świadczeń po porodzie.';
  } else if (netAdvantagePln < 0.01) {
    recommendationReason = `Oba warianty dają identyczną kwotę netto (${variant815.totalNet.toLocaleString('pl-PL')} zł) — np. gdy zasiłek pobiera wyłącznie drugi rodzic za nieprzenoszalną część urlopu rodzicielskiego (70%).`;
  } else if (recommendedVariant === '81.5') {
    recommendationReason = `Wariant 81,5% (wniosek w ciągu 21 dni od porodu) daje stabilne wypłaty i jest korzystniejszy netto o ${netAdvantagePln.toLocaleString('pl-PL')} zł (uwzględniając podatek PIT oraz gwarantowane 70% dla drugiego rodzica).`;
  } else {
    recommendationReason = `Wariant 100% + 70% pozwala zyskać o ${netAdvantagePln.toLocaleString('pl-PL')} zł netto więcej — głównie dzięki wyższej kwocie wolnej/progom podatkowym lub krótszemu urlopowi rodzicielskiemu matki.`;
  }

  const payerMom = !effectiveMomEligible
    ? 'BRAK'
    : mom.title === 'UOP' && mom.payerInsuredCount > params.payerInsuredThreshold
      ? 'PRACODAWCA'
      : 'ZUS';

  const payerDad = !effectiveDadEligible
    ? 'BRAK'
    : dad.title === 'UOP' && dad.payerInsuredCount > params.payerInsuredThreshold
      ? 'PRACODAWCA'
      : 'ZUS';

  let milestones: CalculationResult['milestones'];
  if (
    scenario.expectedDeliveryDate &&
    parseIsoDate(scenario.expectedDeliveryDate)
  ) {
    const isoBirth = scenario.expectedDeliveryDate;
    const matAndSuppDays = Math.max(
      1,
      (durations.momMaternityWeeks + durations.supplementaryMaternityWeeks) * 7
    );
    const parentalDays = durations.momParentalWeeks * 7;
    const totalMomBenefitDays = matAndSuppDays + parentalDays;
    milestones = {
      birthDate: formatPlDate(isoBirth),
      deadline21Days: formatPlDate(addDaysIso(isoBirth, 21)),
      maternityEndDate: formatPlDate(addDaysIso(isoBirth, matAndSuppDays - 1)),
      parentalEndDate: formatPlDate(
        addDaysIso(isoBirth, totalMomBenefitDays - 1)
      ),
      paternityDeadlineDate: formatPlDate(addDaysIso(isoBirth, 365)),
      ...(mom.title === 'B2B' || mom.title === 'ZLECENIE'
        ? {
            zua7DayDeadlineDate: formatPlDate(
              addDaysIso(isoBirth, totalMomBenefitDays + 6)
            ),
          }
        : {}),
    };
  }

  return {
    momBase,
    dadBase,
    pregnancySummary,
    durations,
    variant815,
    variant10070,
    recommendedVariant,
    netAdvantagePln,
    recommendationReason,
    payerMom,
    payerDad,
    milestones,
  };
}

/**
 * Radar Ryzyk i Pułapek — evaluates hidden legal traps and deadlines.
 */
export function evaluateRiskRadar(
  mom: ParentInput,
  dad: ParentInput,
  scenario: ScenarioConfig,
  params: LegislativeParams
): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const debtLimit = round2((params.minWage * params.b2bDebtThresholdPct) / 100);

  // 1. B2B debt > 1% min wage (48.06 zł)
  [mom, dad].forEach((p) => {
    if (p.title === 'B2B' && p.b2bDebtAmount > debtLimit) {
      alerts.push({
        id: `debt-${p.name}`,
        severity: 'CRITICAL',
        title: `Zadłużenie na koncie płatnika (${p.b2bDebtAmount.toFixed(2)} zł > ${debtLimit.toFixed(2)} zł)`,
        article: 'Art. 2a ustawy zasiłkowej',
        summary: `${p.name} posiada zaległość składkową przekraczającą 1% minimalnego wynagrodzenia. Prawo do zasiłku nie powstaje do momentu spłaty długu (maks. 6 miesięcy od powstania roszczenia).`,
        action:
          'Natychmiast ureguluj zaległość na PUE/eZUS wraz z odsetkami, aby nie stracić prawa do wypłaty zasiłku.',
      });
    } else if (p.title === 'B2B' && p.b2bDebtAmount > 0 && p.b2bDebtAmount <= debtLimit) {
      alerts.push({
        id: `debt-ok-${p.name}`,
        severity: 'INFO',
        title: `Drobna niedopłata (${p.b2bDebtAmount.toFixed(2)} zł) mieści się w limicie 1%`,
        article: 'Art. 2a ustawy zasiłkowej',
        summary: `Zadłużenie nie przekracza ${debtLimit.toFixed(2)} zł, więc nie blokuje wypłaty zasiłku, ale warto je wyrównać.`,
        action: 'Rozlicz saldo na koncie PUE/eZUS przy najbliższym przelewie ZUS.',
      });
    }

    // 2. Ulga na start / brak dobrowolnego chorobowego
    if ((p.title === 'B2B' || p.title === 'ZLECENIE') && !p.hasVoluntarySickness) {
      alerts.push({
        id: `no-sickness-${p.name}`,
        severity: 'CRITICAL',
        title: `Brak dobrowolnego ubezpieczenia chorobowego (${p.name})`,
        article: 'Art. 1 ust. 1 ustawy zasiłkowej',
        summary:
          'Bez zgłoszenia do dobrowolnego ubezpieczenia chorobowego (druk ZUS ZUA) nie przysługuje zasiłek macierzyński ani chorobowy.',
        action: 'Złóż ZUS ZUA z kodem ubezpieczenia chorobowego jak najszybciej.',
      });
    }

    if (p.title === 'B2B' && p.isUlgaNaStart) {
      alerts.push({
        id: `ulga-start-${p.name}`,
        severity: 'CRITICAL',
        title: 'Ulga na start blokuje zasiłek macierzyński',
        article: 'Art. 18 ust. 1 Prawa przedsiębiorców',
        summary:
          'W okresie korzystania z Ulgi na start opłacana jest tylko składka zdrowotna — brak ubezpieczenia chorobowego.',
        action:
          'Rozważ rezygnację z Ulgi na start i przejście na ZUS ZUA z ubezpieczeniami społecznymi.',
      });
    }

    if (p.title === 'B2B' && p.hasConcurrentFullMinWageUop) {
      alerts.push({
        id: `zbieg-uop-${p.name}`,
        severity: 'WARNING',
        title: 'Zbieg B2B i etatu (>= płacy minimalnej)',
        article: 'Art. 9 ust. 1 ustawy o systemie ubezpieczeń społecznych',
        summary:
          'Gdy etat gwarantuje co najmniej płacę minimalną, z działalności gospodarczej nie można przystąpić do dobrowolnego chorobowego — podstawa zasiłku będzie liczona wyłącznie z etatu.',
        action: 'Sprawdź wysokość wynagrodzenia na UoP w kalkulatorze.',
      });
    }

    // 3. ZUS ZUA re-registration reminder for B2B/Zlecenie
    if (p.title === 'B2B' || p.title === 'ZLECENIE') {
      alerts.push({
        id: `zua-7days-${p.name}`,
        severity: 'WARNING',
        title: `Obowiązkowe przerejestrowanie ZUS ZUA po macierzyńskim (${p.name})`,
        article: 'Art. 36 ust. 11 ustawy o SUS',
        summary:
          'W trakcie pobierania zasiłku macierzyńskiego następuje wyrejestrowanie z ubezpieczeń społecznych. Po zakończeniu zasiłku musisz ponownie zgłosić się na ZUS ZUA w ciągu 7 dni.',
        action: 'Ustaw przypomnienie na 7 dni po dacie zakończenia ostatniego dnia zasiłku.',
      });
    }

    // 4. Fixed-term contract extension rule (art. 177 § 3 KP)
    if (p.title === 'UOP' && p.fixedTermContract) {
      if (p.isReplacementContract) {
        alerts.push({
          id: `umowa-zastepstwo-${p.name}`,
          severity: 'CRITICAL',
          title: 'Umowa na zastępstwo nie przedłuża się do porodu',
          article: 'Art. 177 § 3¹ Kodeksu pracy',
          summary:
            'Ochrona przedłużenia umowy po 3. miesiącu ciąży nie dotyczy umowy zawartej na zastępstwo.',
          action:
            'Jeśli umowa wygaśnie przed porodem, po urodzeniu dziecka złóż wniosek o świadczenie rodzicielskie (1 000 zł/mies.) w gminie/MOPS lub ZUS (jeśli poród nastąpił w czasie ubezpieczenia).',
        });
      } else if (p.pregnancyMonthAtContractEnd >= 4) {
        alerts.push({
          id: `umowa-przedluzenie-${p.name}`,
          severity: 'INFO',
          title: 'Umowa na czas określony przedłuży się automatycznie do dnia porodu',
          article: 'Art. 177 § 3 Kodeksu pracy',
          summary:
            'Umowa kończąca się po upływie 3. miesiąca ciąży ulega z mocy prawa przedłużeniu do dnia porodu (zasiłek macierzyński wypłaci później ZUS).',
          action: 'Dostarcz pracodawcy zaświadczenie lekarskie o wieku ciąży.',
        });
      }
    }

    // 5. FTE reduction trap (art. 40)
    if (p.title === 'UOP' && p.fteChangedRecently) {
      alerts.push({
        id: `art40-etat-${p.name}`,
        severity: 'WARNING',
        title: 'Pułapka zmiany wymiaru etatu (art. 40)',
        article: 'Art. 40 ustawy zasiłkowej',
        summary:
          'Zmiana etatu w miesiącu zachorowania/porodu lub w ciągu 12 poprzednich miesięcy powoduje przyjęcie do podstawy wyłącznie wynagrodzenia po zmianie etatu — bez uśredniania z poprzedniego etatu.',
        action:
          'Zweryfikuj, czy zmiana etatu nie obniżyła niekorzystnie podstawy zasiłku.',
      });
    }

    // 5b. Sudden high B2B base spike during short tenure (Challenge Section 1H)
    if (
      p.title === 'B2B' &&
      p.monthsInsuredLast12 < 12 &&
      p.monthlyGross > params.minWage * 2
    ) {
      alerts.push({
        id: `b2b-spike-${p.name}`,
        severity: 'WARNING',
        title: `Krótki staż B2B (${p.monthsInsuredLast12} mies.) przy wysokiej podstawie (${p.monthlyGross.toLocaleString('pl-PL')} zł)`,
        article: 'Art. 48a ustawy zasiłkowej + kontrola tytułu (Sekcja 1H)',
        summary:
          'Nagłe zadeklarowanie wysokiej podstawy składek przed porodem przy stażu poniżej 12 miesięcy uruchamia zarówno proporcjonalne uśrednienie podstawy z art. 48a, jak i możliwą kontrolę faktycznego prowadzenia działalności przez ZUS.',
        action:
          'Przygotuj ewidencję przychodów, faktury oraz dowody prowadzenia firmy (ZUS może zweryfikować realność tytułu ubezpieczenia).',
      });
    }
  });

  // 5c. Brak ubezpieczenia na dzień porodu -> Świadczenie rodzicielskie / upadłość pracodawcy
  if (mom.title === 'BRAK') {
    alerts.push({
      id: 'no-insurance-birth',
      severity: 'CRITICAL',
      title: 'Brak ubezpieczenia chorobowego w dniu porodu (alternatywy)',
      article: 'Art. 30 ustawy zasiłkowej + ustawa o świadczeniach rodzinnych',
      summary:
        'Bez aktywnego ubezpieczenia w dniu porodu ZUS nie wypłaci zasiłku macierzyńskiego — wyjątkiem jest upadłość/likwidacja pracodawcy lub bezprawne zwolnienie w ciąży. W pozostałych przypadkach przysługuje świadczenie rodzicielskie (1 000 zł/mies. przez 52 tyg.) z gminy/MOPS.',
      action:
        scenario.employerBankruptcyOrIllegalDismissal
          ? 'Złóż wniosek do ZUS o zasiłek w wysokości zasiłku macierzyńskiego z dołączonym wyrokiem/postanowieniem o upadłości.'
          : 'Złóż wniosek o świadczenie rodzicielskie („Kosiniakowe” 1 000 zł/mies.) w urzędzie gminy lub MOPS w ciągu 3 mies. od porodu.',
    });
  }

  // 5d. Adoption / Foster Care age limit check
  const fosterLimit = scenario.fosterSchoolDeferred ? 10 : 7;
  if (
    (scenario.scenarioType === 'ADOPTION' && scenario.adoptedChildAgeYears > 14) ||
    (scenario.scenarioType === 'FOSTER_CARE' &&
      scenario.adoptedChildAgeYears > fosterLimit)
  ) {
    alerts.push({
      id: 'adoption-foster-age-cap',
      severity: 'CRITICAL',
      title:
        scenario.scenarioType === 'FOSTER_CARE'
          ? `Przekroczony wiek dziecka w pieczy zastępczej (> ${fosterLimit} lat)`
          : 'Przekroczony wiek dziecka przy adopcji (> 14 lat)',
      article: 'Art. 183 Kodeksu pracy i art. 29a ustawy zasiłkowej',
      summary:
        scenario.scenarioType === 'FOSTER_CARE'
          ? `Dla rodziny zastępczej niezawodowej urlop na warunkach macierzyńskiego przysługuje do ukończenia przez dziecko 7 lat (lub 10 lat przy odroczeniu obowiązku szkolnego).`
          : 'W przypadku przysposobienia urlop na warunkach urlopu macierzyńskiego przysługuje maksymalnie do ukończenia przez dziecko 14. roku życia.',
      action:
        'Zweryfikuj datę urodzenia dziecka oraz decyzję o ewentualnym odroczeniu obowiązku szkolnego.',
    });
  }

  // 6. 21-day critical deadlines
  if (scenario.scenarioType !== 'STILLBIRTH') {
    alerts.push({
      id: 'deadline-21-days',
      severity: 'WARNING',
      title: 'Kluczowy termin: 21 dni od porodu na stawkę 81,5%',
      article: 'Art. 30a ust. 1 ustawy zasiłkowej',
      summary:
        'Aby otrzymywać ujednolicony zasiłek 81,5% za cały okres urlopu macierzyńskiego i rodzicielskiego, wniosek (do pracodawcy lub ZUS ZAM) trzeba złożyć najpóźniej w ciągu 21 dni po porodzie.',
      action:
        'Złóż wniosek z kompletem dokumentów natychmiast po uzyskaniu numeru PESEL dziecka.',
    });
  }

  // 7. 2027 law alert
  if (params.enable2027Law) {
    alerts.push({
      id: 'law-2027-active',
      severity: 'INFO',
      title: 'Aktywna symulacja nowelizacji z 01.01.2027 r.',
      article: 'Art. 17 ust. 1d-1e oraz art. 9 ust. 4 (Dz.U. z 2026 r. poz. 26)',
      summary:
        'Zwolnienie lekarskie z jednego tytułu nie wymusza bezczynności na drugim tytule o odmiennym charakterze (po zgłoszeniu płatnikowi), ale obowiązuje wspólny limit okresu zasiłkowego.',
      action:
        'Wskaż płatnikowi składek w oświadczeniu, z którego tytułu rezygnujesz ze zwolnienia.',
    });
  }

  return alerts;
}

/**
 * Deterministic ZUS PDF / Case Auditor (for Juror Test Cases and AI-extracted PDFs).
 */
export function auditZusCase(
  input: AuditInput,
  params: LegislativeParams
): AuditVerdict {
  const steps: AuditStep[] = [];
  let legacyFormMappedTo: 'ZAM' | undefined;
  let legacyFormNotice: string | undefined;

  if (
    input.formType === 'ZUR' ||
    input.formType === 'ZAO' ||
    input.formType === 'Z-3b'
  ) {
    legacyFormMappedTo = 'ZAM';
    legacyFormNotice = `Wykryto zniesiony formularz ${input.formType}: od 24 października 2026 r. druki ZUR, ZAO i Z-3b zostały wycofane i włączone do jednego wniosku ZAM (mimo że starsze poradniki z kwietnia 2026 r. nadal o nich wspominają). Dane zmapowano automatycznie na ZAM.`;
    steps.push({
      step: 'Weryfikacja aktualności formularza',
      passed: true,
      detail: `Wykryto druk ${input.formType} — zmapowano automatycznie na aktualny wniosek ZAM (zmiana od 24.10.2026 r.).`,
      article: 'Wytyczne ZUS z 24.10.2026 r.',
    });
  } else {
    steps.push({
      step: 'Weryfikacja aktualności formularza',
      passed: true,
      detail: `Formularz ${input.formType} jest aktualny i zgodny ze stanem prawnym na listopad 2026 r.`,
      article: 'Rozporządzenie MRPiPS z 27.09.2026 r.',
    });
  }

  // Step 2: Voluntary sickness insurance & title
  const hasSickness =
    input.insuredTitle === 'UOP' ||
    ((input.insuredTitle === 'B2B' || input.insuredTitle === 'ZLECENIE') &&
      input.hasVoluntarySickness);

  steps.push({
    step: 'Tytuł do ubezpieczenia chorobowego',
    passed: hasSickness,
    detail: hasSickness
      ? `Aktywne ubezpieczenie chorobowe z tytułu: ${input.insuredTitle}.`
      : `Brak dobrowolnej składki chorobowej dla tytułu ${input.insuredTitle}.`,
    article: 'Art. 1 ust. 1 ustawy zasiłkowej',
  });

  // Step 3: Waiting period (maternity has no waiting period; sickness ZAS-53 ALWAYS checks 30/90 days unless 10y mandatory UoP)
  const requiredDays =
    input.formType === 'ZAS-53'
      ? input.insuredTitle === 'UOP'
        ? input.has10YearsMandatoryInsurance
          ? 0
          : 30
        : 90
      : 0;
  const gapOk = input.gapBetweenPeriodsDays <= 30;
  const waitingPassed =
    requiredDays === 0 || (input.insuranceDaysTotal >= requiredDays && gapOk);

  steps.push({
    step: 'Okres wyczekiwania i sumowanie przerw',
    passed: waitingPassed,
    detail:
      input.formType === 'ZAS-53' && requiredDays === 0
        ? 'Zwolnienie z 30-dniowego okresu wyczekiwania (art. 4 ust. 3 pkt 3: min. 10 lat obowiązkowego ubezpieczenia chorobowego na etacie).'
        : requiredDays === 0
          ? 'Dla zasiłku macierzyńskiego nie obowiązuje okres wyczekiwania — prawo powstaje od pierwszego dnia ubezpieczenia.'
          : waitingPassed
            ? `Spełniono okres wyczekiwania (${input.insuranceDaysTotal} dni >= ${requiredDays} dni; przerwa ${input.gapBetweenPeriodsDays} dni <= 30 dni).`
            : `Niespełniony okres wyczekiwania (${input.insuranceDaysTotal} dni przy wymaganych ${requiredDays} dniach dla zasiłku chorobowego ${input.isPregnancyRelated ? 'w ciąży z kodem B' : ''}).`,
    article: 'Art. 4 ustawy zasiłkowej',
  });

  // Step 4: B2B debt threshold (1% min wage = 48.06 PLN)
  const debtLimit = round2((params.minWage * params.b2bDebtThresholdPct) / 100);
  const debtPassed =
    input.insuredTitle !== 'B2B' || input.b2bDebtAmount <= debtLimit;

  steps.push({
    step: `Kontrola zadłużenia składkowego (próg ${debtLimit.toFixed(2)} zł)`,
    passed: debtPassed,
    detail: debtPassed
      ? input.b2bDebtAmount > 0
        ? `Niedopłata ${input.b2bDebtAmount.toFixed(2)} zł nie przekracza 1% płacy minimalnej (${debtLimit.toFixed(2)} zł).`
        : 'Brak zaległości na koncie płatnika składek.'
      : `Zadłużenie ${input.b2bDebtAmount.toFixed(2)} zł przekracza dopuszczalny próg ${debtLimit.toFixed(2)} zł — prawo do zasiłku nie powstaje do momentu spłaty.`,
    article: 'Art. 2a ustawy zasiłkowej',
  });

  // Step 5: 270-day pregnancy sickness limit check (art. 9 ust. 2)
  const total270Used = input.usedSickDaysWithCodeB;
  const sickLimitPassed = total270Used <= 270;
  steps.push({
    step: 'Limit okresu zasiłkowego (270 dni dla ciąży)',
    passed: sickLimitPassed,
    detail:
      input.usedSickDaysBeforePregnancy > 0
        ? `Okres choroby przed ciążą (${input.usedSickDaysBeforePregnancy} dni) bez kodu B nie sumuje się z okresem ciąży po przerwie (nowy okres zasiłkowy — art. 9 ust. 2). Wykorzystano ${total270Used}/270 dni.`
        : `Wykorzystano ${total270Used} z 270 dni okresu zasiłkowego.`,
    article: params.enable2027Law
      ? 'Art. 9 ust. 2 i ust. 4 (symulacja 2027)'
      : 'Art. 9 ust. 2 ustawy zasiłkowej',
  });

  // Step 6: 2027 second title rule or current art. 17 check
  if (input.hasSecondEmploymentTitle) {
    if (params.enable2027Law) {
      steps.push({
        step: 'Zasady dla drugiego tytułu (Symulacja 01.01.2027 r.)',
        passed: true,
        detail: input.optOutSecondTitleL4_2027
          ? 'Dopuszczalne wykonywanie pracy na odmiennym drugim tytule przy złożeniu oświadczenia płatnikowi.'
          : 'Dwa tytuły ubezpieczenia w jednym okresie zasiłkowym (art. 9 ust. 4).',
        article: 'Art. 17 ust. 1d-1e (nowelizacja 2027)',
      });
    } else if (!input.isPregnancyRelated && input.optOutSecondTitleL4_2027) {
      steps.push({
        step: 'Zakaz pracy zarobkowej na e-ZLA (stan prawny 2026)',
        passed: false,
        detail:
          'W 2026 r. wykonywanie jakiejkolwiek pracy zarobkowej na drugim tytule w trakcie e-ZLA grozi utratą zasiłku za cały okres zwolnienia (art. 17 ust. 1).',
        article: 'Art. 17 ust. 1 ustawy zasiłkowej',
      });
    }
  }

  // Step 7: Payer determination
  const payer: 'PRACODAWCA' | 'ZUS' | 'BRAK' = !hasSickness
    ? 'BRAK'
    : input.insuredTitle === 'UOP' &&
        input.payerInsuredCount > params.payerInsuredThreshold
      ? 'PRACODAWCA'
      : 'ZUS';

  steps.push({
    step: 'Ustalenie płatnika zasiłku (art. 61)',
    passed: payer !== 'BRAK',
    detail:
      payer === 'PRACODAWCA'
        ? `Płatnik zgłasza ${input.payerInsuredCount} ubezpieczonych (>20) — zasiłek wypłaca pracodawca.`
        : payer === 'ZUS'
          ? `Płatnik zgłasza ${input.payerInsuredCount} ubezpieczonych (<=20 lub B2B) — zasiłek wypłaca bezpośrednio ZUS.`
          : 'Brak płatnika zasiłku.',
    article: 'Art. 61 ust. 1 ustawy zasiłkowej',
  });

  // Base calculation preview
  const syntheticParent: ParentInput = {
    name: input.applicantName,
    title: input.insuredTitle,
    monthlyGross: input.monthlyGrossDeclared,
    quarterlyBonusesTotal: 0,
    annualBonus: 0,
    monthsInsuredLast12: input.monthsInsuredLast12,
    excludedUnder50PctMonths: 0,
    fteChangedRecently: false,
    hasVoluntarySickness: input.hasVoluntarySickness,
    voluntarySicknessDays: input.insuranceDaysTotal,
    gapBetweenPeriodsDays: input.gapBetweenPeriodsDays,
    isUlgaNaStart: false,
    hasConcurrentFullMinWageUop: false,
    b2bDebtAmount: input.b2bDebtAmount,
    payerInsuredCount: input.payerInsuredCount,
    fixedTermContract: false,
    isReplacementContract: false,
    pregnancyMonthAtContractEnd: 0,
    hasSecondEmploymentTitle: input.hasSecondEmploymentTitle,
  };

  const baseDetail = calculateBenefitBase(syntheticParent, params);
  const estimatedDaily100 = round2(baseDetail.calculatedBase / 30);
  const estimatedDaily815 = round2(estimatedDaily100 * params.rateCombined815);
  const gross30 = round2(estimatedDaily815 * 30);
  const estimatedMonthlyNet815 = calcNetFromGross(gross30, params, true);

  const allPassed = steps.every((s) => s.passed);
  let verdict: AuditVerdict['verdict'] = 'MA PRAWO';
  if (!hasSickness || !debtPassed || !waitingPassed) {
    verdict = 'BRAK PRAWA';
  } else if (!allPassed || input.claimDaysAfterBirth > 21) {
    verdict = 'WYMAGA KOREKTY';
  }

  const risks: RiskAlert[] = [];
  if (!sickLimitPassed) {
    risks.push({
      id: 'audit-over-270',
      severity: 'WARNING',
      title: `Przekroczono limit 270 dni okresu zasiłkowego w ciąży (${total270Used} dni)`,
      article: 'Art. 8 i art. 19 ust. 1 ustawy zasiłkowej',
      summary:
        'Po wyczerpaniu 270 dni zasiłku chorobowego w ciąży dalsza wypłata zasiłku chorobowego nie przysługuje. Przysługuje natomiast świadczenie rehabilitacyjne w wysokości 100% podstawy aż do porodu.',
      action: 'Złóż wniosek o świadczenie rehabilitacyjne na druku ZUS ZNp-7 z wyprzedzeniem min. 6 tygodni przed końcem 270 dni.',
    });
  }
  if (input.claimDaysAfterBirth > 21) {
    risks.push({
      id: 'audit-late-21',
      severity: 'WARNING',
      title: `Wniosek złożony po 21 dniach od porodu (dzień ${input.claimDaysAfterBirth})`,
      article: 'Art. 30a ust. 1 ustawy zasiłkowej',
      summary:
        'Przekroczono 21-dniowy termin na wniosek o jednolitą stawkę 81,5%. Przysługuje wariant 100% za macierzyński i 70% za rodzicielski.',
      action: 'Rozlicz wniosek według wariantu 100% + 70%.',
    });
  }
  if (legacyFormNotice) {
    risks.push({
      id: 'audit-legacy-form',
      severity: 'INFO',
      title: `Zastąpiono wycofany druk ${input.formType} wnioskiem ZAM`,
      article: 'Zmiana formularzy ZUS z 24.10.2026 r.',
      summary: legacyFormNotice,
      action: 'W eksporcie dokumentów wygeneruj wniosek na aktualnym druku ZAM.',
    });
  }

  return {
    verdict,
    payer,
    legacyFormMappedTo,
    legacyFormNotice,
    estimatedBase: baseDetail.calculatedBase,
    estimatedDaily100,
    estimatedDaily815,
    estimatedMonthlyNet815,
    steps,
    risks,
  };
}
