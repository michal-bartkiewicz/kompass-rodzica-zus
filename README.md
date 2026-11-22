# Kompas Rodzica ZUS

Demonstracyjny przewodnik po świadczeniach i uprawnieniach związanych z ciążą i rodzicielstwem. Projekt przygotowany na wyzwanie HackNation 2026 „Zasiłkowy Przewodnik Przyszłego Rodzica”.

## Ważne: tryb demonstracyjny

Aplikacja nie łączy się z eZUS, PUE, login.gov.pl ani USC. Logowanie tylko wybiera fikcyjny profil, a statusy kont, saldo, e-ZLA, odpowiedzi PUE i numery wniosków USC są symulowane. Przykłady w audytorze są syntetyczne i nie są sprawami przekazanymi przez ZUS.

Wygenerowane pliki PDF są projektami demonstracyjnymi, a nie oficjalnymi drukami ZUS. Każdy projekt ma oznaczenie „NIE JEST OFICJALNYM FORMULARZEM ZUS. NIE SKŁADAJ.” Przed złożeniem dokumentu należy pobrać właściwy formularz z [zus.pl](https://www.zus.pl/wzory-formularzy/zasilki).

## Co można zademonstrować

- Zintegrowany kalkulator świadczeń dla obojga rodziców: wariant 81,5% oraz 100% + 70%, planowanie urlopów i podsumowanie terminów.
- Scenariusze ciąży i zasiłku chorobowego, wcześniactwa i hospitalizacji, adopcji, pieczy zastępczej, martwego urodzenia oraz przejęcia opieki.
- Audyt dokumentów: wgranie PDF, skanu lub zdjęcia, korekta rozpoznanych danych oraz sześć syntetycznych profili testowych.
- Asystent prawa z odpowiedziami opartymi na lokalnym zbiorze fragmentów aktów prawnych.
- Symulator konta eZUS, odpowiedzi PUE i wniosku USC.
- Panel demonstracyjny do zmiany parametrów prawnych.
- Tryb Spokojnej Pomocy, katalog wsparcia oraz ustawienia dostępności.

## Krótka ścieżka demo

1. Wybierz „profil demo” i jeden z przykładowych scenariuszy albo otwórz kalkulator i wpisz własne dane.
2. Porównaj warianty zasiłku, terminy oraz ostrzeżenia.
3. W „Audytorze PDF” wybierz syntetyczny zestaw testowy lub wygeneruj przykładowy PDF i wgraj go do audytu.
4. Sprawdź pola odczytane przez OCR, popraw je ręcznie i przenieś dane do kalkulatora.
5. Otwórz „eZUS i Wnioski”, aby zobaczyć projekty dokumentów i symulację odpowiedzi.

## Uruchomienie lokalne

Wymagany jest Node.js zgodny z używaną wersją Vite.

```bash
npm install
cp .env.example .env
npm run dev
```

Serwer deweloperski uruchamia aplikację na porcie 3000. Klucz `GEMINI_API_KEY` jest opcjonalny. Przy audycie tekstowy PDF może zostać odczytany lokalnym parserem bez klucza; analiza skanu i asystent prawa korzystają z Gemini po skonfigurowaniu klucza. Domyślny model to `gemini-3.5-flash-lite`; można go zmienić przez `GEMINI_MODEL`. Produkcyjny podgląd uruchomisz poleceniami `npm run build` i `npm start`.

## AI, OCR i dane

- Kalkulacje kwot, podstaw i wymiarów urlopów wykonuje deterministyczny silnik reguł w `src/engine/zusEngine.ts`.
- Asystent prawa korzysta z lokalnego korpusu `src/engine/legalCorpus.ts`; przy ustawionym `GEMINI_API_KEY` pytanie i kontekst ostatnich wiadomości są wysyłane do Gemini, które formułuje odpowiedź na podstawie wybranych fragmentów.
- Audytor przygotowuje tekst i obrazy stron w przeglądarce, a następnie wysyła je do lokalnego endpointu aplikacji. Gdy serwer ma skonfigurowany Gemini, przekazuje treść PDF lub obrazy skanu do tej usługi w celu odczytu pól. Bez klucza Gemini dostępny jest lokalny parser tekstu PDF; skany wymagają AI.
- Używaj profili demo lub dokumentów syntetycznych. Nie wgrywaj prawdziwych dokumentów ani danych osobowych do demonstracji.

## Struktura

- `src/engine/` — reguły, modele danych, profile i syntetyczne przypadki audytowe.
- `src/components/` — kalkulator, audytor, pomoc prawna, symulatory i interfejs.
- `src/utils/` — parser PDF, wzory projektów dokumentów i generatory PDF.
- `server.ts` — API obliczeń, audytu, asystenta prawa oraz parametrów.
- `public/assets/aistudio/` — materiały prawne i treść zadania konkursowego.

## Ograniczenia prototypu

To demonstracja, nie system do podejmowania decyzji urzędowych. Profile i zestawy audytowe są syntetyczne, integracje zewnętrzne są symulowane, a generowane dokumenty nie są oficjalnymi drukami. Zmiany parametrów w produkcji wymagają `ADMIN_ACCESS_KEY`; w trybie deweloperskim panel jest dostępny bez klucza. Aplikacja nie prowadzi jeszcze dziennika zmian. Przed wdrożeniem trzeba dodać audyt zmian, ustalić bezpieczny sposób obsługi dokumentów oraz zweryfikować reguły z aktualnymi źródłami ZUS.

## Kryteria wyzwania

Projekt łączy przewodnik, kalkulator, symulację danych i audyt dokumentów w jednym interfejsie. Interfejs jest responsywny, a AI jest ograniczone do odczytu dokumentów i pomocy w interpretacji tekstów prawnych; obliczenia pozostają deterministyczne. W repozytorium są materiały źródłowe oraz syntetyczne przypadki demonstracyjne. Oficjalne przykładowe sprawy ZUS nie są częścią tego repozytorium.

Materiały wymagane przy zgłoszeniu — prezentację (do 10 slajdów), zrzuty ekranu i film demonstracyjny (do 3 minut) — należy dołączyć osobno do zgłoszenia.
