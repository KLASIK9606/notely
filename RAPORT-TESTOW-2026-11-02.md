# Testy Notely — 2 listopada 2026

## Wykonane ręcznie w działającej aplikacji webowej

| Przepływ | Wynik |
| --- | --- |
| Wybór rzeczywistego pliku TXT z sześcioma hiszpańskimi słowami i zdaniami | Import zachował wszystkie wiersze, akcenty i zdanie z dwukropkiem |
| Tłumaczenie tego pliku przez rzeczywisty serwer Render i Gemini | Zapisane 6 fiszek; zweryfikowano oryginały i polskie tłumaczenia |
| CSV z polskimi zwrotami, docelowy hiszpański, kontekst rozmowy | Dzień dobry → Buenos días; Nie mam pieniędzy. → No tengo dinero. |
| Kliknięcie tworzenia fiszek bez zgody | Czytelny komunikat przy przycisku; brak wysłania materiału |
| Gwiazdka i filtr zaznaczonych | Jedna wskazana fiszka; gwiazdka zachowana po odświeżeniu |
| Pisanie odpowiedzi | Odkrycie wzorca, samodzielna ocena, zakończenie i restart sesji działają |
| Dopasowywanie | Dwie rundy, celowy błąd, poprawienie, podsumowanie 6 par / 1 błąd i powtórka tylko błędnej pary |
| Automatyczny quiz ze słówek | Wszystkie 6 pytań, poprawne odpowiedzi i wynik 6/6 |
| Fiszki w trybie ćwiczeń | Odkrycie, ocena, zakończenie i działający przycisk ponownej sesji |
| Zapis zestawu | Zestaw i gwiazdka dostępne po ponownym załadowaniu aplikacji |
| Istniejąca notatka o fotosyntezie i mapa | Notatka otwiera się; sprawdzono przełączenie dziewięciu układów mapy |

Testy tworzą wyłącznie własne materiały `QA 02.11…`; istniejących materiałów użytkownika nie usuwano. Testowe zwroty wysłano do Gemini przez skonfigurowany serwer. Klucz API nie trafia do aplikacji ani plików testowych.

## Testy automatyczne

206 testów przechodzi. Zakres obejmuje dotychczasowe OCR, walidację dokumentów/audio, transakcje zapisu plików, anulowanie operacji, SRS, fiszki, layout długiego tekstu, mapy i nowe tryby nauki. Dla nauki dodano przypadki 300 kart, 900 nieudanych prób, duplikatów, filtrowania, odwrócenia kierunku i szybkich podwójnych kliknięć quizu.

Tłumacz sprawdzono dla kolejności i kompletności odpowiedzi, limitów 30 pozycji / 12 000 znaków na żądanie, sześciu języków docelowych w kontrakcie, kontekstu, anulowania i błędnych danych. CSV sprawdzono dla BOM, cudzysłowów, przecinków wewnątrz tekstu, pustych kolumn, UTF-8 oraz limitu rozmiaru.

TypeScript i eksport bundla Androida przeszły poprawnie. Kontrola sekretów przed commitem i pushem przeszła. Backend obsługujący języki docelowe został wdrożony na Render i sprawdzony rzeczywistym tłumaczeniem.

## Granice potwierdzenia

To nie jest gwarancja braku wszystkich błędów. Nie wykonano w tej sesji testu na fizycznym Androidzie/iPhonie, nagrywania mikrofonem i jakości odtwarzanego dźwięku. Nie sprawdzono rzeczywistego odczytu nowego zdjęcia pisma odręcznego ani całego nowego PDF przez Gemini. Ich testy automatyczne korzystają z kontrolowanych danych i odpowiedzi. Nie testowano logowania produkcyjnego — beta działa bez niego. Rzeczywistą jakość tłumaczeń sprawdzono dla dwóch kierunków na małych plikach; pozostałe języki mają sprawdzony kontrakt i wymagają osobnych prób jakościowych.
