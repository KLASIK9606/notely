# Przegląd notatki i niejasnych fragmentów — 9.10.2026

## Zakres i dowody

Niezależne testy kontrolowane w `src/transcriptionReview.integration.test.mjs` obejmują poprawę pojedynczego ostrzeżenia, niezmieniony tekst, świadome potwierdzenie, remapowanie po usunięciu, pominięcie bez wysyłania placeholderów oraz pusty wynik bez wywołania AI. Fixture historyczny o powstaniu styczniowym sprawdza zachowanie zwykłego akapitu i źródeł przez rzeczywisty pipeline; nie udaje odpowiedzi Gemini.

Przeglądarka localhost:8081, zwykłe akcje UI, lokalny `assets/icon.png` jako plik testowy:

- Po wpisaniu `[nieczytelne]` pojawia się wyróżniony niejasny fragment z odczytaną treścią, instrukcją korekty i przyciskiem pominięcia.
- Po zmianie na poprawne zdanie znika ostrzeżenie i przycisk pominięcia zmienia się na usunięcie.
- Przy jedynej nieczytelnej linii generowanie i zbiorcze pominięcie są nieaktywne; ekran wyjaśnia potrzebę dodania czytelnego tekstu.
- Po usunięciu ostatniego fragmentu wykryto brak edytora do ponownego wpisania treści. Autor naprawił błąd: przycisk „Dodaj fragment” działa również dla pustej notatki. Retest przeglądarkowy potwierdził nowy input, wpisanie zdania historycznego i aktywowanie generowania po sprawdzeniu tekstu.
- Widok istniejącej notatki demonstracyjnej pokazuje akapity z nagłówkami i źródłami przed schematem; do przeczytania nie trzeba otwierać fiszek.
- Utworzony lokalny test `TEST — historia przegląd OCR` został po zakończeniu usunięty przez UI. Nie dotykano pozostałych materiałów. Nie wysłano danych do Gemini.

## Ograniczenia

Nie wykonano rzeczywistej generacji Gemini ani testu na fizycznym iPhonie/Androidzie. Wspólny prompt jednoznacznie wymaga kontekstu, chronologii oraz przyczyn/skutków wyłącznie obecnych w źródle. To poprawa instrukcji, nie dowód semantycznej poprawności wszystkich przyszłych wyników.

Ekran odczytu renderuje wszystkie edytory. Nie przebadano wydajności 1600 linii na fizycznym telefonie. Nie stwierdzono nowej awarii wydajności na podstawie samego kodu.

## Weryfikacja automatyczna

Końcowe uruchomienie po integracji: `npm test` **157/157 PASS** (w tym 7 nowych testów przeglądu i 3 testy kompatybilnego anulowania), `npm run typecheck` **PASS**. Retest poprawki pustego edytora PASS. Node pokazuje istniejące ostrzeżenie MODULE_TYPELESS_PACKAGE_JSON; nie jest błędem testu.
