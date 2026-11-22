import type {
  CalculationResult,
  LegislativeParams,
  ParentInput,
  PersonaProfile,
  ScenarioConfig,
} from '../engine/types.ts';
import { addDaysIso, formatPlDate, parseIsoDate } from '../engine/zusEngine.ts';

export type OfficialFormKind =
  | 'ZAM'
  | 'ZAS-53'
  | 'Z-3'
  | 'Z-3a'
  | 'WNIOSEK_PRACODAWCA'
  | 'WNIOSEK_OJCOWSKI_PRACODAWCA'
  | 'ZAM_OJCOWSKI';

export interface FormRow {
  label: string;
  value: string;
  isManualFill?: boolean;
}

export interface FormSection {
  number: string;
  title: string;
  rows?: FormRow[];
  checkboxes?: { checked: boolean; text: string }[];
  paragraphs?: string[];
  table?: {
    headers: string[];
    rows: string[][];
  };
}

export interface OfficialFormSpec {
  kind: OfficialFormKind;
  symbol: string;
  issuerHeader: string;
  title: string;
  legalBasis: string;
  fillingInstruction: string;
  receiptBoxLabel: string;
  sections: FormSection[];
  attachments: { checked: boolean; text: string }[];
  legalNotice: string[];
  signatureLeftLabel: string;
  signatureRightLabel: string;
  filenamePrefix: string;
}

export interface BuildFormInput {
  persona: PersonaProfile;
  mom: ParentInput;
  dad: ParentInput;
  scenario: ScenarioConfig;
  params: LegislativeParams;
  result: CalculationResult;
  requestedKind?: OfficialFormKind;
}

function titleLabel(title: ParentInput['title']): string {
  switch (title) {
    case 'UOP':
      return 'Pracownik (umowa o pracę)';
    case 'B2B':
      return 'Osoba prowadząca pozarolniczą działalność (art. 6 ust. 1 pkt 5 ustawy o SUS)';
    case 'ZLECENIE':
      return 'Zleceniobiorca / umowa o świadczenie usług (art. 6 ust. 1 pkt 4 ustawy o SUS)';
    default:
      return 'Brak aktywnego tytułu ubezpieczenia chorobowego';
  }
}

function formatPlnValue(val: number): string {
  return `${val.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} zł`;
}

function peselOrPlaceholder(peselMask: string, isAnonymous: boolean): string {
  if (isAnonymous || !peselMask || peselMask.includes('-')) {
    return '[ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ]  (wpisz 11 cyfr PESEL)';
  }
  return `${peselMask}  (uzupełnij pełny numer PESEL, jeśli brak na wydruku)`;
}

export function resolveDefaultFormKind(
  mom: ParentInput,
  scenario: ScenarioConfig,
  result: CalculationResult
): OfficialFormKind {
  if (scenario.scenarioType === 'PREGNANCY_SICKNESS') {
    return mom.title === 'UOP' && result.payerMom === 'PRACODAWCA'
      ? 'Z-3'
      : mom.title === 'ZLECENIE'
        ? 'Z-3a'
        : 'ZAS-53';
  }
  return result.payerMom === 'ZUS' ? 'ZAM' : 'WNIOSEK_PRACODAWCA';
}

export function buildOfficialFormSpec(input: BuildFormInput): OfficialFormSpec {
  const { persona, mom, dad, scenario, params, result } = input;
  const kind =
    input.requestedKind ?? resolveDefaultFormKind(mom, scenario, result);

  const isAnonymous = persona.id === 'anonymous' || !mom.name;
  const momDisplayName = (mom.name || '........................................').toUpperCase();
  const dadDisplayName = (dad.name || '........................................').toUpperCase();
  const isZusPayerMom = result.payerMom === 'ZUS';
  const isAdoptionOrFoster =
    scenario.scenarioType === 'ADOPTION' ||
    scenario.scenarioType === 'FOSTER_CARE';
  const isStillbirth = scenario.scenarioType === 'STILLBIRTH';
  const hasSupplementary = result.durations.supplementaryMaternityWeeks > 0;

  const birthIso =
    scenario.expectedDeliveryDate && parseIsoDate(scenario.expectedDeliveryDate)
      ? scenario.expectedDeliveryDate
      : '';
  const birthPl = birthIso ? `${formatPlDate(birthIso)} r.` : '____-____-202__ r.';
  const matDays = Math.max(7, result.durations.momMaternityWeeks * 7);
  const suppDays = result.durations.supplementaryMaternityWeeks * 7;
  const parDays = result.durations.momParentalWeeks * 7;

  const matStartPl = birthIso ? `${formatPlDate(birthIso)} r.` : '____-____-202__ r.';
  const matEndPl = birthIso
    ? `${formatPlDate(addDaysIso(birthIso, matDays - 1))} r.`
    : '____-____-202__ r.';
  const suppStartPl =
    birthIso && suppDays > 0
      ? `${formatPlDate(addDaysIso(birthIso, matDays))} r.`
      : '____-____-202__ r.';
  const suppEndPl =
    birthIso && suppDays > 0
      ? `${formatPlDate(addDaysIso(birthIso, matDays + suppDays - 1))} r.`
      : '____-____-202__ r.';
  const parStartPl =
    birthIso && parDays > 0
      ? `${formatPlDate(addDaysIso(birthIso, matDays + suppDays))} r.`
      : '____-____-202__ r.';
  const parEndPl =
    birthIso && parDays > 0
      ? `${formatPlDate(addDaysIso(birthIso, matDays + suppDays + parDays - 1))} r.`
      : '____-____-202__ r.';
  const patStartPl = birthIso ? `${formatPlDate(birthIso)} r.` : '____-____-202__ r.';
  const patEndPl = birthIso
    ? `${formatPlDate(addDaysIso(birthIso, 13))} r.`
    : '____-____-202__ r.';

  // 1. ZUS ZAM — Wniosek o zasiłek macierzyński (Załącznik nr 6 do Rozp. z 27.09.2026 r.)
  if (kind === 'ZAM' || kind === 'ZAM_OJCOWSKI') {
    const isPaternityOnly = kind === 'ZAM_OJCOWSKI';
    const applicant = isPaternityOnly ? dad : mom;
    const otherParent = isPaternityOnly ? mom : dad;
    const applicantName = (
      applicant.name || '........................................'
    ).toUpperCase();
    const otherParentName = (
      otherParent.name || '........................................'
    ).toUpperCase();
    const applicantPesel = isPaternityOnly
      ? '[ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ]'
      : peselOrPlaceholder(persona.peselMask, isAnonymous);

    const maternityPeriodLabel = isAdoptionOrFoster
      ? `urlopu na warunkach urlopu macierzyńskiego (${result.durations.momMaternityWeeks} tyg.)`
      : isStillbirth
        ? 'urlopu macierzyńskiego po urodzeniu martwym (8 tyg., nie krócej niż 7 dni od zgonu)'
        : `urlopu macierzyńskiego (${result.durations.momMaternityWeeks} tyg.)`;

    return {
      kind,
      symbol: 'ZUS ZAM',
      issuerHeader: 'ZAKŁAD UBEZPIECZEŃ SPOŁECZNYCH',
      title: 'WNIOSEK O ZASIŁEK MACIERZYŃSKI',
      legalBasis:
        'Podstawa prawna: Ustawa z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa (Dz.U. z 2026 r. poz. 854) oraz Załącznik nr 6 do Rozporządzenia MRPiPS z dnia 27 września 2026 r. (Dz.U. z 2026 r. poz. 1316). Od 24.10.2026 r. druk ZAM zastąpił wycofane formularze ZUR, ZAO i Z-3b.',
      fillingInstruction:
        'INSTRUKCJA: Wypełnij WIELKIMI LITERAMI, kolorem czarnym lub niebieskim (nie używaj ołówka). Pola wyboru zaznacz znakiem X. Przed złożeniem uzupełnij puste pola wykropkowane.',
      receiptBoxLabel: 'Data wpływu do ZUS / znak sprawy',
      sections: [
        {
          number: 'I',
          title: 'DANE WNIOSKODAWCY (UBEZPIECZONEGO)',
          rows: [
            {
              label: '1. Numer PESEL',
              value: applicantPesel,
              isManualFill: true,
            },
            {
              label: '2. Rodzaj, seria i nr dokumentu tożsamości + data urodzenia',
              value:
                'Wypełnij wyłącznie, jeśli nie nadano numeru PESEL: ..................................................',
              isManualFill: true,
            },
            {
              label: '3. Pierwsze imię i nazwisko',
              value: applicantName,
            },
            {
              label: '4. Adres zamieszkania',
              value:
                'Ulica: .......................................... Nr domu: ........ Nr lokalu: ........\nKod pocztowy: [ _ ][ _ ]-[ _ ][ _ ][ _ ]  Miejscowość: ............................ Państwo: POLSKA',
              isManualFill: true,
            },
            {
              label: '5. Numer telefonu / adres e-mail (dobrowolnie)',
              value: 'Tel.: ....................................  E-mail: ..................................................',
              isManualFill: true,
            },
            {
              label: '6. Tytuł ubezpieczenia chorobowego (Zał. 6 pkt 4)',
              value: titleLabel(applicant.title),
            },
          ],
        },
        {
          number: 'II',
          title: 'DANE PŁATNIKA SKŁADEK',
          rows: [
            {
              label: '1. NIP / REGON płatnika składek',
              value:
                'NIP: [ _ ][ _ ][ _ ]-[ _ ][ _ ][ _ ]-[ _ ][ _ ]-[ _ ][ _ ]    REGON: .................................... (lub PESEL/dokument, jeśli brak)',
              isManualFill: true,
            },
            {
              label: '2. Nazwa skrócona albo imię i nazwisko płatnika',
              value:
                applicant.title === 'B2B'
                  ? applicantName
                  : '................................................................................................................',
              isManualFill: applicant.title !== 'B2B',
            },
            {
              label: '3. Adres płatnika składek',
              value:
                'Ulica, nr domu/lokalu, kod pocztowy, miejscowość: ........................................................................',
              isManualFill: true,
            },
            {
              label: '4. Liczba ubezpieczonych na 30.11 (art. 61)',
              value: `${applicant.payerInsuredCount} osób — płatnikiem zasiłku jest ${
                applicant.title !== 'UOP' ||
                applicant.payerInsuredCount <= params.payerInsuredThreshold
                  ? 'ZUS (bezpośrednio)'
                  : 'Płatnik składek (pracodawca > 20 ubezpieczonych)'
              }`,
            },
          ],
        },
        {
          number: 'III',
          title: 'ZAKRES WNIOSKU (RODZAJ I OKRES ZASIŁKU MACIERZYŃSKIEGO)',
          paragraphs: [
            'Wnoszę o ustalenie prawa i wypłatę zasiłku macierzyńskiego za okres odpowiadający okresowi:',
          ],
          checkboxes: [
            {
              checked: !isPaternityOnly && !isAdoptionOrFoster,
              text: `urlopu macierzyńskiego — ${maternityPeriodLabel} · od dnia ${matStartPl} do dnia ${matEndPl} (lub przed porodem: przewidywana data porodu ${birthPl})`,
            },
            {
              checked: !isPaternityOnly && isAdoptionOrFoster,
              text: `urlopu na warunkach urlopu macierzyńskiego (przysposobienie / rodzina zastępcza niezawodowa) · od dnia ${matStartPl} do dnia ${matEndPl}`,
            },
            {
              checked: !isPaternityOnly && hasSupplementary,
              text: `uzupełniającego urlopu macierzyńskiego (art. 180² KP — wcześniak / hospitalizacja, wymiar: ${result.durations.supplementaryMaternityWeeks} tyg.) · od dnia ${suppStartPl} do dnia ${suppEndPl}`,
            },
            {
              checked:
                !isPaternityOnly &&
                !isStillbirth &&
                result.durations.momParentalWeeks > 0,
              text: `urlopu rodzicielskiego — wymiar: ${result.durations.momParentalWeeks} tyg. (część nr ${!isStillbirth && result.durations.momParentalWeeks > 0 ? '1' : '____'}) · od dnia ${parStartPl} do dnia ${parEndPl}`,
            },
            {
              checked: isPaternityOnly,
              text: `urlopu ojcowskiego (14 dni kalendarzowych, część nr ${isPaternityOnly ? '1' : '____'}) · od dnia ${patStartPl} do dnia ${patEndPl}`,
            },
            {
              checked: Boolean(scenario.employerBankruptcyOrIllegalDismissal),
              text: 'zgłaszam wniosek po ustaniu zatrudnienia w okresie ciąży z powodu upadłości, likwidacji, śmierci pracodawcy lub rozwiązania umowy z naruszeniem przepisów prawa (Zał. 6 pkt 11).',
            },
          ],
          rows: isPaternityOnly
            ? undefined
            : [
                {
                  label: 'Wnioskowana wysokość zasiłku (art. 30a)',
                  value: `${
                    scenario.selectedVariant === '81.5' ? '[X]' : '[ ]'
                  } 81,5% podstawy wymiaru za cały okres urlopu macierzyńskiego i rodzicielskiego w pełnym wymiarze (wniosek składany nie później niż 21 dni po porodzie)\n${
                    scenario.selectedVariant === '100+70' ? '[X]' : '[ ]'
                  } Zasady ogólne: 100% za urlop macierzyński / uzupełniający / ojcowski oraz 70% za urlop rodzicielski`,
                },
              ],
        },
        {
          number: 'IV',
          title: 'DANE DZIECKA / DZIECI (ORAZ § 13 UST. 2–4 ROZP. Z 27.09.2026 R.)',
          rows: [
            {
              label: '1. Imię i nazwisko dziecka (dzieci)',
              value: '................................................................................................................',
              isManualFill: true,
            },
            {
              label: '2. Numer PESEL dziecka (11 cyfr)',
              value: '[ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ]  (wypełnij po nadaniu w USC)',
              isManualFill: true,
            },
            {
              label: '3. Data i miejsce urodzenia dziecka',
              value: `Data: ${birthPl}    Miejscowość urodzenia: ....................................    Liczba dzieci przy porodzie: ${scenario.childrenCount}`,
              isManualFill: !birthIso,
            },
            {
              label: '4. Zaświadczenie „Za życiem” (art. 4 ust. 3)',
              value: `${scenario.hasZaZyciem ? '[X]' : '[ ]'} TAK (posiadam zaświadczenie lekarskie)    ${
                !scenario.hasZaZyciem ? '[X]' : '[ ]'
              } NIE`,
            },
            ...(hasSupplementary
              ? [
                  {
                    label: '5. Dane hospitalizacji wcześniaka / noworodka (Zał. 6 pkt 12)',
                    value: `Tydzień ciąży: ${scenario.gestationalWeeks} tydz. | Masa urodzeniowa: ${scenario.birthWeightGrams} g | Pobyt w szpitalu: ${scenario.hospitalDays} dni (od ____-____-202__ r. do ____-____-202__ r.)`,
                  },
                ]
              : []),
            {
              label: hasSupplementary
                ? '6. Odpis aktu urodzenia (§ 13 ust. 2–4)'
                : '5. Odpis aktu urodzenia (§ 13 ust. 2–4)',
              value: isZusPayerMom
                ? 'Zgodnie z § 13 ust. 2–4 Rozporządzenia z 27.09.2026 r., gdy płatnikiem zasiłku jest ZUS, nie załącza się papierowego odpisu skróconego aktu urodzenia (ZUS pobiera dane z rejestru stanu cywilnego na podstawie danych dziecka i rodzica).'
                : 'Gdy płatnikiem jest pracodawca (>20 ubezpieczonych), odpis skrócony aktu urodzenia lub kopia pozostaje w dokumentacji płatnika.',
            },
          ],
        },
        {
          number: 'V',
          title: 'DANE DRUGIEGO RODZICA DZIECKA',
          rows: [
            {
              label: '1. Pierwsze imię i nazwisko',
              value: otherParentName,
            },
            {
              label: '2. Numer PESEL (lub dokument + data ur.)',
              value: '[ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ]',
              isManualFill: true,
            },
            {
              label: '3. Adres zamieszkania (Zał. 6 pkt 6)',
              value:
                'Ulica, nr domu/lokalu, kod pocztowy, miejscowość (jeśli niezbędne do rozpatrzenia wniosku): ........................................',
              isManualFill: true,
            },
          ],
        },
        {
          number: 'VI',
          title: 'OŚWIADCZENIA WNIOSKODAWCY (ZAŁĄCZNIK NR 6 PKT 13–16)',
          checkboxes: isPaternityOnly
            ? [
                {
                  checked: true,
                  text: 'Oświadczam, że zasiłek macierzyński za okres urlopu ojcowskiego objęty niniejszym wnioskiem NIE został pobrany z innego tytułu (§ 33 ust. 1 pkt 2).',
                },
                {
                  checked: false,
                  text: 'Oświadczam, że wykorzystałem wcześniej część urlopu ojcowskiego w okresie: od ____-____-202__ r. do ____-____-202__ r. (w wymiarze ____ dni).',
                },
              ]
            : [
                {
                  checked: scenario.selectedVariant === '81.5',
                  text: 'Oświadczam, że zamierzam korzystać z pełnego wymiaru urlopu macierzyńskiego / urlopu na warunkach urlopu macierzyńskiego i urlopu rodzicielskiego oraz co najmniej jeden dzień urlopu rodzicielskiego będzie przypadał w pierwszym roku życia dziecka (Zał. 6 pkt 15).',
                },
                {
                  checked: true,
                  text: `Oświadczam, że drugi rodzic dziecka (${otherParentName}) nie będzie w okresie objętym wnioskiem równolegle korzystał z zasiłku macierzyńskiego za tę samą część urlopu — zamierza skorzystać wyłącznie z przysługującej mu części (${result.durations.dadParentalWeeks} tyg. urlopu rodzicielskiego, w tym 9 tyg. nieprzenoszalnych) oraz ewentualnie urlopu ojcowskiego (Zał. 6 pkt 14).`,
                },
                {
                  checked: false,
                  text: 'Dotychczas korzystałem(am) z zasiłku macierzyńskiego za okres urlopu rodzicielskiego w wymiarze ____ tyg. w ____ częściach u płatnika (NIP/nazwa): .................................... (Zał. 6 pkt 16).',
                },
                {
                  checked: false,
                  text: 'Wniosek składa ojciec / inny członek rodziny w związku z sytuacją matki dziecka (rezygnacja po 14/8 tyg., pobyt w szpitalu, niezdolność do samodzielnej egzystencji, zgon, porzucenie lub niepodleganie ubezpieczeniu przez matkę — Zał. 6 pkt 13).',
                },
              ],
        },
        {
          number: 'VII',
          title: 'NUMER RACHUNKU BANKOWEGO DO WYPŁATY ZASIŁKU',
          rows: [
            {
              label: 'Numer rachunku (IBAN — 26 cyfr)',
              value:
                'PL  [ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]',
              isManualFill: true,
            },
            {
              label: 'Informacja ZUS',
              value:
                'Podanie numeru rachunku bankowego jest dobrowolne. Jeżeli nie podasz numeru konta, zasiłek zostanie wypłacony przekazem pocztowym na wskazany adres zamieszkania.',
            },
          ],
        },
      ],
      attachments: [
        {
          checked: applicant.title === 'UOP' && isZusPayerMom,
          text: 'Zaświadczenie płatnika składek ZUS Z-3 (pracownik, gdy wypłaca ZUS) lub ZUS Z-3a (zleceniobiorca) — Z-3b zniesiono 24.10.2026 r.',
        },
        {
          checked: false,
          text: 'Zaświadczenie lekarskie o przewidywanej dacie porodu — jeżeli wniosek dotyczy okresu przed dniem porodu (§ 13 ust. 1 pkt 1).',
        },
        {
          checked: hasSupplementary,
          text: 'Zaświadczenie wydane przez szpital o okresie pobytu dziecka w szpitalu, tygodniu ciąży i masie urodzeniowej — dla uzupełniającego urlopu macierzyńskiego (§ 26 pkt 4).',
        },
        {
          checked: scenario.hasZaZyciem,
          text: 'Kopia zaświadczenia lekarskiego „Za życiem” (art. 4 ust. 3 ustawy z 4.11.2016 r.).',
        },
        {
          checked: isAdoptionOrFoster,
          text: 'Oświadczenie o dacie przyjęcia dziecka na wychowanie oraz zaświadczenie sądu opiekuńczego / orzeczenie o umieszczeniu w rodzinie zastępczej (§ 16).',
        },
        {
          checked: isStillbirth,
          text: 'Zaświadczenie lekarza specjalisty położnictwa i ginekologii lub położnej o martwym urodzeniu (gdy nie sporządzono aktu urodzenia — § 13 ust. 1 pkt 2).',
        },
      ],
      legalNotice: [
        '1. Świadomy(a) odpowiedzialności karnej za złożenie fałszywego oświadczenia (art. 233 Kodeksu karnego) potwierdzam, że dane zawarte we wniosku są prawdziwe.',
        '2. Zobowiązuję się niezwłocznie poinformować płatnika zasiłku (ZUS lub pracodawcę) o wszelkich zmianach mających wpływ na prawo do zasiłku lub jego wysokość (np. podjęciu pracy zarobkowej, rezygnacji z zasiłku, umieszczeniu dziecka w pieczy zastępczej).',
        applicant.title !== 'UOP'
          ? '3. POUCZENIE (B2B / ZLECENIE): Pobieranie zasiłku macierzyńskiego powoduje ustanie tytułu do ubezpieczeń społecznych — po zakończeniu zasiłku należy w ciągu 7 dni złożyć ponowne zgłoszenie do ubezpieczeń na druku ZUS ZUA.'
          : '3. POUCZENIE: Wniosek można złożyć elektronicznie przez Platformę Usług Elektronicznych eZUS / PUE (katalog usług: Złożenie dokumentu ZAM) albo w formie papierowej w placówce ZUS.',
      ],
      signatureLeftLabel: 'Miejscowość i data (dd-mm-rrrr)',
      signatureRightLabel: 'Czytelny podpis wnioskodawcy',
      filenamePrefix: isPaternityOnly ? 'ZUS_ZAM_Ojcowski' : 'ZUS_ZAM',
    };
  }

  // 2. ZUS ZAS-53 — Wniosek o zasiłek chorobowy (Załącznik nr 1 do Rozp. z 27.09.2026 r.)
  if (kind === 'ZAS-53') {
    const firstPregnancyEzla = persona.eZlaHistory.find((e) => e.code === 'B') ?? persona.eZlaHistory[0];
    const ezlaSeriesText = firstPregnancyEzla
      ? `${firstPregnancyEzla.series} (${firstPregnancyEzla.fromDate} – ${firstPregnancyEzla.toDate})`
      : '.................................................. (wpisz serię i numer e-ZLA)';

    return {
      kind,
      symbol: 'ZUS ZAS-53',
      issuerHeader: 'ZAKŁAD UBEZPIECZEŃ SPOŁECZNYCH',
      title: 'WNIOSEK O ZASIŁEK CHOROBOWY',
      legalBasis:
        'Podstawa prawna: Art. 4, 8, 9, 11 ust. 2 pkt 1 oraz art. 61b ustawy zasiłkowej (Dz.U. z 2026 r. poz. 854) oraz Załącznik nr 1 do Rozporządzenia MRPiPS z dnia 27 września 2026 r. (Dz.U. z 2026 r. poz. 1316).',
      fillingInstruction:
        'INSTRUKCJA: Wypełnij WIELKIMI LITERAMI, kolorem czarnym lub niebieskim (nie używaj ołówka). Pola wyboru zaznacz znakiem X.',
      receiptBoxLabel: 'Data wpływu do ZUS / znak sprawy',
      sections: [
        {
          number: 'I',
          title: 'DANE WNIOSKODAWCY (UBEZPIECZONEGO)',
          rows: [
            {
              label: '1. Numer PESEL',
              value: peselOrPlaceholder(persona.peselMask, isAnonymous),
              isManualFill: true,
            },
            {
              label: '2. Seria i nr paszportu + data urodzenia',
              value: 'Wypełnij wyłącznie, jeśli nie nadano numeru PESEL: ..................................................',
              isManualFill: true,
            },
            {
              label: '3. Pierwsze imię i nazwisko',
              value: momDisplayName,
            },
            {
              label: '4. Adres zamieszkania',
              value:
                'Ulica: .......................................... Nr domu: ........ Nr lokalu: ........\nKod pocztowy: [ _ ][ _ ]-[ _ ][ _ ][ _ ]  Miejscowość: ............................ Państwo: POLSKA',
              isManualFill: true,
            },
            {
              label: '5. Telefon / e-mail (dobrowolnie)',
              value: 'Tel.: ....................................  E-mail: ..................................................',
              isManualFill: true,
            },
          ],
        },
        {
          number: 'II',
          title: 'DANE PŁATNIKA SKŁADEK (ZAŁĄCZNIK NR 1 PKT 2–3)',
          rows: [
            {
              label: '1. NIP i REGON płatnika składek',
              value:
                'NIP: [ _ ][ _ ][ _ ]-[ _ ][ _ ][ _ ]-[ _ ][ _ ]-[ _ ][ _ ]    REGON: .................................... (lub PESEL/paszport, jeśli brak)',
              isManualFill: true,
            },
            {
              label: '2. Nazwa i adres płatnika (albo imię i nazwisko)',
              value:
                mom.title === 'B2B'
                  ? `${momDisplayName} (działalność własna), adres: ..................................................`
                  : '................................................................................................................',
              isManualFill: true,
            },
          ],
        },
        {
          number: 'III',
          title: 'ZAKRES WNIOSKU I DANE ZAŚWIADCZENIA LEKARSKIEGO e-ZLA (ZAŁ. 1 PKT 4–7)',
          rows: [
            {
              label: '1. Okres, za który ubiegasz się o zasiłek',
              value: firstPregnancyEzla
                ? `od dnia ${firstPregnancyEzla.fromDate} do dnia ${firstPregnancyEzla.toDate} (planowane dni z kodem B: ${scenario.pregnancySickDaysPlanned ?? firstPregnancyEzla.days} dni)`
                : 'od dnia ____-____-202__ r. do dnia ____-____-202__ r.',
              isManualFill: !firstPregnancyEzla,
            },
            {
              label: '2. Seria i numer zaświadczenia e-ZLA',
              value: ezlaSeriesText,
              isManualFill: !firstPregnancyEzla,
            },
            {
              label: '3. Kod literowy na e-ZLA',
              value: '[X] Kod „B” (niezdolność do pracy przypadająca w okresie ciąży — 100% podstawy wymiaru, limit 270 dni)',
            },
          ],
          checkboxes: [
            {
              checked: !scenario.employerBankruptcyOrIllegalDismissal,
              text: 'Niezdolność do pracy przypada W OKRESIE ubezpieczenia społecznego w razie choroby i macierzyństwa / wypadkowego (Zał. 1 pkt 6).',
            },
            {
              checked: Boolean(scenario.employerBankruptcyOrIllegalDismissal),
              text: 'Niezdolność do pracy przypada PO USTANIU tytułu ubezpieczenia — tytuł ubezpieczenia ustał z dniem ____-____-202__ r. (należy dołączyć oświadczenie wg Zał. 4 / Z-10).',
            },
            {
              checked: false,
              text: 'Niezdolność powstała z powodu wypadku przy pracy / wypadku w drodze do pracy lub z pracy / choroby zawodowej (Zał. 1 pkt 7 — dokument potwierdzający: ............................).',
            },
            {
              checked: false,
              text: 'Dotyczy marynarza (art. 75 pkt 2 ustawy o pracy na morzu): za wskazany okres przysługuje wynagrodzenie za pracę (Zał. 1 pkt 5).',
            },
          ],
        },
        {
          number: 'IV',
          title: 'NUMER RACHUNKU BANKOWEGO WNIOSKODAWCY (ZAŁĄCZNIK NR 1 PKT 8)',
          rows: [
            {
              label: 'Numer rachunku (IBAN — 26 cyfr)',
              value:
                'PL  [ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]',
              isManualFill: true,
            },
            {
              label: 'Uwaga ZUS',
              value:
                'Pole dobrowolne. W przypadku niewskazania rachunku bankowego zasiłek zostanie wysłany przekazem pocztowym na adres zamieszkania.',
            },
          ],
        },
      ],
      attachments: [
        {
          checked: true,
          text: 'Zaświadczenie lekarskie e-ZLA (przekazywane elektronicznie przez lekarza do systemu ZUS — sprawdź serię i numer w PUE/eZUS).',
        },
        {
          checked: mom.title === 'ZLECENIE',
          text: 'Zaświadczenie płatnika składek ZUS Z-3a (w przypadku ubezpieczonego niebędącego pracownikiem, np. zleceniobiorcy).',
        },
        {
          checked: Boolean(scenario.employerBankruptcyOrIllegalDismissal),
          text: 'Oświadczenie po ustaniu tytułu ubezpieczenia (Załącznik nr 4 / ZUS Z-10) — jeśli niezdolność trwa po ustaniu zatrudnienia.',
        },
      ],
      legalNotice: [
        '1. Zgodnie z art. 17 ustawy zasiłkowej ubezpieczony wykonujący w okresie orzeczonej niezdolności do pracy pracę zarobkową lub wykorzystujący zwolnienie niezgodnie z jego celem traci prawo do zasiłku chorobowego za cały okres tego zwolnienia.',
        '2. W przypadku prowadzenia działalności B2B prawo do zasiłku nie przysługuje, jeżeli na dzień powstania prawa do świadczenia zadłużenie z tytułu składek przekracza 1% minimalnego wynagrodzenia (48,06 zł w 2026 r. — art. 2a ustawy zasiłkowej).',
        '3. Zobowiązuję się niezwłocznie zawiadomić ZUS o każdej zmianie okoliczności mających wpływ na prawo do zasiłku chorobowego lub jego wysokość.',
      ],
      signatureLeftLabel: 'Miejscowość i data (dd-mm-rrrr)',
      signatureRightLabel: 'Czytelny podpis wnioskodawcy',
      filenamePrefix: 'ZUS_ZAS-53',
    };
  }

  // 3. ZUS Z-3 / Z-3a — Zaświadczenie płatnika składek (Załącznik nr 2 i 3 do Rozp. z 27.09.2026 r.)
  if (kind === 'Z-3' || kind === 'Z-3a') {
    const isEmployee = kind === 'Z-3';
    const monthlyBaseGross =
      mom.fteChangedRecently && mom.newFteGross
        ? mom.newFteGross
        : mom.monthlyGross;
    const bonusPart =
      Math.round(
        ((mom.quarterlyBonusesTotal / 12 + mom.annualBonus / 12) + 1e-8) * 100
      ) / 100;

    return {
      kind,
      symbol: isEmployee ? 'ZUS Z-3' : 'ZUS Z-3a',
      issuerHeader: 'ZAKŁAD UBEZPIECZEŃ SPOŁECZNYCH',
      title: isEmployee
        ? 'ZAŚWIADCZENIE PŁATNIKA SKŁADEK (DLA PRACOWNIKA)'
        : 'ZAŚWIADCZENIE PŁATNIKA SKŁADEK (DLA OSOBY NIEBĘDĄCEJ PRACOWNIKIEM)',
      legalBasis: isEmployee
        ? 'Podstawa prawna: § 3 ust. 1 pkt 1 oraz Załącznik nr 2 do Rozporządzenia MRPiPS z dnia 27 września 2026 r. (Dz.U. z 2026 r. poz. 1316). Dokument składa pracodawca, który nie jest płatnikiem zasiłków (≤ 20 ubezpieczonych) lub po ustaniu zatrudnienia.'
        : 'Podstawa prawna: § 3 ust. 1 pkt 2 oraz Załącznik nr 3 do Rozporządzenia MRPiPS z dnia 27 września 2026 r. (Dz.U. z 2026 r. poz. 1316). Dotyczy m.in. zleceniobiorców. Uwaga: druk Z-3b (dla B2B) został zlikwidowany 24.10.2026 r.',
      fillingInstruction:
        'INSTRUKCJA: Dokument wypełnia i podpisuje płatnik składek (pracodawca / zleceniodawca) WIELKIMI LITERAMI lub elektronicznie na PUE/eZUS.',
      receiptBoxLabel: 'Data wpływu do ZUS / znak sprawy',
      sections: [
        {
          number: 'I',
          title: 'DANE IDENTYFIKACYJNE PŁATNIKA SKŁADEK',
          rows: [
            {
              label: '1. NIP i REGON płatnika składek',
              value:
                'NIP: [ _ ][ _ ][ _ ]-[ _ ][ _ ][ _ ]-[ _ ][ _ ]-[ _ ][ _ ]    REGON: ....................................',
              isManualFill: true,
            },
            {
              label: '2. Nazwa i adres płatnika składek',
              value:
                'Nazwa: ....................................................................................\nAdres: ....................................................................................',
              isManualFill: true,
            },
            {
              label: '3. Liczba ubezpieczonych na 30.11 (art. 61)',
              value: `${mom.payerInsuredCount} osób zgłoszonych do ubezpieczenia chorobowego (${
                mom.payerInsuredCount > params.payerInsuredThreshold
                  ? '> 20 — płatnikiem zasiłków jest pracodawca'
                  : '≤ 20 — zasiłek wypłaca ZUS na podstawie niniejszego zaświadczenia'
              })`,
            },
          ],
        },
        {
          number: 'II',
          title: 'DANE OSOBY UBEZPIECZONEJ I RACHUNEK BANKOWY',
          rows: [
            {
              label: '1. Pierwsze imię i nazwisko',
              value: momDisplayName,
            },
            {
              label: '2. Numer PESEL',
              value: peselOrPlaceholder(persona.peselMask, isAnonymous),
              isManualFill: true,
            },
            {
              label: '3. Adres zamieszkania ubezpieczonego',
              value: '................................................................................................................',
              isManualFill: true,
            },
            {
              label: '4. Numer rachunku bankowego ubezpieczonego',
              value:
                'PL  [ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]   [ _ ][ _ ][ _ ][ _ ]',
              isManualFill: true,
            },
          ],
        },
        {
          number: 'III',
          title: isEmployee
            ? 'INFORMACJE O ZATRUDNIENIU, ŚWIADCZENIU I WYPŁATACH (ZAŁ. 2 PKT 4–12)'
            : 'INFORMACJE O UBEZPIECZENIU, ŚWIADCZENIU I WYPŁATACH (ZAŁ. 3 PKT 4–11)',
          rows: isEmployee
            ? [
                {
                  label: '1. Okres zatrudnienia i wymiar etatu',
                  value: `Od ____-____-______ r. do ${
                    mom.fixedTermContract ? '____-____-202__ r. (czas określony)' : 'nadal (czas nieokreślony)'
                  }  |  Zmiana wymiaru czasu pracy (art. 40): ${
                    mom.fteChangedRecently
                      ? `TAK (nowe wynagrodzenie: ${formatPlnValue(monthlyBaseGross)})`
                      : 'NIE'
                  }`,
                },
                {
                  label: '2. Praca za granicą / praca tymczasowa',
                  value: '[ ] TAK   [X] NIE  (Zał. 2 pkt 5–6)',
                },
                {
                  label: '3. Wynagrodzenie chorobowe (art. 92 KP) i wcześniejsze zasiłki',
                  value:
                    scenario.scenarioType === 'PREGNANCY_SICKNESS'
                      ? `Wypłacono wynagrodzenie chorobowe za ${result.pregnancySummary.employerPaidDays} dni w roku kalendarzowym (kod B). Pozostałe okresy od ____-____-202__ do ____-____-202__ przekazuje się do ZUS.`
                      : 'Wypełnij okresy wypłaty wynagrodzenia chorobowego (33/14 dni) oraz kody literowe z bieżącego i poprzedniego roku: ........................................',
                },
                {
                  label: '4. Rodzaj świadczenia, okres i seria/nr e-ZLA (Zał. 2 pkt 19)',
                  value:
                    scenario.scenarioType === 'PREGNANCY_SICKNESS'
                      ? `[X] Zasiłek chorobowy (kod B)  [ ] Macierzyński  |  Okres: ____-____-202__ – ____-____-202__  |  Seria/nr e-ZLA: ....................`
                      : `[ ] Zasiłek chorobowy  [X] Zasiłek macierzyński  |  Data wniosku: ____-____-202__ r. | Stawka: ${scenario.selectedVariant}% | Macierzyński: ${result.durations.momMaternityWeeks} tyg., Uzupełniający: ${result.durations.supplementaryMaternityWeeks} tyg., Rodzicielski: ${result.durations.momParentalWeeks} tyg.`,
                },
                {
                  label: '5. Urlop bezpłatny / wychowawczy / opiekuńczy / areszt (Zał. 2 pkt 8)',
                  value: '[ ] TAK (wskaż okresy: ............................)    [X] NIE',
                },
              ]
            : [
                {
                  label: '1. Tytuł i okresy ubezpieczenia chorobowego',
                  value: `Umowa zlecenia / świadczenie usług · Okres podlegania: od ____-____-______ r. do ____-____-______ r. (${mom.voluntarySicknessDays} dni, przerwa: ${mom.gapBetweenPeriodsDays} dni)`,
                },
                {
                  label: '2. Dobrowolne ubezpieczenie chorobowe',
                  value: mom.hasVoluntarySickness
                    ? '[X] TAK (objęty ubezpieczeniem chorobowym)'
                    : '[ ] NIE (brak zgłoszenia do chorobowego)',
                },
                {
                  label: '3. Rodzaj świadczenia, okres i seria/nr e-ZLA (Zał. 3 pkt 7, 16)',
                  value:
                    scenario.scenarioType === 'PREGNANCY_SICKNESS'
                      ? `[X] Zasiłek chorobowy (kod B)  |  Okres: ____-____-202__ – ____-____-202__  |  Seria/nr e-ZLA: ....................`
                      : `[X] Zasiłek macierzyński  |  Data wniosku: ____-____-202__ r. | Stawka: ${scenario.selectedVariant}% | Poprzednie okresy zasiłkowe: ........................................`,
                },
                {
                  label: '4. Urlop bezpłatny / wychowawczy / opiekuńczy / areszt (Zał. 3 pkt 11)',
                  value: '[ ] TAK (wskaż okresy: ............................)    [X] NIE',
                },
              ],
        },
        {
          number: 'IV',
          title: 'DANE DZIECKA ORAZ DRUGIEGO RODZICA (JEŻELI DOTYCZY ZASIŁKU MACIERZYŃSKIEGO)',
          rows: [
            {
              label: '1. Imię, nazwisko, data urodzenia i PESEL dziecka',
              value:
                `Imię i nazwisko: .................................... Data i miejsce ur.: ${birthPl} ........................  PESEL: [ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ]`,
              isManualFill: true,
            },
            {
              label: '2. Dane drugiego rodzica dziecka',
              value: `${dadDisplayName} · PESEL: [ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ][ _ ] · Adres: ........................................`,
              isManualFill: true,
            },
          ],
        },
        {
          number: 'V',
          title: isEmployee
            ? 'SKŁADNIKI WYNAGRODZENIA ZA OKRESY MIESIĘCZNE, KWARTALNE I ROCZNE (ZAŁ. 2 PKT 16–17)'
            : 'PRZYCHÓD STANOWIĄCY PODSTAWĘ WYMIARU SKŁADEK (ZAŁ. 3 PKT 14)',
          table: {
            headers: [
              'Okres (miesiące / kwartały / rok)',
              isEmployee ? 'Składnik stały (brutto)' : 'Przychód do podstawy składek',
              isEmployee ? 'Składnik zmienny / premie' : 'Dni przepracowane / obowiązujące',
              'Potrącona składka (%)',
            ],
            rows: [
              [
                `Średnia z ${mom.monthsInsuredLast12} mies. poprzedzających`,
                formatPlnValue(monthlyBaseGross),
                isEmployee ? 'wg listy płac (uzupełnij mies. 1–12)' : '30 / 30 dni (pełne miesiące)',
                '13,71%',
              ],
              ...(isEmployee
                ? [
                    [
                      'Składniki kwartalne (4 kwartały, 1/12)',
                      '—',
                      formatPlnValue(mom.quarterlyBonusesTotal),
                      '13,71%',
                    ],
                    [
                      'Składniki roczne (poprzedni rok, 1/12)',
                      '—',
                      formatPlnValue(mom.annualBonus),
                      '13,71%',
                    ],
                    [
                      'Łączna suma dodatków mies. (1/12)',
                      formatPlnValue(bonusPart),
                      `Dodatkowa umowa zlecenie/o dzieło: [ ] TAK  [X] NIE`,
                      '13,71%',
                    ],
                  ]
                : []),
            ],
          },
          paragraphs: [
            'Uwaga: Przed wysyłką w PUE/eZUS płatnik składek wykazuje w tabeli szczegółowe kwoty przychodu za każdy z 12 miesięcy kalendarzowych poprzedzających miesiąc powstania prawa do świadczenia oraz dni nieobecności nieusprawiedliwionej/usprawiedliwionej.',
          ],
        },
      ],
      attachments: [
        {
          checked: true,
          text: 'Wniosek ubezpieczonego o zasiłek macierzyński (ZAM) lub potwierdzenie złożenia e-ZLA.',
        },
        {
          checked: !isEmployee,
          text: 'W przypadku zleceniobiorcy — kopia umowy zlecenia lub oświadczenie o przerwach w ubezpieczeniu (jeśli przerwa ≤ 30 dni).',
        },
      ],
      legalNotice: [
        '1. Zaświadczenie należy przekazać do ZUS niezwłocznie (nie później niż w terminie 7 dni od otrzymania wniosku lub zwolnienia).',
        '2. Za podanie nieprawdziwych danych lub zatajenie okoliczności mających wpływ na prawo do zasiłku grozi odpowiedzialność z art. 84 ustawy o systemie ubezpieczeń społecznych oraz art. 233 Kodeksu karnego.',
      ],
      signatureLeftLabel: 'Data sporządzenia i numer telefonu osoby upoważnionej',
      signatureRightLabel: 'Podpis i pieczęć płatnika składek (lub osoby upoważnionej)',
      filenamePrefix: isEmployee ? 'ZUS_Z-3' : 'ZUS_Z-3a',
    };
  }

  // 4. WNIOSEK_OJCOWSKI_PRACODAWCA (§ 17 Rozporządzenia MRPiPS z 11.03.2025 r.)
  if (kind === 'WNIOSEK_OJCOWSKI_PRACODAWCA') {
    return {
      kind,
      symbol: 'WNIOSEK § 17',
      issuerHeader: 'WNIOSEK PRACOWNIKA – OJCA DO PRACODAWCY',
      title: 'WNIOSEK O UDZIELENIE URLOPU OJCOWSKIEGO',
      legalBasis:
        'Podstawa prawna: Art. 182³ Kodeksu pracy oraz § 17 Rozporządzenia Ministra Rodziny, Pracy i Polityki Społecznej z dnia 11 marca 2025 r. w sprawie wniosków dotyczących uprawnień pracowników związanych z rodzicielstwem (Dz.U. z 2025 r. poz. 322). Termin złożenia: nie krócej niż 7 dni przed rozpoczęciem urlopu.',
      fillingInstruction:
        'INSTRUKCJA: Wniosek składa pracownik – ojciec wychowujący dziecko do kadr pracodawcy w terminie nie krótszym niż 7 dni przed rozpoczęciem korzystania z urlopu (nie później niż do ukończenia przez dziecko 12. miesiąca życia lub 12 mies. od uprawomocnienia przysposobienia, maks. do 14 lat).',
      receiptBoxLabel: 'Data wpływu do kadr pracodawcy',
      sections: [
        {
          number: 'I',
          title: 'DANE PRACOWNIKA ORAZ PRACODAWCY',
          rows: [
            {
              label: '1. Imię i nazwisko pracownika (§ 17 ust. 1 pkt 1)',
              value: dadDisplayName,
            },
            {
              label: '2. Pracodawca (nazwa i adres)',
              value: '................................................................................................................',
              isManualFill: true,
            },
          ],
        },
        {
          number: 'II',
          title: 'TREŚĆ WNIOSKU (§ 17 UST. 1 PKT 2)',
          rows: [
            {
              label: '1. Wnioskowany okres urlopu ojcowskiego',
              value:
                `Wnoszę o udzielenie urlopu ojcowskiego w wymiarze 14 dni kalendarzowych (lub pierwszej/drugiej części w wymiarze 7 dni): od dnia ${patStartPl} do dnia ${patEndPl}`,
              isManualFill: !birthIso,
            },
            {
              label: '2. Dane dziecka',
              value: `Imię i nazwisko dziecka: ....................................  Data urodzenia: ${birthPl}`,
              isManualFill: true,
            },
            {
              label: '3. Oświadczenie o wcześniejszym korzystaniu (§ 17 ust. 2 pkt 3)',
              value:
                '[X] Oświadczam, że dotychczas NIE korzystałem z urlopu ojcowskiego (ani jego części) na wskazane dziecko.\n[ ] Korzystałem z pierwszej części urlopu ojcowskiego w wymiarze 7 dni w okresie: ............................',
            },
          ],
        },
      ],
      attachments: [
        {
          checked: true,
          text: 'Odpis skrócony aktu urodzenia dziecka (lub jego kopia) — chyba że znajduje się już w aktach osobowych pracownika (§ 22 Rozp.).',
        },
        {
          checked: isAdoptionOrFoster,
          text: 'Kopia prawomocnego postanowienia sądu o przysposobieniu dziecka — w przypadku przysposobienia (§ 17 ust. 2 pkt 2).',
        },
      ],
      legalNotice: [
        '1. Za okres urlopu ojcowskiego przysługuje zasiłek macierzyński w wysokości 100% podstawy wymiaru.',
        '2. Pracodawca jest obowiązany uwzględnić wniosek pracownika złożony w terminie nie krótszym niż 7 dni przed rozpoczęciem urlopu (art. 182³ § 2 KP).',
      ],
      signatureLeftLabel: 'Miejscowość i data (dd-mm-rrrr)',
      signatureRightLabel: 'Czytelny podpis pracownika',
      filenamePrefix: 'Wniosek_Urlop_Ojcowski_KP',
    };
  }

  // 5. WNIOSEK_PRACODAWCA — Rozporządzenie MRPiPS z 11.03.2025 r. (§ 14, § 15, § 16, § 18 + art. 30a)
  const parentalWeeksLabel = result.durations.momParentalWeeks;
  return {
    kind: 'WNIOSEK_PRACODAWCA',
    symbol: 'WNIOSEK § 15',
    issuerHeader: 'WNIOSEK PRACOWNIKA DO PRACODAWCY',
    title:
      'WNIOSEK O UDZIELENIE URLOPU RODZICIELSKIEGO (ORAZ OŚWIADCZENIE ART. 30a)',
    legalBasis:
      'Podstawa prawna: Art. 182¹d Kodeksu pracy, § 15 (oraz § 14 / § 16 / § 18) Rozporządzenia MRPiPS z dnia 11 marca 2025 r. w sprawie wniosków dotyczących uprawnień pracowników związanych z rodzicielstwem (Dz.U. z 2025 r. poz. 322) oraz art. 30a ustawy zasiłkowej (termin 21 dni od porodu dla stawki 81,5%).',
    fillingInstruction:
      'INSTRUKCJA: Wniosek składa się pracodawcy (w terminie nie krótszym niż 21 dni przed rozpoczęciem urlopu rodzicielskiego). Aby uzyskać jednolitą stawkę 81,5% za cały okres, wniosek o wypłatę zasiłku (art. 30a) należy złożyć nie później niż 21 dni po porodzie.',
    receiptBoxLabel: 'Data wpływu do kadr pracodawcy',
    sections: [
      {
        number: 'I',
        title: 'DANE PRACOWNIKA I PRACODAWCY (§ 15 UST. 1 PKT 1)',
        rows: [
          {
            label: '1. Imię i nazwisko pracownika',
            value: momDisplayName,
          },
          {
            label: '2. Pracodawca (nazwa i adres)',
            value: `........................................................................ (liczba ubezpieczonych: ${mom.payerInsuredCount} os.)`,
            isManualFill: true,
          },
          {
            label: '3. Imię, nazwisko i data urodzenia dziecka',
            value: `........................................................................  Data urodzenia: ${birthPl}`,
            isManualFill: true,
          },
        ],
      },
      {
        number: 'II',
        title: 'DOTYCHCZAS WYKORZYSTANY URLOP I CZĘŚCI (§ 15 UST. 1 PKT 2)',
        rows: [
          {
            label: '1. Wykorzystany urlop rodzicielski / zasiłek',
            value:
              'Dotychczas wykorzystany okres urlopu rodzicielskiego (lub zasiłku macierzyńskiego za ten okres): 0 tygodni / 0 dni (wniosek składany o pierwszą część bezpośrednio po urlopie macierzyńskim).',
          },
          {
            label: '2. Liczba wykorzystanych części / wniosków',
            value: '0 wykorzystanych części (z maksymalnie 5 dopuszczalnych części do końca roku kalendarzowego, w którym dziecko kończy 6 lat).',
          },
        ],
      },
      {
        number: 'III',
        title: 'WSKAZANIE OKRESU URLOPU I WYSOKOŚCI ZASIŁKU (§ 15 UST. 1 PKT 3 + ART. 30a)',
        checkboxes: [
          {
            checked: true,
            text: `Wnoszę o udzielenie urlopu rodzicielskiego bezpośrednio po urlopie macierzyńskim (${result.durations.momMaternityWeeks} tyg.) w wymiarze ${parentalWeeksLabel} tygodni (z wyłącznej puli 9 tygodni dla drugiego rodzica: ${dadDisplayName}) — na okres od dnia ${parStartPl} do dnia ${parEndPl}`,
          },
          {
            checked: hasSupplementary,
            text: `Jednocześnie na podstawie § 14 Rozporządzenia wnoszę o udzielenie uzupełniającego urlopu macierzyńskiego (art. 180² KP) w wymiarze ${result.durations.supplementaryMaternityWeeks} tygodni bezpośrednio po urlopie macierzyńskim (termin zakończenia urlopu macierzyńskiego: ${matEndPl}, okres uzupełniającego: od ${suppStartPl} do ${suppEndPl}).`,
          },
          {
            checked: scenario.combineParentalWithWork,
            text: `Na podstawie § 16 Rozporządzenia wnoszę o łączenie korzystania z urlopu rodzicielskiego z wykonywaniem pracy w wymiarze ${Math.round(
              scenario.workCombinationFraction * 100
            )}% etatu w okresie od ${parStartPl} do ${parEndPl} (proporcjonalne wydłużenie o ${result.durations.parentalExtendedWeeks} tyg.).`,
          },
          {
            checked: scenario.selectedVariant === '81.5',
            text: 'Na podstawie art. 30a ustawy zasiłkowej (wniosek złożony nie później niż 21 dni po porodzie) wnoszę o wypłatę zasiłku macierzyńskiego za cały okres urlopu macierzyńskiego i rodzicielskiego w ujednoliconej wysokości 81,5% podstawy wymiaru.',
          },
          {
            checked: scenario.selectedVariant === '100+70',
            text: 'Wnoszę o wypłatę zasiłku macierzyńskiego na zasadach ogólnych: 100% za okres urlopu macierzyńskiego oraz 70% za okres urlopu rodzicielskiego.',
          },
        ],
      },
      {
        number: 'IV',
        title: 'OŚWIADCZENIE O DRUGIM RODZICU (§ 15 UST. 2 PKT 2)',
        paragraphs: [
          `Oświadczam, że drugi rodzic dziecka (${dadDisplayName}) nie ma zamiaru korzystać z urlopu rodzicielskiego ani z zasiłku macierzyńskiego za okres odpowiadający okresowi urlopu rodzicielskiego przez wskazany wyżej okres (skorzysta oddzielnie z nieprzenoszalnych 9 tygodni lub innej wskazanej części: ${result.durations.dadParentalWeeks} tyg.).`,
        ],
      },
    ],
    attachments: [
      {
        checked: true,
        text: 'Odpis skrócony aktu urodzenia dziecka (lub kopia) — chyba że dokument znajduje się już w aktach osobowych pracownika (§ 22 Rozp.).',
      },
      {
        checked: true,
        text: 'Oświadczenie pracownika o braku zamiaru korzystania z urlopu rodzicielskiego przez drugiego rodzica w okresie objętym wnioskiem (§ 15 ust. 2 pkt 2).',
      },
      {
        checked: scenario.hasZaZyciem,
        text: 'Kopia zaświadczenia „Za życiem” z art. 4 ust. 3 ustawy z 4.11.2016 r. (§ 15 ust. 2 pkt 3).',
      },
      {
        checked: hasSupplementary,
        text: 'Zaświadczenie wydane przez szpital o tygodniu ciąży, masie urodzeniowej i okresie hospitalizacji dziecka + oświadczenie drugiego rodzica o niekorzystaniu z urlopu uzupełniającego (§ 14 ust. 2).',
      },
      {
        checked: isAdoptionOrFoster,
        text: 'Oświadczenie o dacie przyjęcia dziecka na wychowanie oraz dokument sądowy / umowa ze starostą (§ 15 ust. 4 / § 18).',
      },
    ],
    legalNotice: [
      '1. Zgodnie z art. 177 § 1 KP od dnia złożenia wniosku o udzielenie urlopu macierzyńskiego lub rodzicielskiego pracownik podlega szczególnej ochronie przed wypowiedzeniem i rozwiązaniem stosunku pracy.',
      mom.payerInsuredCount <= params.payerInsuredThreshold
        ? '2. Ponieważ pracodawca zgłasza ≤ 20 ubezpieczonych, po przyjęciu wniosku przekazuje do ZUS zaświadczenie płatnika składek ZUS Z-3 wraz z kopią wniosku.'
        : '2. Ponieważ pracodawca zgłasza > 20 ubezpieczonych, pracodawca samodzielnie ustala prawo do zasiłku i wypłaca świadczenie w terminach wypłat wynagrodzeń.',
    ],
    signatureLeftLabel: 'Miejscowość i data (dd-mm-rrrr)',
    signatureRightLabel: 'Czytelny podpis pracownika',
    filenamePrefix: 'Wniosek_Pracownika_Rodzicielski',
  };
}

export function formatOfficialFormAsPlainText(spec: OfficialFormSpec): string {
  const lines: string[] = [];
  lines.push(`${spec.symbol} — ${spec.title}`);
  lines.push(spec.issuerHeader);
  lines.push(spec.legalBasis);
  lines.push('');
  lines.push(spec.fillingInstruction);
  lines.push('================================================================');

  for (const sec of spec.sections) {
    lines.push('');
    lines.push(`${sec.number}. ${sec.title}`);
    lines.push('----------------------------------------------------------------');
    if (sec.paragraphs) {
      for (const p of sec.paragraphs) lines.push(p);
    }
    if (sec.rows) {
      for (const r of sec.rows) {
        lines.push(`${r.label}: ${r.value}`);
      }
    }
    if (sec.checkboxes) {
      for (const cb of sec.checkboxes) {
        lines.push(`${cb.checked ? '[X]' : '[ ]'} ${cb.text}`);
      }
    }
    if (sec.table) {
      lines.push(sec.table.headers.join(' | '));
      for (const row of sec.table.rows) {
        lines.push(row.join(' | '));
      }
    }
  }

  lines.push('');
  lines.push('ZAŁĄCZNIKI:');
  for (const att of spec.attachments) {
    lines.push(`${att.checked ? '[X]' : '[ ]'} ${att.text}`);
  }

  lines.push('');
  lines.push('POUCZENIE:');
  for (const note of spec.legalNotice) {
    lines.push(note);
  }

  lines.push('');
  lines.push(
    `${spec.signatureLeftLabel}: ......................    ${spec.signatureRightLabel}: ....................................`
  );

  return lines.join('\n');
}
