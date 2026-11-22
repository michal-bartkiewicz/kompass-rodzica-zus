import test from 'node:test';
import assert from 'node:assert/strict';
import { parseZusDocumentTextFallback } from './pdfTextParser.ts';

test('parseZusDocumentTextFallback rozpoznaje formularz Z-3b z zadłużeniem i przerwą w ubezpieczeniu', () => {
  const sampleText = `
    ZAKŁAD UBEZPIECZEŃ SPOŁECZNYCH — ZUS Z-3b
    Wnioskodawca: Anna Nowak
    Tytuł: Prowadzenie pozarolniczej działalności gospodarczej (B2B)
    Liczba ubezpieczonych na 30.11: 1
    Podstawa składek brutto: 14 000,00 zł
    Staż ubezpieczenia chorobowego: 120 dni
    Przerwa między okresami ubezpieczenia: 18 dni
    Zadłużenie na koncie płatnika: 18,50 zł
    Dobrowolne ubezpieczenie chorobowe: TAK
    Wniosek związany z ciążą: TAK
    PUE/eZUS: TAK
  `;

  const parsed = parseZusDocumentTextFallback(sampleText, 'Wniosek_Z-3b.pdf');

  assert.equal(parsed.formType, 'Z-3b');
  assert.equal(parsed.applicantName, 'Anna Nowak');
  assert.equal(parsed.insuredTitle, 'B2B');
  assert.equal(parsed.payerInsuredCount, 1);
  assert.equal(parsed.monthlyGrossDeclared, 14000);
  assert.equal(parsed.insuranceDaysTotal, 120);
  assert.equal(parsed.gapBetweenPeriodsDays, 18);
  assert.equal(parsed.b2bDebtAmount, 18.5);
  assert.equal(parsed.hasVoluntarySickness, true);
  assert.equal(parsed.isPregnancyRelated, true);
  assert.equal(parsed.submittedViaPue, true);
});

test('parseZusDocumentTextFallback rozpoznaje wniosek ZAS-53 dla B2B z kodem B i krótkim stażem', () => {
  const sampleText = `
    ZUS ZAS-53 — Wniosek o zasiłek chorobowy
    Ubezpieczony: Alicja Kowalczyk
    Tytuł ubezpieczenia: działalność gospodarcza B2B
    Okres ubezpieczenia chorobowego: 60 dni
    Przychód brutto: 8 400,00 zł
    Zadłużenie: 0,00 zł
    Zwolnienie z kodem "B": 25 dni
    Złożono w 14 dzień po porodzie
  `;

  const parsed = parseZusDocumentTextFallback(sampleText, 'Przyklad_ZAS-53.pdf');

  assert.equal(parsed.formType, 'ZAS-53');
  assert.equal(parsed.applicantName, 'Alicja Kowalczyk');
  assert.equal(parsed.insuredTitle, 'B2B');
  assert.equal(parsed.insuranceDaysTotal, 60);
  assert.equal(parsed.monthlyGrossDeclared, 8400);
  assert.equal(parsed.b2bDebtAmount, 0);
  assert.equal(parsed.usedSickDaysWithCodeB, 25);
  assert.equal(parsed.isPregnancyRelated, true);
  assert.equal(parsed.claimDaysAfterBirth, 14);
});
