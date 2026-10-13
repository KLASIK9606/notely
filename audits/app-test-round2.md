# Test aplikacji — runda 2

Data: 9 października 2026. Tester niezależny od autorów sesji i fiszek słówek.

## Wynik

- `npm test`: **141/141 PASS**, bez pominiętych testów.
- `npm run typecheck`: **PASS**, exit 0.
- Przeglądarka localhost:8081: poniższe scenariusze wykonane przez interfejs, również przy viewport 320 × 640.
- Nie wykonywano rzeczywistych płatnych wywołań Gemini/OpenAI/Claude, odczytu ręcznego pisma przez model, testów fizycznego mikrofonu ani Expo Go na telefonach.
- Dane wyłącznie testowe, nowe zestawy z prefiksem TEST. Bez kasowania prawdziwych materiałów ani zmian kluczy. Zestawy testowe pozostawiono w profilu testowej przeglądarki. Po testach przywrócono rozmiar viewport.

## Błędy wykryte i naprawione w tej rundzie

1. **Kółko wykładowcy bez AI wyglądało na aktywne, lecz nie reagowało.** Odtworzenie: materiał przykładowy → Wykładowca AI bez skonfigurowanej chmury → kliknięcie kółka. Dolny przycisk był disabled, kółko nie. Root naprawił stan disabled/accessibility. Po poprawce oba przyciski są wyłączone; konfiguracja pozostaje dostępna przez Ustaw AI.
2. **Fiszka mogła zapisać `[nieczytelne]` jako tłumaczenie.** Odtworzenie: Dodaj → Fiszki ze słówek → `apple — [nieczytelne]` i `cut — ciąć`. Początkowo 2 gotowe karty i aktywny zapis. Autor naprawił parser i blokadę AI. Regresja: 1 gotowa karta, wskazanie wiersza 1, Zrób fiszki i Uzupełnij znaczenia z AI wyłączone. Automatyczne testy obejmują również `[niepewne]` w pytaniu.

## Scenariusze przeglądarkowe

| Obszar | Wykonany test i wynik |
| --- | --- |
| Notatka | Otwarcie materiału przykładowego, rozwinięcie pojęcia i sekcji, pokazanie odczytu ze źródłowymi liniami: PASS. |
| Quiz | Błędna pierwsza odpowiedź i dwie poprawne; wyjaśnienia, następne pytania, wynik 2/3, kolejne odpowiedzi oraz powrót: PASS. |
| Sesja fiszek | Sześć ocen Umiem → Sesja zakończona → Ćwicz ponownie: otwiera sześć kart, licznik 0, komunikat o niezmienianiu terminów: PASS. |
| Ćwiczenie | Nie umiem reinseruje kartę; Cofnij ostatnią ocenę przywraca odpowiedź, kolejkę i licznik 0: PASS. Brak zapisu terminów w practice potwierdzony także testem harmonogramu. |
| Ustawienia | Niedostępny localhost:3001 daje czytelny, trwały błąd połączenia. Brak znikającej informacji po ułamku sekundy: PASS. |
| Nagrania UI | Nagraj wykład rozwija Dodaj audio / Chcę nagrać i informację o 20 minutach: PASS. Sam dźwięk nie był nagrywany. |
| Fiszki bez AI | Trzy pary apple/pear/potato → licznik 3 → zapis → sesja 3 kart → powrót do listy: PASS. Bez klucza AI. |
| Duża lista | 650 par → licznik 650 → zapis → FISZKA 1/650 i 10 nowych w kolejce → reload → wyszukiwarka 650 → 650 kart oraz 650 nowych: PASS. |
| Trwałość | Krótki zestaw i duży zestaw przetrwały przeładowanie strony. Oddzielny szkic słówek z obrazem i tekstem przetrwał reload: PASS. |
| Niepełne pary | apple — jabłko + cut: zapis wyłączony, wskazanie wiersza 2. Lokalne uzupełnienie AI bez chmury zwraca jasny komunikat i zachowuje tekst: PASS. |
| Zdjęcie | Import istniejącego testowego favicon PNG przez picker, widoczny plik i podpis. OCR bez lokalnego silnika zwraca jasny błąd, zachowuje plik i listę: PASS. Nie dowodzi jakości OCR. |
| Izolacja | Powrót z fiszek do materiałów zachowuje oba oddzielne szkice; zdjęcia nie są mieszane: PASS. |
| Oryginał | Zapisany zestaw z obrazem ma przycisk źródła, modal pokazuje obraz, Zamknij oryginał zamyka go po animacji: PASS. |
| Mały ekran | Na 320 × 640 przycisk Fiszki ze słówek jest czytelny; odpowiedź jabłko oraz Umiem / Nie umiem mieszczą się bez przewijania: PASS. |

## Zakres testów automatycznych

Pełny zestaw obejmuje harmonogram i słabe karty, paginację fiszek/quizów bez utraty znaków, parser długiej listy i niepełnych par, endpoint vocabulary (kolejność i dokładna liczba, brak podmiany wpisów, bezpieczne błędy), przechowywanie plików, anulowanie pickera i OCR, audio, usuwanie i współdzielone pliki oraz zabezpieczenia odpowiedzi wykładowcy. To kontrolowane testy z podstawionym IO/dostawcą; nie zastępują testów faktycznego modelu i telefonu.

## Co wymaga następnego testu na urządzeniu

Zdjęcie prawdziwej listy słówek → rzeczywisty OCR → korekta niepewnych wierszy → zapis; przerwanie w trakcie kilku batchy tłumaczenia → zachowanie częściowych wyników; iPhone/Android uprawnienia kamery/galerii/mikrofonu i odtwarzanie audio. W tej rundzie nie znaleziono dodatkowego blokującego błędu w wykonanych scenariuszach, ale nie oznacza to pełnego sprawdzenia każdej ścieżki aplikacji.
