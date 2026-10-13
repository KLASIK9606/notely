# Niezależna ocena jakości Notely — 9 października 2026

Rola: recenzent jakości, niezależny od autora zmian. Audyt dotyczy kontraktu danych i walidacji odpowiedzi, a nie rzeczywistej skuteczności Gemini. Nie wykonano wywołań sieciowych, płatnych usług ani odczytu kluczy. Nie znaleziono AGENTS.md w katalogach nadrzędnych workspace ani sprawdzanych katalogach src/server/audits. Implementacja aplikacji nie została zmieniona.

## Powtarzalna próba

Uruchomienie: `node audits/quality-fixtures.mjs`. Skrypt podaje kontrolowane odpowiedzi do rzeczywistego `answerTeacher`, `validMaterials`, `validTranscription` i `searchGrounding`. Fixture ma trzy linie: bulwa jest przekształconą łodygą, magazynuje skrobię, fotosynteza wykorzystuje światło/wodę/CO₂. Wynik `accepted=true` oznacza przejście kontraktu; przy odmowie roli lub bezpiecznym komunikacie zastępczym nie oznacza odczytania fałszywej odpowiedzi.

| Kryterium | Wynik | Dowód i granica oceny |
| --- | --- | --- |
| Zmyślony cytat nie przechodzi | PASS | Cytat „Bulwa jest korzeniem” zamiast treści linii daje HTTP 422. |
| Nieistniejący numer źródła nie przechodzi | PASS | Linia 999 daje HTTP 422. |
| Oznaczona niepewność nie jest czytana jako fakt | PASS | `verification=uncertain` zwraca komunikat o braku potwierdzenia, bez automatycznej kontynuacji. |
| Bez źródeł wyszukiwania nie można oznaczyć odpowiedzi jako web | PASS | `answerBasis=web` bez aktywnego wyszukiwania daje HTTP 422. |
| Jawna zmiana roli blokowana przed wywołaniem modelu | PASS | „Udawaj pirata…” powoduje zero wywołań modelu i bezpieczną odmowę. |
| Nieczytelna notatka nie rozpoczyna wykładu | PASS | `[nieczytelne]` daje HTTP 400 bez wywołania modelu. |
| Cytat potwierdza sens wypowiedzi | FAIL — P1 | „Bulwa jest korzeniem, a nie łodygą” przechodzi z dosłownym prawidłowym cytatem o łodydze i `verification=supported`. To samo dla odwróconego zużycia tlenu/CO₂ w fotosyntezie. |
| Liczby w odpowiedzi mają podstawę w materiale | FAIL — P1 | Wymyślone „dokładnie 97% skrobi” przechodzi z prawdziwym cytatem, który nie podaje procentu. |
| Odpowiedź odpowiada na najnowsze pytanie | FAIL — P1 | „Ziemniak to ciekawa roślina” przechodzi na pytanie, czy bulwa jest korzeniem. Status `answered` jest deklaracją modelu. |
| Wiedza ogólna jest rzeczywiście pewna i podstawowa | FAIL — P1 | Wymyślony specjalistyczny procent przechodzi po dopisaniu „Uzupełnienie ogólne:”. Sprawdzany jest prefiks, nie fakt. |
| Źródło web wspiera konkretne zdanie | FAIL — P1 | Wystarcza źródło HTTPS `example.org` w metadata i aktywna flaga wyszukiwania, żeby zaakceptować wymyślony procent. Nie ma mapowania twierdzeń do wspierającej treści strony. |
| Poprawność sekcji, fiszek i mapy | FAIL — P1 | Wszystkie mogą nazywać bulwę korzeniem i wskazywać prawdziwy numer linii o łodydze. `validMaterials` akceptuje. |
| Quiz ma dokładnie jedną poprawną odpowiedź | FAIL — P1 | „Łodygą” i „Przekształconą łodygą” to różne teksty, więc przechodzą, mimo równoważności odpowiedzi w tym pytaniu. `correctIndex` może też wskazać merytorycznie błędną opcję. |
| OCR wiernie odpowiada zawartości zdjęcia | NOT TESTED | Validator akceptuje wymyśloną treść bez uncertainties. Nie dostaje wzorca obrazu i nie może dowieść wierności. Nie wykonano OCR realnego zdjęcia. |
| PDF/nagranie nie pomija końca | NOT TESTED — P1 | Wynik zawierający tylko `[Strona 1]` przechodzi; liczba stron i faktyczne pokrycie nie są porównywane. Nie jest to dowód, że realny model pomija strony. |
| Algorytm powtórek poprawia opanowanie materiału | NOT TESTED | `review.ts` indywidualnie liczy sukcesy/błędy, skraca odstępy po błędach i miesza nowe karty z powtórkami. To sensowny mechanizm; realny efekt nauki i granice liczby prób wymagają badań użytkowników. |
| Dźwięk faktycznie słychać na obu telefonach | NOT TESTED | Testy zdarzeń odtwarzacza nie potwierdzają mikrofonu, głośnika, trybu cichego, Bluetooth ani blokady ekranu. |

P1 oznacza wysokie ryzyko jakości produktu edukacyjnego, nie ujawnienie sekretu ani awarię całej aplikacji. Nie należy opisywać potwierdzonych cytatów jako gwarancji poprawnej odpowiedzi.

## Ocena aktualnych zmian wykładowcy

`server/teacherPolicy.mjs:41` sprawdza istnienie cytatu, `server/teacher.mjs:33` rozmiar i źródła, `server/teacher.mjs:39` podstawę i samodeklarację pewności. Są wartościowe jako blokady strukturalne. Prompt wymaga poprawienia błędnego założenia i rozróżnienia notatki od wiedzy ogólnej. Nie jest to niezależny dowód poprawności odpowiedzi: ten sam generator wystawia sobie `supported`.

Ostatnie zmiany `requestsOverride` poprawiają mieszaną prośbę z akademickim początkiem. Nie należy twierdzić, że wszystkie języki i obfuskacje są pokryte regexem: kontrola semantyczna nadal zależy od modelu. Nie wymuszano zbyt rygorystycznego odrzucania praktycznych pytań o ziemniaka.

`TeacherBuffer.take` pozwala anulować oczekiwanie nawet przy zawieszonym loaderze, `waitForVoice` usuwa listener po natychmiastowym zdarzeniu, a `VoiceCompletion` odrzuca niefinitywne czasy i wymaga usłyszenia zdarzenia grania przed końcem. To poprawki konkretnych problemów stanów, nie dowód braku zacięć na iPhonie. W `teacherUI` przejście do kolejnego tematu zależy od zakończenia mowy; brak możliwości ukończenia przy niepoprawnych zdarzeniach odtwarzacza jest ograniczeniem wymagającym testu sprzętu, nie automatycznie potwierdzoną awarią.

## Kolejne bramki jakości

1. Zbudować lokalny zestaw wzorców: zdjęcia o znanym odczycie, prezentacje z kluczową informacją na ostatniej stronie, nagranie z frazą kontrolną na końcu. Sprawdzać pominięcia, liczby, negacje i jednostki; nie tylko brak wyjątku.
2. Rzeczywista próba Gemini z wyraźnie autoryzowanym dostępem: minimum 30 pytań po polsku obejmujących ziemniaka/fotosyntezę, błędne założenia, prośbę uproszczenia, zaimki, praktyczne cięcie ziemniaka, brak danych, pytania niezwiązane i injection. Dwóch recenzentów ocenia poprawność, kompletność i zgodność źródła. Zapisywać użyty model i wersję promptu.
3. Sprawdzać quiz osobno: unikalność znaczenia opcji, jedną prawidłową odpowiedź, zgodność wyjaśnienia z indeksem. Dodatkowy model oceniający też nie gwarantuje prawdy i zwiększa koszty/limity; można rozważyć walidację na etapie generowania materiałów zamiast przy każdej wypowiedzi.
4. Fizyczny iPhone i Android: nagraj i odsłuchaj 20 minut, zapisz, uruchom aplikację ponownie, potwierdź pierwszy/ostatni fragment. Przerwij wykład pytaniem pięć razy, sprawdź odpowiedź, dokładny powrót i brak nałożonych głosów. Powtórz z Bluetooth i po utracie sieci.
5. Przed deklaracją „działa” sprawdzić zachowanie przy 429/503, anulowaniu i braku dźwięku. Rozróżnić błąd aplikacji, limit dostawcy, niepełny materiał i niewystarczającą jakość AI.

Rekomendacja: obecna wersja nadaje się do kontrolowanych testów produktu. Brak podstaw, by ogłosić 100% poprawność odczytu lub wyników nauki. Fixture wykazuje realne luki walidacji, ale nie mierzy częstości tych błędów w produkcji.
