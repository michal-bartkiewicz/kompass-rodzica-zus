import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditZusCase,
  calculateBenefitBase,
  calculateLeaveDurations,
  calculatePregnancyBenefits,
  calculateSupplementaryMaternityWeeks,
  evaluateRiskRadar,
  simulateDualParentPlan,
} from './zusEngine.ts';
import { retrieveLegalChunks } from './legalCorpus.ts';
import { CURATED_AUDIT_CASES, DEFAULT_2026_PARAMS, PERSONA_PROFILES } from './presets.ts';
import type { ParentInput, ScenarioConfig } from './types.ts';

function makeUoPParent(overrides: Partial<ParentInput> = {}): ParentInput {
  return {
    name: 'Test Rodzic',
    title: 'UOP',
    monthlyGross: 6000,
    quarterlyBonusesTotal: 0,
    annualBonus: 0,
    monthsInsuredLast12: 12,
    excludedUnder50PctMonths: 0,
    fteChangedRecently: false,
    hasVoluntarySickness: true,
    voluntarySicknessDays: 365,
    gapBetweenPeriodsDays: 0,
    isUlgaNaStart: false,
    hasConcurrentFullMinWageUop: false,
    b2bDebtAmount: 0,
    payerInsuredCount: 30,
    fixedTermContract: false,
    isReplacementContract: false,
    pregnancyMonthAtContractEnd: 0,
    hasSecondEmploymentTitle: false,
    ...overrides,
  };
}

function makeScenario(overrides: Partial<ScenarioConfig> = {}): ScenarioConfig {
  return {
    scenarioType: 'STANDARD',
    childrenCount: 1,
    hasZaZyciem: false,
    gestationalWeeks: 40,
    birthWeightGrams: 3400,
    hospitalDays: 2,
    fullTermLateHosp: false,
    adoptedChildAgeYears: 0,
    momWeeksOnMaternity: 20,
    dadShareParentalWeeks: 9,
    dadTakesPaternity14Days: true,
    combineParentalWithWork: false,
    workCombinationFraction: 0.25,
    workCombinationWeeks: 0,
    noParentalInFirstYear: false,
    selectedVariant: '81.5',
    applyPit2KwotaWolna: true,
    childAlreadyHasPesel: true,
    ...overrides,
  };
}

test('UoP minimum wage floor in 2026: 4 806 zł gross -> 4 147,10 zł base', () => {
  const mom = makeUoPParent({ monthlyGross: 3500 });
  const base = calculateBenefitBase(mom, DEFAULT_2026_PARAMS);
  assert.equal(base.eligible, true);
  assert.equal(base.minFloorApplied, true);
  assert.equal(base.calculatedBase, 4147.1);
});

test('UoP quarterly and annual bonuses add 1/12 before -13.71%', () => {
  const mom = makeUoPParent({
    monthlyGross: 6000,
    quarterlyBonusesTotal: 2400, // +200/mo
    annualBonus: 3600, // +300/mo
  });
  const base = calculateBenefitBase(mom, DEFAULT_2026_PARAMS);
  // 6000 + 200 + 300 = 6500; 6500 * (1 - 0.1371) = 5608.85
  assert.equal(base.effectiveMonthlyGross, 6500);
  assert.equal(base.calculatedBase, 5608.85);
});

test('Art. 40 FTE change uses newFteGross exclusively', () => {
  const mom = makeUoPParent({
    monthlyGross: 8000,
    fteChangedRecently: true,
    previousFteGross: 8000,
    newFteGross: 4806,
  });
  const base = calculateBenefitBase(mom, DEFAULT_2026_PARAMS);
  assert.equal(base.art40Applied, true);
  assert.equal(base.calculatedBase, 4147.1);
});

test('B2B 250% cap in 2026: 30 000 zł capped to 23 550 zł -> 20 321,30 zł base', () => {
  const b2b = makeUoPParent({
    title: 'B2B',
    monthlyGross: 30000,
    monthsInsuredLast12: 12,
    hasVoluntarySickness: true,
  });
  const base = calculateBenefitBase(b2b, DEFAULT_2026_PARAMS);
  assert.equal(base.maxCapApplied, true);
  assert.equal(base.effectiveMonthlyGross, 23550);
  assert.equal(base.calculatedBase, 20321.3);
});

test('B2B art. 48a averages excess above 60% forecast floor or 30% min-wage floor when < 12 months', () => {
  const b2bStandard = makeUoPParent({
    title: 'B2B',
    b2bContributionTier: 'STANDARD_60',
    monthlyGross: 23550,
    monthsInsuredLast12: 3,
    hasVoluntarySickness: true,
  });
  const baseStandard = calculateBenefitBase(b2bStandard, DEFAULT_2026_PARAMS);
  assert.equal(baseStandard.art48aApplied, true);
  // 4877.11 + (20321.30 - 4877.11) * 3 / 12 = 8738.16
  assert.equal(baseStandard.calculatedBase, 8738.16);

  const b2bPreferential = makeUoPParent({
    title: 'B2B',
    b2bContributionTier: 'PREFERENTIAL_30',
    monthlyGross: 23550,
    monthsInsuredLast12: 3,
    hasVoluntarySickness: true,
  });
  const basePref = calculateBenefitBase(b2bPreferential, DEFAULT_2026_PARAMS);
  assert.equal(basePref.art48aApplied, true);
  // 1244.13 + (20321.30 - 1244.13) * 3 / 12 = 6013.42
  assert.equal(basePref.calculatedBase, 6013.42);
});

test('B2B debt threshold art. 2a: <= 48.06 allowed, 48.07 rejected', () => {
  const caseOk = CURATED_AUDIT_CASES[2]!.input; // debt 18.50
  const verdictOk = auditZusCase(caseOk, DEFAULT_2026_PARAMS);
  assert.equal(verdictOk.verdict, 'MA PRAWO');

  const caseDebt = CURATED_AUDIT_CASES[1]!.input; // debt 62.00
  const verdictReject = auditZusCase(caseDebt, DEFAULT_2026_PARAMS);
  assert.equal(verdictReject.verdict, 'BRAK PRAWA');

  const boundary = auditZusCase({ ...caseDebt, b2bDebtAmount: 48.06 }, DEFAULT_2026_PARAMS);
  assert.equal(boundary.verdict, 'MA PRAWO');
});

test('Abolished forms ZUR / ZAO / Z-3b (24.10.2026) map automatically to ZAM', () => {
  const legacyCase = CURATED_AUDIT_CASES[2]!.input; // Z-3b
  const verdict = auditZusCase(legacyCase, DEFAULT_2026_PARAMS);
  assert.equal(verdict.legacyFormMappedTo, 'ZAM');
  assert.ok(verdict.legacyFormNotice?.includes('24 października 2026'));
});

test('Art. 180^2 KP supplementary maternity leave for preterm & hospitalized babies', () => {
  // <28w or <=1000g -> up to 15 weeks
  assert.equal(
    calculateSupplementaryMaternityWeeks(
      makeScenario({
        scenarioType: 'PRETERM_HOSPITAL',
        gestationalWeeks: 27,
        birthWeightGrams: 940,
        hospitalDays: 92, // ceil(92/7) = 14
      })
    ),
    14
  );

  // >120 days -> capped at 15
  assert.equal(
    calculateSupplementaryMaternityWeeks(
      makeScenario({
        scenarioType: 'PRETERM_HOSPITAL',
        gestationalWeeks: 25,
        birthWeightGrams: 750,
        hospitalDays: 120,
      })
    ),
    15
  );

  // 28-37w & >1000g -> up to 8 weeks
  assert.equal(
    calculateSupplementaryMaternityWeeks(
      makeScenario({
        scenarioType: 'PRETERM_HOSPITAL',
        gestationalWeeks: 33,
        birthWeightGrams: 1900,
        hospitalDays: 70,
      })
    ),
    8
  );

  // >37w late hospitalization >= 2 days
  assert.equal(
    calculateSupplementaryMaternityWeeks(
      makeScenario({
        scenarioType: 'PRETERM_HOSPITAL',
        gestationalWeeks: 39,
        birthWeightGrams: 3500,
        hospitalDays: 10,
        fullTermLateHosp: true,
      })
    ),
    2
  );
});

test('Za życiem and work-combination extension (art. 182^1f § 7 KP)', () => {
  const durations = calculateLeaveDurations(
    makeScenario({
      hasZaZyciem: true,
      combineParentalWithWork: true,
      workCombinationFraction: 0.5,
      workCombinationWeeks: 20,
      dadShareParentalWeeks: 9,
    }),
    true,
    true
  );
  assert.equal(durations.parentalBaseWeeks, 65);
  // 20w at 0.5 FTE expands to 40w (+20w bonus)
  assert.equal(durations.parentalExtendedWeeks, 20);
  assert.equal(durations.parentalTotalWeeks, 85);
});

test('Dual-parent comparison & art. 31 ust. 3a top-up to 1 000 PLN net', () => {
  const lowIncomeMom = makeUoPParent({ monthlyGross: 1200, payerInsuredCount: 10 });
  // Note: full-time UoP floors to 4147.10, so test low-income ZLECENIE to verify 1000 PLN net floor
  const lowZlecenieMom = makeUoPParent({
    title: 'ZLECENIE',
    monthlyGross: 1100,
    hasVoluntarySickness: true,
    payerInsuredCount: 10,
  });
  const dad = makeUoPParent({ monthlyGross: 7000 });
  const result = simulateDualParentPlan(
    lowZlecenieMom,
    dad,
    makeScenario({ applyPit2KwotaWolna: true }),
    DEFAULT_2026_PARAMS
  );
  assert.ok(result.variant815.topUpTotalNet > 0);
  assert.equal(result.payerMom, 'ZUS');
  assert.equal(result.payerDad, 'PRACODAWCA');
  assert.ok(lowIncomeMom.monthlyGross > 0);
});

test('2027 law toggle changes audit evaluation for second employment title', () => {
  const case2027 = CURATED_AUDIT_CASES[4]!.input;
  const verdict2026 = auditZusCase(case2027, {
    ...DEFAULT_2026_PARAMS,
    enable2027Law: false,
  });
  const verdict2027 = auditZusCase(case2027, {
    ...DEFAULT_2026_PARAMS,
    enable2027Law: true,
  });
  assert.equal(verdict2026.verdict, 'WYMAGA KOREKTY');
  assert.equal(verdict2027.verdict, 'MA PRAWO');
});

test('Risk radar detects ZUS ZUA 7-day reminder and B2B debt in Kasia persona', () => {
  const kasia = PERSONA_PROFILES[1]!;
  const risks = evaluateRiskRadar(
    kasia.mom,
    kasia.dad,
    kasia.scenario,
    DEFAULT_2026_PARAMS
  );
  assert.ok(risks.some((r) => r.severity === 'CRITICAL' && r.article.includes('2a')));
  assert.ok(risks.some((r) => r.id.startsWith('zua-7days')));
});

test('Pregnancy sickness benefits (code B 100%, 30/90d wait, 33 employer days vs B2B 0)', () => {
  const uopMom = makeUoPParent({ monthlyGross: 6000, voluntarySicknessDays: 120 });
  const pregUop = calculatePregnancyBenefits(
    uopMom,
    makeScenario({ scenarioType: 'PREGNANCY_SICKNESS', pregnancySickDaysPlanned: 90 }),
    DEFAULT_2026_PARAMS
  );
  assert.equal(pregUop.eligible, true);
  assert.equal(pregUop.waitingPeriodRequiredDays, 30);
  assert.equal(pregUop.employerPaidDays, 33);
  assert.equal(pregUop.zusPaidDays, 57);
  assert.equal(pregUop.maxPeriodDays, 270);

  const b2bShort = makeUoPParent({
    title: 'B2B',
    monthlyGross: 8000,
    hasVoluntarySickness: true,
    voluntarySicknessDays: 60, // < 90 days required
  });
  const pregB2bShort = calculatePregnancyBenefits(
    b2bShort,
    makeScenario({
      scenarioType: 'PREGNANCY_SICKNESS',
      employerBankruptcyOrIllegalDismissal: true,
    }),
    DEFAULT_2026_PARAMS
  );
  assert.equal(pregB2bShort.waitingPeriodRequiredDays, 90);
  assert.equal(pregB2bShort.waitingPeriodMet, false);
  assert.equal(pregB2bShort.eligible, false);
  assert.equal(pregB2bShort.maternityLevelPostEmploymentEligible, true);
});

test('Adoption & Foster Care: Za życiem = 62w and age limits (14y adoption, 7y/10y foster)', () => {
  const adoptionZaZyciem = calculateLeaveDurations(
    makeScenario({
      scenarioType: 'ADOPTION',
      hasZaZyciem: true,
      adoptedChildAgeYears: 4,
    }),
    true,
    true
  );
  assert.equal(adoptionZaZyciem.adoptionAgeBlocked, false);
  assert.equal(adoptionZaZyciem.parentalBaseWeeks, 62);

  const fosterBlocked = calculateLeaveDurations(
    makeScenario({
      scenarioType: 'FOSTER_CARE',
      adoptedChildAgeYears: 8,
      fosterSchoolDeferred: false,
    }),
    true,
    true
  );
  assert.equal(fosterBlocked.adoptionAgeBlocked, true);
  assert.equal(fosterBlocked.parentalTotalWeeks, 0);

  const fosterDeferredAllowed = calculateLeaveDurations(
    makeScenario({
      scenarioType: 'FOSTER_CARE',
      adoptedChildAgeYears: 9,
      fosterSchoolDeferred: true,
    }),
    true,
    true
  );
  assert.equal(fosterDeferredAllowed.adoptionAgeBlocked, false);
  assert.equal(fosterDeferredAllowed.parentalBaseWeeks, 41);

  const adoptionBlocked = calculateLeaveDurations(
    makeScenario({
      scenarioType: 'ADOPTION',
      adoptedChildAgeYears: 15,
    }),
    true,
    true
  );
  assert.equal(adoptionBlocked.adoptionAgeBlocked, true);
});

test('Section 1H risk alerts detect B2B spike, BRAK insurance, and foster age cap', () => {
  const b2bSpike = makeUoPParent({
    title: 'B2B',
    monthlyGross: 20000,
    monthsInsuredLast12: 3,
    hasVoluntarySickness: true,
  });
  const dad = makeUoPParent({ title: 'UOP' });
  const risksSpike = evaluateRiskRadar(
    b2bSpike,
    dad,
    makeScenario(),
    DEFAULT_2026_PARAMS
  );
  assert.ok(risksSpike.some((r) => r.id.startsWith('b2b-spike')));

  const noInsMom = makeUoPParent({ title: 'BRAK' });
  const risksNoIns = evaluateRiskRadar(
    noInsMom,
    dad,
    makeScenario({ scenarioType: 'FOSTER_CARE', adoptedChildAgeYears: 8 }),
    DEFAULT_2026_PARAMS
  );
  assert.ok(risksNoIns.some((r) => r.id === 'no-insurance-birth'));
  assert.ok(risksNoIns.some((r) => r.id === 'adoption-foster-age-cap'));
});

test('ZAS-53 pregnancy sickness enforces 90d B2B wait, 10y UoP exemption, and >270d ZNp-7 alert', () => {
  const zas53Short = CURATED_AUDIT_CASES[5]!.input; // B2B ZAS-53 60 days
  const verdictShort = auditZusCase(zas53Short, DEFAULT_2026_PARAMS);
  assert.equal(verdictShort.verdict, 'BRAK PRAWA');

  const verdictLong = auditZusCase(
    { ...zas53Short, insuranceDaysTotal: 100 },
    DEFAULT_2026_PARAMS
  );
  assert.equal(verdictLong.verdict, 'MA PRAWO');

  const uop10y = calculatePregnancyBenefits(
    makeUoPParent({
      title: 'UOP',
      voluntarySicknessDays: 10,
      has10YearsMandatoryInsurance: true,
    }),
    makeScenario({ scenarioType: 'PREGNANCY_SICKNESS' }),
    DEFAULT_2026_PARAMS
  );
  assert.equal(uop10y.waitingPeriodRequiredDays, 0);
  assert.equal(uop10y.waitingPeriodMet, true);

  const over270 = auditZusCase(
    {
      ...zas53Short,
      insuranceDaysTotal: 150,
      usedSickDaysWithCodeB: 280,
    },
    DEFAULT_2026_PARAMS
  );
  assert.equal(over270.verdict, 'WYMAGA KOREKTY');
  assert.ok(over270.risks.some((r) => r.id === 'audit-over-270' && r.action.includes('ZNp-7')));
});

test('Art. 183 § 3 KP adoption shortened by age cap enforces min 9w maternity and 38w parental', () => {
  const shortened = calculateLeaveDurations(
    makeScenario({
      scenarioType: 'ADOPTION',
      adoptedChildAgeYears: 13,
      weeksUntilAdoptionAgeCap: 5,
    }),
    true,
    true
  );
  assert.equal(shortened.maternityWeeks, 9);
  assert.equal(shortened.parentalBaseWeeks, 38);
});

test('Partial workCombinationWeeks only reduces combined block while leaving remaining weeks at full rate', () => {
  const mom = makeUoPParent({ monthlyGross: 8000 });
  const dad = makeUoPParent({ monthlyGross: 6000 });

  const partial = simulateDualParentPlan(
    mom,
    dad,
    makeScenario({
      selectedVariant: '100+70',
      combineParentalWithWork: true,
      workCombinationFraction: 0.5,
      workCombinationWeeks: 10,
      dadShareParentalWeeks: 9,
    }),
    DEFAULT_2026_PARAMS
  );

  const fullCombined = simulateDualParentPlan(
    mom,
    dad,
    makeScenario({
      selectedVariant: '100+70',
      combineParentalWithWork: true,
      workCombinationFraction: 0.5,
      workCombinationWeeks: 32,
      dadShareParentalWeeks: 9,
    }),
    DEFAULT_2026_PARAMS
  );

  assert.equal(partial.durations.parentalExtendedWeeks, 10);
  assert.equal(fullCombined.durations.parentalExtendedWeeks, 32);
  assert.notEqual(partial.variant10070.momTotalNet, fullCombined.variant10070.momTotalNet);
  assert.equal(partial.variant10070.timeline.some((r) => r.phase.includes('wydłużony')), true);
});

test('Progressive annual PIT applies 32% bracket above 120 000 PLN within calendar year', () => {
  const highB2bMom = makeUoPParent({
    title: 'B2B',
    monthlyGross: 23550,
    monthsInsuredLast12: 12,
    hasVoluntarySickness: true,
  });
  const dad = makeUoPParent({ monthlyGross: 6000 });

  const janRes = simulateDualParentPlan(
    highB2bMom,
    dad,
    makeScenario({
      expectedDeliveryDate: '2026-01-05',
      selectedVariant: '100+70',
      applyPit2KwotaWolna: true,
    }),
    DEFAULT_2026_PARAMS
  );

  const janMonth1 = janRes.variant10070.timeline[0]!;
  const janMonth7 = janRes.variant10070.timeline[6]!;
  assert.ok(janMonth1.momNet > 17000);
  assert.ok(janMonth7.momNet < janMonth1.momNet - 1500);
});

test('expectedDeliveryDate builds calendar month labels and milestones', () => {
  const mom = makeUoPParent({ monthlyGross: 8000 });
  const dad = makeUoPParent({ monthlyGross: 7000 });
  const res = simulateDualParentPlan(
    mom,
    dad,
    makeScenario({ expectedDeliveryDate: '2026-11-18' }),
    DEFAULT_2026_PARAMS
  );
  assert.equal(res.variant815.timeline[0]!.label, 'Lis 2026');
  assert.ok(res.milestones && Object.keys(res.milestones).length >= 5);
  assert.equal(res.milestones!.birthDate, '18-11-2026');
});

test('Legal RAG corpus retrieves § 13 ust. 2 ZAM birth certificate exemption chunk', () => {
  const chunks = retrieveLegalChunks(
    'Czy przy składaniu wniosku ZAM muszę dostarczyć papierowy akt urodzenia dziecka?',
    3
  );
  assert.ok(chunks.length >= 1);
  assert.ok(chunks.some((c) => c.article.includes('§ 13 ust. 2')));
});

