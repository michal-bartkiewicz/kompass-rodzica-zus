export interface LegalChunk {
  id: string;
  article: string;
  sourceDoc: string;
  topic: string;
  keywords: string[];
  excerpt: string;
}

export const LEGAL_CORPUS: LegalChunk[] = [
  {
    id: 'kp-180-macierzynski',
    article: 'Art. 180 § 1–4 Kodeksu pracy',
    sourceDoc: 'Kodeks pracy (wyciąg z przepisów)',
    topic: 'Wymiar urlopu macierzyńskiego i minimalne 14 tygodni po porodzie',
    keywords: [
      'macierzynski',
      'urlop',
      'wymiar',
      '20',
      '31',
      '33',
      '35',
      '37',
      'bliznieta',
      '14 tygodni',
      'przed porodem',
      '6 tygodni',
    ],
    excerpt:
      'Urlop macierzyński wynosi 20 tygodni przy urodzeniu jednego dziecka, 31 tygodni przy dwojgu dzieci, 33 przy trojgu, 35 przy czworgu oraz 37 tygodni przy pięciorgu i więcej dzieci. Przed przewidywaną datą porodu można wykorzystać nie więcej niż 6 tygodni urlopu. Po porodzie pracownica musi wykorzystać co najmniej 14 tygodni urlopu (chyba że zachodzą szczególne przesłanki z § 5–7, np. 8 tygodni przy hospitalizacji lub niezdolności do samodzielnej egzystencji).',
  },
  {
    id: 'kp-180-1-martwe',
    article: 'Art. 180¹ § 1–2 Kodeksu pracy',
    sourceDoc: 'Kodeks pracy (wyciąg z przepisów)',
    topic: 'Urlop macierzyński w razie urodzenia martwego lub zgonu dziecka',
    keywords: [
      'martwe',
      'urodzenie martwe',
      'poronienie',
      'zgon',
      '8 tygodni',
      '7 dni',
      'z-12',
      'pogrzebowy',
    ],
    excerpt:
      'W razie urodzenia martwego dziecka lub zgonu dziecka przed upływem 8 tygodni życia, pracownicy przysługuje urlop macierzyński w wymiarze 8 tygodni po porodzie, nie krócej jednak niż przez okres 7 dni od dnia zgonu dziecka. Zasiłek macierzyński wynosi 100% podstawy. Dodatkowo przysługuje zryczałtowany zasiłek pogrzebowy (7 000 zł w 2026 r., druk Z-12, w terminie 12 miesięcy).',
  },
  {
    id: 'kp-180-2-wczesniak',
    article: 'Art. 180² § 1–5 Kodeksu pracy',
    sourceDoc: 'Kodeks pracy oraz Poradnik dla rodziców ZUS 2026',
    topic: 'Uzupełniający urlop macierzyński dla rodziców wcześniaków i dzieci hospitalizowanych',
    keywords: [
      'wczesniak',
      'uzupelniajacy',
      'szpital',
      'hospitalizacja',
      '15 tygodni',
      '8 tygodni',
      '28 tydzien',
      '1000 g',
      'masa urodzeniowa',
      'donoszone',
      '180^2',
    ],
    excerpt:
      'Bezpośrednio po wykorzystaniu urlopu macierzyńskiego przysługuje uzupełniający urlop macierzyński (płatny 100% podstawy): do 15 tygodni przy urodzeniu przed ukończeniem 28. tygodnia ciąży lub z masą urodzeniową <= 1000 g (tydzień urlopu za każdy tydzień pobytu w szpitalu), do 8 tygodni przy urodzeniu między 28. a 37. tygodniem ciąży (> 1000 g) oraz do 8 tygodni po 37. tygodniu, jeżeli pobyt dziecka w szpitalu wynosi co najmniej 2 kolejne dni od 5. do 28. dnia po porodzie. Wniosek składa się najpóźniej na 21 dni przed końcem podstawowego urlopu macierzyńskiego.',
  },
  {
    id: 'kp-182-1a-rodzicielski',
    article: 'Art. 182¹a–182¹f Kodeksu pracy',
    sourceDoc: 'Kodeks pracy (wyciąg z przepisów)',
    topic: 'Urlop rodzicielski (41/43 tyg.), 9 tygodni dla drugiego rodzica i łączenie z pracą',
    keywords: [
      'rodzicielski',
      '41',
      '43',
      '9 tygodni',
      'nieprzenoszalna',
      'ojciec',
      'drugi rodzic',
      'laczenie z praca',
      '1/2 etatu',
      'za zyciem',
      '65',
      '67',
    ],
    excerpt:
      'Urlop rodzicielski wynosi do 41 tygodni (1 dziecko) lub 43 tygodni (poród mnogi), a dla posiadaczy zaświadczenia „Za życiem” odpowiednio 65 lub 67 tygodni. Każdemu z rodziców przysługuje wyłączne prawo do 9 tygodni urlopu rodzicielskiego, którego nie można przenieść na drugiego rodzica. Urlop można wykorzystać w maksymalnie 5 częściach do końca roku kalendarzowego, w którym dziecko kończy 6 lat. Łączenie urlopu rodzicielskiego z pracą w wymiarze do 1/2 etatu wydłuża ten urlop proporcjonalnie (maksymalnie do 82/86 tygodni lub 130/134 przy Za życiem — art. 182¹f § 7 KP).',
  },
  {
    id: 'kp-182-3-ojcowski',
    article: 'Art. 182³ Kodeksu pracy',
    sourceDoc: 'Kodeks pracy (wyciąg z przepisów)',
    topic: 'Urlop ojcowski — 2 tygodnie do 12. miesiąca życia dziecka',
    keywords: [
      'ojcowski',
      'ojciec',
      'tata',
      '14 dni',
      '2 tygodnie',
      '12 miesiecy',
      '7 dni',
      '100%',
    ],
    excerpt:
      'Pracownik – ojciec ma prawo do urlopu ojcowskiego w wymiarze do 2 tygodni (14 dni kalendarzowych), nie dłużej jednak niż do ukończenia przez dziecko 12. miesiąca życia albo 12 miesięcy od uprawomocnienia przysposobienia (do 14 lat). Może być wykorzystany w 2 częściach po 7 dni. Wniosek składa się pracodawcy nie krócej niż 7 dni przed rozpoczęciem urlopu (zasiłek 100%).',
  },
  {
    id: 'kp-183-adopcja-piecza',
    article: 'Art. 183 § 1–4 Kodeksu pracy',
    sourceDoc: 'Kodeks pracy oraz Poradnik dla rodziców ZUS 2026',
    topic: 'Urlop na warunkach macierzyńskiego — adopcja (14 lat), rodzina zastępcza (7/10 lat), min. 9 tygodni',
    keywords: [
      'adopcja',
      'przysposobienie',
      'rodzina zastepcza',
      'piecza',
      '14 lat',
      '7 lat',
      '10 lat',
      'odroczenie',
      '9 tygodni',
      '38 tygodni',
      '62 tygodnie',
    ],
    excerpt:
      'Przy przysposobieniu dziecka urlop na warunkach macierzyńskiego przysługuje do ukończenia przez dziecko 14 lat; dla rodziny zastępczej niezawodowej — do 7 lat (albo 10 lat przy odroczeniu obowiązku szkolnego). Jeśli do osiągnięcia granicy wieku pozostało mniej niż standardowy wymiar, urlop trwa nie krócej niż 9 tygodni (art. 183 § 3 KP), a urlop rodzicielski wynosi wówczas 38 tygodni lub 62 tygodnie przy zaświadczeniu „Za życiem” (art. 183 § 4 KP).',
  },
  {
    id: 'kp-177-ochrona-umowy',
    article: 'Art. 177 § 1–3¹ Kodeksu pracy',
    sourceDoc: 'Kodeks pracy (wyciąg z przepisów)',
    topic: 'Przedłużenie umowy na czas określony do porodu i umowa na zastępstwo',
    keywords: [
      'czas okreslony',
      'umowa',
      'przedluzenie',
      'zastepstwo',
      '3 miesiac',
      'porod',
      'ochrona',
      'wypowiedzenie',
    ],
    excerpt:
      'Umowa o pracę na czas określony albo na okres próbny przekraczający 1 miesiąc, która uległaby rozwiązaniu po upływie 3. miesiąca ciąży, ulega przedłużeniu do dnia porodu (z mocy prawa, zasiłek macierzyński po porodzie wypłaca ZUS). Zasada przedłużenia NIE dotyczy umowy o pracę na czas określony zawartej w celu zastępstwa (art. 177 § 3¹ KP).',
  },
  {
    id: 'uz-2a-dlug-b2b',
    article: 'Art. 2a ustawy zasiłkowej',
    sourceDoc: 'Ustawa o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa',
    topic: 'Pułapka zadłużenia składkowego B2B powyżej 1% płacy minimalnej (48,06 zł)',
    keywords: [
      'b2b',
      'zadluzenie',
      'dlug',
      'zaleglosc',
      '2a',
      '1%',
      '48,06',
      '62',
      '6 miesiecy',
      'przedsiebiorca',
      'dzialalnosc',
    ],
    excerpt:
      'Osobom prowadzącym pozarolniczą działalność i duchownym zasiłek chorobowy, opiekuńczy ani macierzyński NIE przysługuje w razie występowania w dniu powstania prawa do świadczenia zadłużenia z tytułu składek na ubezpieczenia społeczne na kwotę przekraczającą 1% minimalnego wynagrodzenia za pracę (w 2026 r.: 48,06 zł) — do czasu spłaty całości zadłużenia. Jeśli zadłużenie nie zostanie uregulowane w ciągu 6 miesięcy od dnia powstania prawa do świadczenia, prawo to ulega przedawnieniu.',
  },
  {
    id: 'uz-4-wyczekiwanie',
    article: 'Art. 4 i art. 29 ust. 1 ustawy zasiłkowej',
    sourceDoc: 'Ustawa zasiłkowa (wyciąg z przepisów)',
    topic: 'Okres wyczekiwania 30 / 90 dni (L4 w ciąży a zasiłek macierzyński)',
    keywords: [
      'wyczekiwania',
      '30 dni',
      '90 dni',
      'przerwa',
      'dobrowolne',
      'chorobowe',
      'ciaza',
      'kod b',
      'zas-53',
      'macierzynski',
      '10 lat',
    ],
    excerpt:
      'Zasiłek chorobowy (także w ciąży z kodem B na ZAS-53) wymaga okresu wyczekiwania: 30 dni nieprzerwanego ubezpieczenia dla etatu (UoP, chyba że pracownik ma >= 10 lat obowiązkowego ubezpieczenia — art. 4 ust. 3 pkt 3) oraz 90 dni dla ubezpieczonych dobrowolnie (B2B, zlecenie). Do okresu wlicza się poprzednie okresy, jeśli przerwa nie przekroczyła 30 dni. Natomiast dla zasiłku macierzyńskiego NIE obowiązuje żaden okres wyczekiwania — przysługuje od 1. dnia ubezpieczenia chorobowego.',
  },
  {
    id: 'uz-8-9-limit270',
    article: 'Art. 8, art. 9 ust. 2 i art. 11 ust. 2 pkt 1 ustawy zasiłkowej',
    sourceDoc: 'Ustawa zasiłkowa (wyciąg z przepisów)',
    topic: 'Zasiłek chorobowy w ciąży (100%, kod B, 270 dni) i świadczenie rehabilitacyjne ZNp-7',
    keywords: [
      '270 dni',
      'chorobowy',
      'kod b',
      '100%',
      'rehabilitacyjne',
      'znp-7',
      'przerwa',
      'nowy okres',
      '33 dni',
    ],
    excerpt:
      'Miesięczny zasiłek chorobowy przypadający w okresie ciąży (kod literowy B) wynosi 100% podstawy wymiaru i przysługuje maksymalnie przez 270 dni (na UoP pierwsze 33 dni lub 14 dni po 50 r.ż. płaci pracodawca z art. 92 KP; na B2B/zleceniu od 1. dnia płaci ZUS na druk ZAS-53). Po wyczerpaniu 270 dni przysługuje świadczenie rehabilitacyjne (100% w ciąży, wniosek ZUS ZNp-7). Poprzednia zwykła choroba sprzed przerwy nie sumuje się z nowym okresem zasiłkowym w ciąży (art. 9 ust. 2).',
  },
  {
    id: 'uz-30a-31-815-1000',
    article: 'Art. 30a i art. 31 ust. 3a–4a ustawy zasiłkowej',
    sourceDoc: 'Ustawa zasiłkowa oraz Poradnik ZUS 2026',
    topic: 'Stawka 81,5% (termin 21 dni), 100% + 70%, wyrównanie do 1000 zł oraz zwrot z art. 31 ust. 4',
    keywords: [
      '81,5',
      '81.5',
      '100%',
      '70%',
      '21 dni',
      '1000',
      'kosiniakowe',
      'wyrownanie',
      '30a',
      '31',
      'rezygnacja',
      'praca',
    ],
    excerpt:
      'Wniosek złożony nie później niż 21 dni po porodzie uprawnia do jednolitej stawki 81,5% przez cały urlop macierzyński i rodzicielski (za wyłączne 9 tygodni drugiego rodzica zawsze przysługuje 70%). Gdy nie złożono wniosku w 21 dni, stawki wynoszą 100% (macierzyński) i 70% (rodzicielski). Jeśli miesięczna kwota zasiłku netto jest niższa niż 1 000 zł (świadczenie rodzicielskie), ZUS podwyższa ją do 1 000 zł netto (art. 31 ust. 3a). Jeśli matka pobierała 81,5%, ale nie wykorzystała żadnego dnia urlopu rodzicielskiego w 1. roku życia dziecka, przysługuje jednorazowe wyrównanie macierzyńskiego do 100% (art. 31 ust. 4).',
  },
  {
    id: 'uz-40-48a-podstawa',
    article: 'Art. 36–40, art. 45 i art. 48a ustawy zasiłkowej',
    sourceDoc: 'Ustawa zasiłkowa (wyciąg z przepisów)',
    topic: 'Podstawa wymiaru (13,71%, premie 1/12, zmiana etatu art. 40, krótkie B2B art. 48a, limit 250%)',
    keywords: [
      'podstawa',
      '13,71',
      'premia',
      'kwartalna',
      'roczna',
      'zmiana etatu',
      'art. 40',
      'art. 48a',
      '250%',
      '23550',
      '4877',
      '1244',
      '4147',
      'minimalna',
    ],
    excerpt:
      'Dla pracownika UoP podstawę stanowi średnie wynagrodzenie z 12 mies. pomniejszone o 13,71% składek społecznych (premie kwartalne i roczne w 1/12, minimum w 2026 r.: 4 147,10 zł po odliczeniu). Zmiana etatu powoduje przyjęcie wyłącznie wynagrodzenia z nowego etatu (art. 40). Dla B2B poniżej 12 mies. ubezpieczenia stosuje się art. 48a: najniższa podstawa (4 877,11 zł dla standardowego 60% ZUS lub 1 244,13 zł dla preferencyjnego 30% Małego ZUS) + 1/12 nadwyżki za każdy pełny miesiąc ubezpieczenia; górny limit przychodu to 250% prognozowanego wynagrodzenia (23 550,00 zł brutto w 2026 r.).',
  },
  {
    id: 'uz-61-zua7dni',
    article: 'Art. 61 ustawy zasiłkowej oraz art. 36 ust. 11 ustawy o SUS',
    sourceDoc: 'Ustawa zasiłkowa i Poradnik ZUS 2026',
    topic: 'Kto wypłaca zasiłek (próg 20 ubezpieczonych) i zgłoszenie ZUS ZUA w 7 dni po B2B',
    keywords: [
      'platnik',
      '20 osob',
      '30 listopada',
      'pracodawca',
      'zus',
      'zua',
      '7 dni',
      'wyrejestrowanie',
      'ulga na start',
    ],
    excerpt:
      'Płatnik składek zgłaszający na 30 listopada poprzedniego roku powyżej 20 ubezpieczonych wypłaca zasiłki samodzielnie (pracodawca). Przy 20 i mniej ubezpieczonych oraz dla wszystkich B2B i zleceniobiorców zasiłki wypłaca bezpośrednio ZUS. W trakcie pobierania zasiłku macierzyńskiego na B2B lub zleceniu następuje wyrejestrowanie ze składek społecznych — po jego zakończeniu należy w ciągu 7 dni ponownie zgłosić się na druku ZUS ZUA.',
  },
  {
    id: 'rozp-2026-zam-akt',
    article: '§ 13 ust. 2–4 Rozp. MRPiPS z 27.09.2026 r. (Dz.U. poz. 1316) i wytyczne ZUS 24.10.2026 r.',
    sourceDoc: 'Rozporządzenie w sprawie zakresu informacji oraz Wyzwanie ZUS 11.2026',
    topic: 'Wniosek ZAM zamiast ZUR/ZAO/Z-3b oraz brak papierowego odpisu aktu urodzenia',
    keywords: [
      'zam',
      'zur',
      'zao',
      'z-3b',
      'zniesiony',
      'wycofany',
      '24 pazdziernika',
      'akt urodzenia',
      'odpis',
      '13 ust. 2',
      'pesel',
    ],
    excerpt:
      'Od 24 października 2026 r. ZUS wycofał stare druki ZUR, ZAO oraz Z-3b i zastąpił je jednym ujednoliconym wnioskiem ZUS ZAM (Załącznik nr 6 do rozporządzenia z 27.09.2026 r.). Ponadto na mocy § 13 ust. 2–4 tego rozporządzenia, gdy płatnikiem zasiłku jest ZUS, rodzic NIE ma obowiązku załączać papierowego skróconego odpisu aktu urodzenia dziecka — wystarczy podanie imienia, daty urodzenia i numeru PESEL dziecka we wniosku.',
  },
  {
    id: 'nowelizacja-2027',
    article: 'Art. 17 ust. 1d–1e oraz art. 9 ust. 4 ustawy zasiłkowej (nowelizacja 01.01.2027 r., Dz.U. 2026 poz. 26)',
    sourceDoc: 'Wyciąg z ustawy zasiłkowej (brzmienie od 01.01.2027 r.)',
    topic: 'Dwa tytuły ubezpieczenia w trakcie L4 (stan 2026 vs symulacja 2027)',
    keywords: [
      '2027',
      'dwa tytuly',
      'drugi tytul',
      'art. 17',
      'praca zarobkowa',
      'e-zla',
      'oswiadczenie',
      'nowelizacja',
    ],
    excerpt:
      'W 2026 r. wykonywanie jakiejkolwiek pracy zarobkowej z drugiego tytułu podczas e-ZLA grozi utratą całego zasiłku chorobowego (art. 17 ust. 1). Od 1 stycznia 2027 r. (Dz.U. 2026 poz. 26, art. 17 ust. 1d–1e) dopuszcza się pracę na odmiennym drugim tytule, jeśli zezwala na nią charakter pracy i ubezpieczony złoży stosowne oświadczenie płatnikowi, przy zachowaniu wspólnego okresu zasiłkowego (art. 9 ust. 4).',
  },
];

function normalizePl(text: string): string {
  return text
    .toLowerCase()
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ź|ż/g, 'z')
    .replace(/[^a-z0-9.,^/-]+/g, ' ')
    .trim();
}

export function retrieveLegalChunks(
  query: string,
  topK = 5
): LegalChunk[] {
  const normQuery = normalizePl(query);
  if (!normQuery) return LEGAL_CORPUS.slice(0, topK);

  const tokens = normQuery
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const scored = LEGAL_CORPUS.map((chunk) => {
    const hayTitle = normalizePl(`${chunk.article} ${chunk.topic}`);
    const hayKeywords = chunk.keywords.map(normalizePl);
    const hayBody = normalizePl(chunk.excerpt);

    let score = 0;
    for (const tok of tokens) {
      const stem = tok.length > 4 ? tok.slice(0, tok.length - 1) : tok;
      if (hayKeywords.some((kw) => kw.includes(stem))) score += 5;
      if (hayTitle.includes(stem)) score += 3;
      if (hayBody.includes(stem)) score += 1.5;
    }
    // Exact number / article boosts
    for (const num of normQuery.match(/\d+(?:[.,]\d+)?/g) ?? []) {
      if (hayKeywords.some((kw) => kw.includes(num)) || hayBody.includes(num)) {
        score += 4;
      }
    }
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, topK);
  if (top.length > 0) return top.map((s) => s.chunk);
  return LEGAL_CORPUS.slice(0, topK);
}
