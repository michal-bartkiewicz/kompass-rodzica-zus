import type { AuditInput, FormType, InsuranceTitle } from '../engine/types.ts';

function parsePlNumber(raw?: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, '').replace(',', '.');
  const val = Number(cleaned);
  return Number.isFinite(val) ? val : null;
}

/**
 * Deterministyczny parser awaryjny dla natywnych PDF-ów z warstwą tekstową
 * (używany, gdy brak klucza GEMINI_API_KEY po stronie serwera).
 */
export function parseZusDocumentTextFallback(
  text: string,
  fileName = ''
): AuditInput {
  const combined = `${fileName}\n${text}`;
  const upper = combined.toUpperCase();

  let formType: FormType = 'INNY';
  if (/ZUS\s*Z-?3B|Z-3B/.test(upper)) formType = 'Z-3b';
  else if (/ZUS\s*Z-?3A|Z-3A/.test(upper)) formType = 'Z-3a';
  else if (/ZUS\s*Z-?3\b|Z-3\b/.test(upper)) formType = 'Z-3';
  else if (/ZAS-?53/.test(upper)) formType = 'ZAS-53';
  else if (/ZAS-?12/.test(upper)) formType = 'ZAS-12';
  else if (/\bZUR\b/.test(upper)) formType = 'ZUR';
  else if (/\bZAO\b/.test(upper)) formType = 'ZAO';
  else if (/ZUS\s*ZAM|\bZAM\b/.test(upper)) formType = 'ZAM';
  else if (/PO[ŚS]WIADCZENI/.test(upper)) formType = 'POSWIADCZENIE';

  let insuredTitle: InsuranceTitle = 'UOP';
  if (/B2B|POZAROLNICZ|DZIAŁALNOŚ|DZIALALNOS/.test(upper)) insuredTitle = 'B2B';
  else if (/ZLECENI|ŚWIADCZENIE USŁUG/.test(upper)) insuredTitle = 'ZLECENIE';
  else if (/BRAK UBEZPIECZENIA/.test(upper)) insuredTitle = 'BRAK';

  const nameMatch = text.match(
    /(?:Wnioskodawca(?:\s*\/\s*Płatnik składek)?|Imię i nazwisko|Ubezpieczony)\s*[:\-]\s*([A-ZŁŚŻŹĆŃÓ][a-ząćęłńóśźż]+\s+[A-ZŁŚŻŹĆŃÓ][a-ząćęłńóśźż\-]+)/i
  );
  const applicantName = nameMatch?.[1]?.trim() || 'Wnioskodawca z dokumentu PDF';

  const grossMatch = text.match(
    /(?:przychód brutto|podstawa składek|wynagrodzenie brutto|podstawa wymiaru)[^0-9]{0,30}([\d\s]+[,.]\d{2}|\d[\d\s]{2,6})\s*zł/i
  );
  const monthlyGrossDeclared = parsePlNumber(grossMatch?.[1]) ?? 6500;

  const debtMatch = text.match(
    /(?:zadłużenie|zaległość|saldo)[^0-9]{0,35}([\d\s]+[,.]\d{2}|\d+)\s*zł/i
  );
  const b2bDebtAmount = parsePlNumber(debtMatch?.[1]) ?? 0;

  const daysMatch = text.match(
    /(?:staż ubezpieczenia|okres ubezpieczenia chorobowego)[^0-9\n]{0,50}(\d+)\s*dni/i
  );
  const insuranceDaysTotal = daysMatch ? Number(daysMatch[1]) : 180;

  const gapMatch = text.match(/przerwa[^0-9\n]{0,50}(\d+)\s*dni/i);
  const gapBetweenPeriodsDays = gapMatch ? Number(gapMatch[1]) : 0;

  const countMatch = text.match(
    /(?:liczba ubezpieczonych(?:\s+na\s+30\.11(?:\.\d{4})?)?|zgłaszanych przez płatnika(?:\s+na\s+30\.11(?:\.\d{4})?)?|osób na 30\.11(?:\.\d{4})?)\s*[:\-]?\s*(\d+)/i
  );
  const payerInsuredCount = countMatch
    ? Math.max(1, Number(countMatch[1]))
    : insuredTitle === 'B2B'
      ? 1
      : 15;

  const codeBDaysMatch = text.match(/kodem?\s*[„"]?B[”"]?[^0-9]{0,25}(\d+)\s*dni/i);
  const usedSickDaysWithCodeB = codeBDaysMatch ? Number(codeBDaysMatch[1]) : 0;

  const claimDayMatch = text.match(/(\d+)\s*dzień\s*(?:po porodzie)?/i);
  const claimDaysAfterBirth = claimDayMatch ? Number(claimDayMatch[1]) : 14;

  const hasVoluntarySickness = !/dobrowoln\w*\s+ubezpieczen\w*\s+chorobow\w*:\s*NIE|brak dobrowolnej/i.test(
    text
  );
  const isPregnancyRelated = /ciąż|poród|porod|macierzyńsk|kod\s*[„"]?B[”"]?/i.test(text);
  const submittedViaPue = /PUE\s*[:\/]?\s*e?ZUS|PUE\/eZUS:\s*TAK/i.test(text);

  return {
    formType,
    applicantName,
    insuredTitle,
    payerInsuredCount,
    insuranceDaysTotal,
    gapBetweenPeriodsDays,
    hasVoluntarySickness,
    b2bDebtAmount,
    monthlyGrossDeclared,
    monthsInsuredLast12: Math.max(1, Math.min(12, Math.round(insuranceDaysTotal / 30) || 12)),
    isPregnancyRelated,
    usedSickDaysBeforePregnancy: 0,
    usedSickDaysWithCodeB,
    hasSecondEmploymentTitle: false,
    optOutSecondTitleL4_2027: false,
    has10YearsMandatoryInsurance: false,
    claimDaysAfterBirth,
    submittedViaPue,
    notes: 'Odczytano lokalnie z warstwy tekstowej PDF (tryb awaryjny bez klucza AI).',
  };
}
