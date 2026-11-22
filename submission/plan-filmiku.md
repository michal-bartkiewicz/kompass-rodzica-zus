# Plan filmu prezentacyjnego — Kompas Rodzica ZUS

**Wersja robocza · dla jury HackYeah · 2:20–2:30 · format 16:9, 1080p**

## Cel

W krótkim filmie pokazać drogę rodzica od niepewności do zrozumiałego planu: wybór przypadku, porównanie świadczeń, kontrolę dokumentu i następny krok. Film ma prezentować działające funkcje, jasno oznaczać symulację logowania i nie sugerować połączenia z ZUS.

## Przebieg ujęć i narracja

| Czas | Obraz / działanie | Narracja |
|---|---|---|
| 0:00–0:08 | Start aplikacji. Krótkie zbliżenie na tytuł i ilustrację rodziny. | „Narodziny dziecka to także terminy, urlopy, dokumenty i decyzje, które dotyczą obojga rodziców.” |
| 0:08–0:25 | Kliknięcie „Zaloguj się do eZUS”. W oknie widoczne „Symulacja logowania” i wybór przypadku testowego. Zaznaczyć fikcyjny profil. | „Kompas prowadzi przez tę drogę krok po kroku. W prezentacji wybieram przypadek testowy. To symulacja — nie podajemy hasła ani kodu i nie łączymy się z eZUS.” |
| 0:25–0:52 | Kalkulator: profile rodziców, warianty 81,5% oraz 100% + 70%, podział kwot i oś czasu. Powolny scroll. | „Kalkulator uwzględnia sytuację obojga rodziców. Porównuje warianty, pokazuje kwoty i terminy, a wynik oblicza deterministyczny silnik reguł.” |
| 0:52–1:10 | Zmiana przypadku przez ten sam modal na scenariusz B2B z zaległością. Zbliżenie na ostrzeżenie i jego wyjaśnienie. | „Gotowe przypadki pomagają zauważyć wyjątki, na przykład zaległość składkową lub zwolnienie w ciąży. Można też wprowadzić własne dane ręcznie.” |
| 1:10–1:32 | Audytor PDF na dołączonym, syntetycznym dokumencie. Pokazać rozpoznane pola, werdykt i rozwijane uzasadnienie. | „Audytor sprawdza dokument i wyjaśnia wynik. Szczegóły prawne są dostępne wtedy, kiedy są potrzebne.” |
| 1:32–1:52 | Symulator eZUS: historia e-ZLA, przykładowe saldo, ścieżka USC, kreator projektu PDF. Na wydruku widoczna pieczęć „Projekt testowy — nie składaj”. | „Dalsze widoki pokazują przykładową historię i kolejne kroki. Projekty dokumentów zawierają fikcyjne dane i są wyraźnie oznaczone jako testowe.” |
| 1:52–2:10 | Asystent prawa: pytanie o wybrany temat, krótki wynik i źródło przepisu. Nie pokazywać danych osobowych. | „Asystent objaśnia przepisy i wskazuje źródła. Kwoty i terminy nadal liczy silnik reguł, a nie model językowy.” |
| 2:10–2:25 | Powrót do widoku startowego. Plansza z nazwą projektu i trzema hasłami: „Oblicz · Sprawdź · Zaplanuj”. | „Kompas Rodzica ZUS pomaga spokojniej zaplanować kolejne kroki. Przed złożeniem wniosku zawsze sprawdź aktualne wymagania ZUS.” |

## Wskazówki realizacyjne

- Nagranie ekranu z lokalnej wersji aplikacji pod `http://localhost:3000`; 1920×1080, 30 kl./s.
- Używać wyłącznie fikcyjnych profili i przykładowego PDF. Nie pokazywać prawdziwego PESEL-u, danych logowania, kluczy API ani zawartości plików `.env`.
- Zostawić na ekranie oznaczenie „Symulacja logowania” podczas wyboru przypadku. Nie wpisywać i nie odgrywać prawdziwego logowania.
- Rejestrować UI bez paska przeglądarki, przy stałym powiększeniu. Ruch kursora spokojny; przejścia proste, bez szybkich cięć.
- Dodać polskie napisy zsynchronizowane z narracją. Muzyka cicha i neutralna; głos wyraźniejszy od podkładu.
- Jeżeli film pokazuje asystenta korzystającego z Gemini, użyć wyłącznie fikcyjnego pytania. Interfejs informuje, kiedy treść pytania i kontekst są wysyłane do usługi.

## Opcjonalne intro wygenerowane w Gemini Veo

Warto użyć krótkiego, 6-sekundowego przebitkowego ujęcia otwierającego. Resztę filmu lepiej nagrać bezpośrednio z aplikacji, żeby UI i tekst pozostały prawdziwe.

**Prompt do wklejenia w Veo:**

> Create a 6-second horizontal 16:9 establishing shot for a warm, trustworthy explainer about planning parental leave and benefits in Poland. In a bright, cozy family apartment in soft morning light, show a close-up of two adults' hands calmly arranging a blank paper calendar, a pen, a few completely blank neutral forms, and tiny baby booties on a wooden table. The camera makes a slow, steady push-in across the table; gentle sage-green and warm cream palette, natural cinematic light, subtle handcrafted storybook realism, calm and reassuring mood. Leave uncluttered negative space in the upper left for an editor-added title. Keep every page blank: no readable text, no numbers, no logos, no government emblems, no app screens, no watermarks. Do not show faces or identifiable personal information. No dialogue and no generated captions. End on a close view of a blank form so it can cut cleanly to a real screen recording of the app.

## Materiały do ujęć

- Aktualny ekran startowy: `submission/screenshots/01-start.jpg`
- Aktualne okno logowania: `submission/screenshots/02-logowanie-ezus.jpg`
- Aktualny kalkulator: `submission/screenshots/03-kalkulator.jpg`
- Aktualny widok eZUS: `submission/screenshots/05-symulator-ezus.jpg`
- Pozostałe widoki prezentacji: `submission/screenshots/04-audytor-pdf.jpg`, `06-asystent-prawa.jpg`, `07-mobile.jpg`

## Przed nagraniem

1. Otworzyć lokalną aplikację i sprawdzić pełną ścieżkę od logowania do pobrania projektu PDF.
2. Wybrać konkretne przypadki: Anna dla porównania wariantów oraz Kasia dla ostrzeżenia o zaległości.
3. Przygotować syntetyczny PDF i pytanie do asystenta; ukryć wszelkie powiadomienia systemowe.
4. Nagrać osobno obraz i narrację, następnie dodać napisy, planszę końcową i krótki podkład.
5. Obejrzeć eksport bez dźwięku i z dźwiękiem, sprawdzając czytelność napisów oraz widoczność oznaczeń symulacji.
