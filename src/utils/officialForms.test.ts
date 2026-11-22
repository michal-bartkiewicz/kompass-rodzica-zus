import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_2026_PARAMS, PERSONA_PROFILES } from '../engine/presets.ts';
import { simulateDualParentPlan } from '../engine/zusEngine.ts';
import {
  buildOfficialFormSpec,
  formatOfficialFormAsPlainText,
} from './officialForms.ts';

test('ZUS ZAM contains all mandatory Załącznik nr 6 fields and omits calculator net totals', () => {
  const anna = PERSONA_PROFILES[0]!; // UoP <= 20 os. -> ZUS payer
  const result = simulateDualParentPlan(
    anna.mom,
    anna.dad,
    anna.scenario,
    DEFAULT_2026_PARAMS
  );
  const spec = buildOfficialFormSpec({
    persona: anna,
    mom: anna.mom,
    dad: anna.dad,
    scenario: anna.scenario,
    params: DEFAULT_2026_PARAMS,
    result,
    requestedKind: 'ZAM',
  });
  const text = formatOfficialFormAsPlainText(spec);

  assert.equal(spec.symbol, 'ZUS ZAM');
  assert.ok(text.includes('NIP / REGON płatnika składek'));
  assert.ok(text.includes('Adres płatnika składek'));
  assert.ok(text.includes('DANE DZIECKA / DZIECI'));
  assert.ok(text.includes('DANE DRUGIEGO RODZICA DZIECKA'));
  assert.ok(text.includes('pierwszym roku życia dziecka'));
  assert.ok(text.includes('NUMER RACHUNKU BANKOWEGO'));
  assert.ok(text.includes('§ 13 ust. 2–4'));
  // Must NOT contain calculator net payout estimates in the official ZUS form
  assert.ok(!text.includes('Szacowana suma wypłat'));
  assert.ok(!text.includes('Łącznie netto dla rodziny'));
});

test('ZUS ZAM for preterm baby includes hospital stay & birth weight fields (Zał. 6 pkt 12)', () => {
  const preterm = PERSONA_PROFILES[2]!; // wczesniak-27-tydzien (payer > 20, forced ZAM)
  const result = simulateDualParentPlan(
    preterm.mom,
    preterm.dad,
    preterm.scenario,
    DEFAULT_2026_PARAMS
  );
  const spec = buildOfficialFormSpec({
    persona: preterm,
    mom: preterm.mom,
    dad: preterm.dad,
    scenario: preterm.scenario,
    params: DEFAULT_2026_PARAMS,
    result,
    requestedKind: 'ZAM',
  });
  const text = formatOfficialFormAsPlainText(spec);

  assert.equal(spec.symbol, 'ZUS ZAM');
  assert.ok(text.includes('[X] uzupełniającego urlopu macierzyńskiego'));
  assert.ok(text.includes('27 tydz.'));
  assert.ok(text.includes('940 g'));
  assert.ok(text.includes('92 dni'));
  assert.ok(text.includes('[X] Zaświadczenie wydane przez szpital'));
});

test('ZUS ZAS-53 matches Załącznik nr 1 (sickness e-ZLA only, no child PESEL or parental leave)', () => {
  const zofia = PERSONA_PROFILES[4]!; // B2B L4 kod B
  const result = simulateDualParentPlan(
    zofia.mom,
    zofia.dad,
    zofia.scenario,
    DEFAULT_2026_PARAMS
  );
  const spec = buildOfficialFormSpec({
    persona: zofia,
    mom: zofia.mom,
    dad: zofia.dad,
    scenario: zofia.scenario,
    params: DEFAULT_2026_PARAMS,
    result,
    requestedKind: 'ZAS-53',
  });
  const text = formatOfficialFormAsPlainText(spec);

  assert.equal(spec.symbol, 'ZUS ZAS-53');
  assert.ok(text.includes('WNIOSEK O ZASIŁEK CHOROBOWY'));
  assert.ok(text.includes('ZZ-9451108'));
  assert.ok(text.includes('Kod „B”'));
  assert.ok(text.includes('NUMER RACHUNKU BANKOWEGO WNIOSKODAWCY'));
  assert.ok(text.includes('art. 17 ustawy zasiłkowej'));
  // Must NOT contain maternity/child fields
  assert.ok(!text.includes('PESEL dziecka'));
  assert.ok(!text.includes('urlopu rodzicielskiego'));
  assert.ok(!text.includes('urlopu ojcowskiego'));
});

test('ZUS Z-3 and ZUS Z-3a match Załącznik nr 2 and nr 3 and note abolition of Z-3b', () => {
  const anna = PERSONA_PROFILES[0]!;
  const resAnna = simulateDualParentPlan(
    anna.mom,
    anna.dad,
    anna.scenario,
    DEFAULT_2026_PARAMS
  );
  const z3 = buildOfficialFormSpec({
    persona: anna,
    mom: anna.mom,
    dad: anna.dad,
    scenario: anna.scenario,
    params: DEFAULT_2026_PARAMS,
    result: resAnna,
    requestedKind: 'Z-3',
  });
  const textZ3 = formatOfficialFormAsPlainText(z3);
  assert.equal(z3.symbol, 'ZUS Z-3');
  assert.ok(textZ3.includes('Załącznik nr 2'));
  assert.ok(textZ3.includes('Składniki kwartalne'));
  assert.ok(textZ3.includes('Urlop bezpłatny / wychowawczy'));

  const adopcja = PERSONA_PROFILES[3]!; // ZLECENIE
  const resAdopcja = simulateDualParentPlan(
    adopcja.mom,
    adopcja.dad,
    adopcja.scenario,
    DEFAULT_2026_PARAMS
  );
  const z3a = buildOfficialFormSpec({
    persona: adopcja,
    mom: adopcja.mom,
    dad: adopcja.dad,
    scenario: adopcja.scenario,
    params: DEFAULT_2026_PARAMS,
    result: resAdopcja,
    requestedKind: 'Z-3a',
  });
  const textZ3a = formatOfficialFormAsPlainText(z3a);
  assert.equal(z3a.symbol, 'ZUS Z-3a');
  assert.ok(textZ3a.includes('Załącznik nr 3'));
  assert.ok(textZ3a.includes('Z-3b (dla B2B) został zlikwidowany 24.10.2026 r.'));
});

test('Employer applications match Rozporządzenie MRPiPS z 11.03.2025 r. (§ 15 and § 17)', () => {
  const preterm = PERSONA_PROFILES[2]!;
  const result = simulateDualParentPlan(
    preterm.mom,
    preterm.dad,
    preterm.scenario,
    DEFAULT_2026_PARAMS
  );

  const empReq = buildOfficialFormSpec({
    persona: preterm,
    mom: preterm.mom,
    dad: preterm.dad,
    scenario: preterm.scenario,
    params: DEFAULT_2026_PARAMS,
    result,
    requestedKind: 'WNIOSEK_PRACODAWCA',
  });
  const empText = formatOfficialFormAsPlainText(empReq);
  assert.ok(empText.includes('Dz.U. z 2025 r. poz. 322'));
  assert.ok(empText.includes('DOTYCHCZAS WYKORZYSTANY URLOP I CZĘŚCI (§ 15 UST. 1 PKT 2)'));
  assert.ok(empText.includes('§ 14 Rozporządzenia'));
  assert.ok(empText.includes('w aktach osobowych pracownika (§ 22 Rozp.)'));

  const patReq = buildOfficialFormSpec({
    persona: preterm,
    mom: preterm.mom,
    dad: preterm.dad,
    scenario: preterm.scenario,
    params: DEFAULT_2026_PARAMS,
    result,
    requestedKind: 'WNIOSEK_OJCOWSKI_PRACODAWCA',
  });
  const patText = formatOfficialFormAsPlainText(patReq);
  assert.ok(patText.includes('§ 17 Rozporządzenia'));
  assert.ok(patText.includes('TOMASZ ZIELIŃSKI'));
  assert.ok(patText.includes('nie krócej niż 7 dni przed rozpoczęciem urlopu'));
});

test('expectedDeliveryDate pre-fills real dd-mm-rrrr leave dates in ZAM and employer forms', () => {
  const anna = PERSONA_PROFILES[0]!;
  const scenario = { ...anna.scenario, expectedDeliveryDate: '2026-11-18' };
  const result = simulateDualParentPlan(
    anna.mom,
    anna.dad,
    scenario,
    DEFAULT_2026_PARAMS
  );

  const zam = buildOfficialFormSpec({
    persona: anna,
    mom: anna.mom,
    dad: anna.dad,
    scenario,
    params: DEFAULT_2026_PARAMS,
    result,
    requestedKind: 'ZAM',
  });
  const zamText = formatOfficialFormAsPlainText(zam);
  assert.ok(zamText.includes('18-11-2026 r.'));

  const emp = buildOfficialFormSpec({
    persona: anna,
    mom: anna.mom,
    dad: anna.dad,
    scenario,
    params: DEFAULT_2026_PARAMS,
    result,
    requestedKind: 'WNIOSEK_PRACODAWCA',
  });
  const empText = formatOfficialFormAsPlainText(emp);
  assert.ok(empText.includes('06-04-2027 r.'));
  assert.ok(empText.includes('07-04-2027 r.'));
});

