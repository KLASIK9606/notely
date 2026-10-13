# Audyt testowania Notely — 9 października 2026

Zakres: istniejące testy, TypeScript oraz przegląd przepływów nagrywania, plików, OCR i pytań wykładowcy. Nie wykonano połączeń z płatnym modelem, nie użyto rzeczywistych kluczy i nie przejęto przeglądarki użytkownika. Nie testowano fizycznego iPhone'a ani Androida.

## Dowody automatyczne

- Bazowo `npm test`: 113/113, zero failures/skipped.
- Bazowo i po zmianach `npm run typecheck`: kod zakończenia 0.
- Po włączeniu nowych regresji i równoległych zmianach wykładowcy: `npm test`: 122/122, zero failures/skipped.
- Dodano `src/sourceStorage.test.mjs`: 4 testy realnego modułu storage z podstawionymi fetch, IndexedDB, Platform i URL. Potwierdzają odrzucenie HTTP failure i pustego pliku, oczekiwanie na commit transakcji oraz brak URL po abort.
- Istniejąca suite sprawdza sygnatury/limity audio, żądania transkrypcji, brak cichej zmiany dostawcy, kompletność scalania źródeł, anulowanie OCR/pickera, błędne referencje do źródeł, pliki o niepełnej kopii i ustawienia audio przed odsłuchem. Adaptery modeli i sprzęt audio są mockowane.

## Znalezione usterki i status

### P1/P2 — brak możliwości ponowienia zatrzymania nagrania

Przed poprawką `LectureRecorder.stop()` wyzerowywał `started.current` przed `await recorder.stop()`. Odrzucenie Promise zatrzymania prowadziło do zniknięcia aktywnego interfejsu/blokady; `pendingUri` pozostawało puste i przycisk ponownego zapisu nie powstawał. Odtworzenie z adapterem odrzucającym `stop()`; fizyczny scenariusz to błąd sesji mikrofonu/systemu, którego nie odtworzono tutaj.

Koordynator poprawił `src/audioUI.tsx`: flaga kończy nagrywanie po sukcesie stop, blokada pozostaje po błędzie, pojawia się możliwość ponownego zatrzymania. Typecheck przechodzi. Wymagany test urządzeniowy opisany poniżej; aktualna suite nie montuje komponentu Recorder.

### P2 — fałszywy sukces zapisu pustego pliku lub strony błędu na web

`saveWebSource` nie sprawdzało `response.ok` ani zerowej wielkości Blob; HTTP 404 z treścią błędu mógł zostać zapisany jako audio/PDF. Koordynator poprawił implementację. Cztery regresje potwierdzają zachowanie po naprawie.

### P2 — zmiana sesji podczas nagrywania: ryzyko do sprawdzenia

Zwykły przycisk konta jest prawidłowo blokowany podczas nagrania/oczekującego zapisu. Zewnętrzny `SIGNED_OUT` w `AccountBoundary` zmienia owner i remountuje AppContent niezależnie od tej blokady. Recorder ma cleanup flagi `alive`, ale nie posiada osobnej trwałej kolejki nagrań oczekujących na zapis. Nagranie w pamięci komponentu może utracić ścieżkę odzyskania po takim remouncie. To ustalenie z analizy kodu, nie dowód odtworzenia na telefonie. Zalecana finalizacja lub trwały pending per owner przed zmianą sesji, bez przenoszenia materiału do obcego konta.

### P2 — krótki klip wykładowcy: ryzyko zablokowania kolejnego tematu

`VoiceCompletion` wymaga uprzedniego statusu `playing=true`, a potem końca. Klip krótszy niż okres statusów może dać tylko status końca; stan nie zostanie ukończony. Przekazano właścicielowi ai_teacher do oceny. Należy zachować ochronę przed spóźnionym końcem poprzedniego pliku, nie usuwać jej bez identyfikacji aktualnego źródła.

## Granice oceny jakości

Testy adapterów i JSON sprawdzają strukturę, referencje i obsługę błędów. Nie dowodzą, że model rzeczywiście dobrze odczytał odręczne pismo/PDF, nie pominął slajdu lub podał prawdziwą odpowiedź. `validMaterials` sprawdza istnienie źródła, ale nie to, czy odpowiedź logicznie wynika z cytowanej linii. Potrzebne materiały wzorcowe z oczekiwanym odczytem i ocena odpowiedzi przez człowieka.

## Konkretna następna próba na obu telefonach

1. Nagrać 30 sekund wyraźnego głosu, zatrzymać, odtworzyć w trybie cichym i z normalną głośnością; zamknąć aplikację i odtworzyć ponownie. Sprawdzić słyszalny początek oraz koniec.
2. Powtórzyć z przejściem do tła; upewnić się, że zapis jest widoczny i odsłuch ma dźwięk. To nie test nagrywania w tle — app deklaruje zakończenie fragmentu.
3. Wywołać kontrolowany błąd zapisu/brak miejsca, ponowić; nagranie ma zachować URI, blokować wyjście i nie powielać pliku. Osobno zasymulować błąd `recorder.stop()` i ponowić zatrzymanie.
4. Testować import: zdjęcie pisma, obrócony PDF z kilkoma slajdami, audio; anulować picker oraz OCR podczas kolejnego pliku. Nie może pojawić się pełna notatka z niepełnego zbioru.
5. W lekcji o ziemniaku: „czym najlepiej ciąć ziemniaka?”, „dlaczego?”, „wyjaśnij prościej”, bardziej złożone pytanie o budowę bulwy. Odpowiedź ma odpowiadać na pytanie i potem wrócić do wykładu. Osobno sprawdzić odmowę zmiany roli i pytania o samochód.
6. Przerwać wykładowcę podczas dźwięku, podczas myślenia i tuż przed zmianą tematu; spóźniona odpowiedź ani dźwięk nie mogą nadpisać nowej tury. Powtórzyć przy krótkiej odpowiedzi.
7. Testować utratę sieci, 429 i 503 bez nieskończonych retry. Sprawdzić, czy limity od dostawcy są odróżniane od lokalnego limitu serwera (10 żądań/minutę/IP obejmuje wszystkie endpointy).

Do wykonania tych prób potrzebny jest fizyczny telefon i testowy dostęp użytkownika do modelu. Ich niewykonanie jest otwartym ograniczeniem, nie potwierdzeniem poprawności.
