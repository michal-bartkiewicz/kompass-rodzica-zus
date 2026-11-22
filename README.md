# Kompas Rodzica ZUS

Przewodnik po świadczeniach i uprawnieniach związanych z ciążą i rodzicielstwem. Projekt przygotowany na wyzwanie HackNation 2026 „Zasiłkowy Przewodnik Przyszłego Rodzica”.

## Logowanie i dokumenty

Aplikacja nie łączy się z eZUS, PUE, login.gov.pl ani USC. W oknie logowania można wybrać przypadek testowy; jest to symulacja logowania. Statusy kont, saldo, e-ZLA, odpowiedzi PUE i numery wniosków USC są przykładowe. Dane w przykładowych dokumentach są fikcyjne lub zanonimizowane.

Wygenerowane pliki PDF są projektami wniosków, a nie oficjalnymi drukami ZUS. Każdy projekt ma oznaczenie „NIE JEST OFICJALNYM FORMULARZEM ZUS. NIE SKŁADAJ.” Przed złożeniem dokumentu należy pobrać właściwy formularz z [zus.pl](https://www.zus.pl/wzory-formularzy/zasilki).

## Funkcje

- Zintegrowany kalkulator świadczeń dla obojga rodziców: wariant 81,5% oraz 100% + 70%, planowanie urlopów i podsumowanie terminów.
- Scenariusze ciąży i zasiłku chorobowego, wcześniactwa i hospitalizacji, adopcji, pieczy zastępczej, martwego urodzenia oraz przejęcia opieki.
- Audyt dokumentów: wgranie PDF, skanu lub zdjęcia, korekta rozpoznanych danych oraz sześć syntetycznych profili testowych.
- Asystent prawa z odpowiedziami opartymi na lokalnym zbiorze fragmentów aktów prawnych.
- Symulator konta eZUS, odpowiedzi PUE i wniosku USC.
- Panel do zmiany parametrów prawnych.
- Tryb Spokojnej Pomocy, katalog wsparcia oraz ustawienia dostępności.

## Szybki start

1. Kliknij „Zaloguj się do eZUS”. W oknie wybierz przypadek testowy — to symulacja logowania, bez hasła i bez łączenia z eZUS — albo przejdź dalej z własnymi danymi.
2. Porównaj warianty zasiłku, terminy oraz ostrzeżenia.
3. W „Audytorze PDF” wgraj plik albo wybierz jeden z przykładowych PDF-ów pod polem wgrywania.
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
- Przykłady w aplikacji zawierają dane fikcyjne lub zanonimizowane. Nie wgrywaj dokumentów ani danych, do których nie masz prawa dostępu.

## Struktura

- `src/engine/` — reguły, modele danych, profile i syntetyczne przypadki audytowe.
- `src/components/` — kalkulator, audytor, pomoc prawna, symulatory i interfejs.
- `src/utils/` — parser PDF, wzory projektów dokumentów i generatory PDF.
- `server.ts` — API obliczeń, audytu, asystenta prawa oraz parametrów.
- `public/assets/aistudio/` — materiały prawne i treść zadania konkursowego.

## Zakres usługi

Zewnętrzne integracje z eZUS, PUE i USC nie są aktywne; ich odpowiedzi i statusy są symulowane. Generowane dokumenty nie są oficjalnymi drukami ZUS. Zmiany parametrów prawnych wymagają `ADMIN_ACCESS_KEY`; operator jest identyfikowany przez `ADMIN_ACTOR_ID`. Zapis i dziennik zmian (`params-audit.jsonl`) znajdują się w `DATA_DIR`; w hostingu należy wskazać tam trwały wolumen, inaczej dane mogą zniknąć po restarcie lub wdrożeniu. Tryb deweloperski działa bez klucza administratora i zapisuje operatora jako `developer`. Przed wdrożeniem należy zapewnić bezpieczną obsługę dokumentów oraz zweryfikować reguły z aktualnymi źródłami ZUS.

## Kryteria wyzwania

Projekt łączy przewodnik, kalkulator, symulację danych i audyt dokumentów w jednym interfejsie. Interfejs jest responsywny, a AI pomaga odczytywać dokumenty i wyjaśniać teksty prawne; obliczenia pozostają deterministyczne. Przykładowe dokumenty zawierają dane fikcyjne lub zanonimizowane.

Prezentacja (9 slajdów), zrzuty ekranu i film prezentacyjny są w katalogu `submission/`. Film trwa około 2 minut, zawiera polski lektor i napisy wypalone w obrazie.
