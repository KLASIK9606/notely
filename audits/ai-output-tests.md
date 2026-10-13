# Niezależny audyt odczytu AI i wygenerowanych materiałów

Data: 12 października 2026. Tryb: kontrolowane odpowiedzi modelu, bez połączeń z dostawcami i bez używania kluczy użytkownika. Raport nie potwierdza realnej jakości OCR Gemini ani prawdziwości jego opracowań.

## Reprodukcja

W katalogu projektu uruchom:

```powershell
node audits/fixtures/ai/output-checks.mjs
```

Harness zapisuje szczegółowe wyniki do `audits/fixtures/ai/results.json`. Kod wyjścia 0 oznacza zakończenie audytu; stany FAIL znajdują się jawnie w wynikach i nie są liczone jako zaliczone testy aplikacji. Nie zmieniono produkcyjnego kodu ani wspólnych testów.

## Wyniki bazowe

**Po zmianach adaptacyjnych: 16 PASS, 6 FAIL, 1 NOT TESTED.** Bazowy przebieg przed zmianą miał 12 PASS, 6 FAIL, 1 NOT TESTED.

Dodatkowo istniejące testy odczytu, łączenia partii i kontroli niepewności: **22/22 PASS** (`server/ocrRead.test.mjs`, `src/transcriptionReview.integration.test.mjs`, `src/materialPipeline.test.mjs`, `src/ocrPipeline.test.mjs`). Są to testy mechaniki z kontrolowanym modelem, a nie niezależna ocena Gemini.

| Obszar | Stan | Potwierdzenie |
|---|---|---|
| Poprawny kontrolowany wynik historii | PASS | Kompletny format, istniejące źródła, akapit z datą, przyczyną i następstwami przechodzi walidację. |
| Nieistniejące i puste linie źródła | PASS | Walidator odrzuca odwołanie 999 oraz odwołanie do pustej linii. |
| Identyczne opcje quizu | PASS | Dokładny duplikat tekstu jest odrzucany. |
| Ponowienie pustego OCR zdjęcia | PASS | Pusty pierwszy wynik prowadzi do jednej dodatkowej próby; poprawny drugi wynik zachowuje tekst. |
| Dwie puste odpowiedzi OCR | PASS | Dokładnie dwie próby kończą się uczciwym błędem 422. |
| Przekroczenie kwoty dostawcy | PASS | Błąd 429 jest przekazany bez dodatkowego płatnego ponowienia w readOcr. |
| Nieprawidłowy numer niepewności | PASS | Tekst zostaje zachowany; wszystkie niepuste linie są oznaczane do sprawdzenia. |
| Korekta i pominięcie niepewnego tekstu | PASS | Korekta usuwa tylko odpowiednie ostrzeżenie; skip nie wysyła usuniętej linii do generowania. |
| Osiem odczytów po 200 linii | PASS | Wszystkie 1600 linii są wysyłane; odwołanie ostatniej partii jest remapowane do linii 1600. To nie jest próba ośmiu rzeczywistych zdjęć. |
| Awaria późniejszej partii | PASS | Błąd drugiej partii nie daje pozornie kompletnego wyniku. |
| Rzeczywiste pismo odręczne/PDF odczytane Gemini | NOT TESTED | Lokalna konfiguracja serwera nie zawiera klucza dostawcy AI. Nie użyto zapisanych danych innych kont ani sesji przeglądarki. |

## Wykryte luki jakości — FAIL

Wszystkie przypadki poniżej to celowo błędne wyniki kontrolowane. Nie dowodzą, że Gemini je wygenerowało, ani nie określają częstości takich błędów.

1. **Zła data:** źródło mówi „22 stycznia 1863”, sekcja zmienia ją na „22 stycznia 1864”. `validMaterials` zwraca true.
2. **Wymyślona liczba:** dopisanie „123456 osób” bez takiej informacji w źródle przechodzi walidację.
3. **Niewłaściwe poparcie:** fiszka z datą wskazuje istniejącą linię wyłącznie o represjach. Legalny numer nie oznacza poparcia odpowiedzi.
4. **Dwie poprawne opcje quizu:** „Partyzancki” i „Walki partyzanckie” są różnymi ciągami znaków, więc walidator dopuszcza obie przy jednym correctIndex.
5. **Pominięcie końca:** opracowanie nie uwzględnia ważnego końcowego faktu, a żadna kontrola pokrycia nie ostrzega użytkownika.
6. **Pusta wartość merytoryczna:** sekcja „To ważny temat. Warto się go nauczyć.” przechodzi z legalnymi odwołaniami, choć nie uczy tematu.

Wniosek: format i numery źródeł są kontrolowane, ale zgodność semantyczna, kompletność i użyteczność notatek pozostają przede wszystkim zadaniem modelu oraz użytkownika. Nie należy przedstawiać prawidłowego sourceLines jako gwarancji prawdziwości.

## Zalecana dalsza walidacja

- Rzeczywisty zestaw co najmniej jednej strony odręcznej, wielostronicowego PDF, tabeli biologicznej i osi wydarzeń historycznych; ocena względem ręcznie sprawdzonej treści, nie samego schematu JSON.
- Ocena: daty/liczby/jednostki, końcowe strony, korelacja źródeł z twierdzeniami, kontekst, dwuznaczne odpowiedzi oraz brak dopisanej wiedzy.
- Oznaczenie niepełnego pokrycia i możliwość poprawienia konkretnej sekcji bez nadpisywania materiałów użytkownika.
- Nie wprowadzać na tej podstawie bezwarunkowego dodatkowego wywołania AI dla każdego opracowania: trzeba zmierzyć koszt, limit, opóźnienie i skuteczność kontroli.

## Zmiana adaptacyjnych notatek

Po udostępnieniu implementacji ponownie uruchomiono cały harness, dodając cztery kontrole:

- **PASS:** krótka poprawna notatka z pustymi fiszkami, quizem i gałęziami mapy jest akceptowana. Użytkownik nie musi dostać sztucznych pomocy dla zbyt krótkiego źródła.
- **PASS:** puste sections nadal są odrzucane.
- **PASS:** obecna fiszka, quiz lub gałąź bez źródła nadal są odrzucane.
- **PASS:** 31 elementów każdej grupy nadal przekracza limit jednego wyniku modelu.

Ręczny przegląd nowego promptu potwierdził: układ zależny od faktycznej treści, możliwość mieszania tematów, zmienną liczbę gałęzi/dzieci, pełniejsze opracowanie długiego źródła, brak dopisywania interpretacji/dat/przyczyn oraz wewnętrzną kontrolę faktów i jednej poprawnej opcji quizu. To instrukcje do modelu, nie niezależny walidator: sześć wcześniej opisanych luk semantycznych pozostaje **FAIL**. Zmiana promptu sama nie potwierdza lepszej odpowiedzi realnego modelu.
