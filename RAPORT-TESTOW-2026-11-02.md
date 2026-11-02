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

217 testów przechodzi po uzupełniających poprawkach OCR. Zakres obejmuje dotychczasowe OCR, walidację dokumentów/audio, transakcje zapisu plików, anulowanie operacji, SRS, fiszki, layout długiego tekstu, mapy i nowe tryby nauki. Dla nauki dodano przypadki 300 kart, 900 nieudanych prób, duplikatów, filtrowania, odwrócenia kierunku i szybkich podwójnych kliknięć quizu.

Tłumacz sprawdzono dla kolejności i kompletności odpowiedzi, limitów 30 pozycji / 12 000 znaków na żądanie, sześciu języków docelowych w kontrakcie, kontekstu, anulowania i błędnych danych. CSV sprawdzono dla BOM, cudzysłowów, przecinków wewnątrz tekstu, pustych kolumn, UTF-8 oraz limitu rozmiaru.

TypeScript i eksport bundla Androida przeszły poprawnie. Kontrola sekretów przed commitem i pushem przeszła. Backend obsługujący języki docelowe został wdrożony na Render i sprawdzony rzeczywistym tłumaczeniem.

## Granice potwierdzenia

To nie jest gwarancja braku wszystkich błędów. Nie wykonano w tej sesji testu na fizycznym Androidzie/iPhonie, nagrywania mikrofonem i jakości odtwarzanego dźwięku. W kolejnej sesji sprawdzono prawdziwe wywołania Gemini dla własnych obrazów i dwustronicowego PDF (poniżej). Obraz stylizowany na pismo odręczne jest syntetycznym fontem, nie zdjęciem prawdziwego zeszytu. Nie testowano logowania produkcyjnego — beta działa bez niego. Rzeczywistą jakość tłumaczeń sprawdzono dla dwóch kierunków na małych plikach; pozostałe języki mają sprawdzony kontrakt i wymagają osobnych prób jakościowych.

## Uzupełnienie: rzeczywisty OCR i generowanie materiałów

- Obraz drukowany po polsku: 5/5 linii zgodnych znak w znak ze źródłem.
- Obraz z fontem Segoe Print: 5/5 linii zgodnych znak w znak. To próbka syntetyczna; wynik nie dowodzi skuteczności dla prawdziwego rękopisu.
- Własny dwustronicowy PDF: opracowanie obejmuje strony 1 i 2, budowę bulwy i doświadczenie. Zachowano 12,5 g / 21 °C, 7 g / 18 °C, brak soli w próbie B oraz różnicę 5,5 g.
- Pusta kartka: HTTP 422, bez zmyślonego odczytu.
- W aplikacji wybrano ten PDF przez okno plików, odczytano go, porównano ze źródłem i wygenerowano notatkę, 3 fiszki, mapę porównawczą oraz 2 pytania quizu. Quiz potwierdzono wynikiem 2/2, w tym poprawną odpowiedzią 5,5 g.
- Nieczytelne znaczniki bez metadanych dostają ostrzeżenia; sam nieczytelny tekst nie przechodzi jako poprawny odczyt. Niejasna treść nie trafia do generowania materiałów przed sprawdzeniem.
- Usunięto ciche tracenie ostrzeżeń w pipeline materiałów, poprawiono odwołania do pustych linii i kontrolę zduplikowanych odpowiedzi quizu.

Źródła kontrolne: tests/fixtures/ocr/expected.json oraz własne obrazy/PDF wygenerowane przez scripts/create-ocr-fixtures.py. Wyniki rzeczywistych wywołań zachowano lokalnie w ignorowanym dist/ocr-live-results.json, a podgląd wygenerowanej notatki w dist/qa-ocr-generated-note.png. Skrypt scripts/verify-ocr-live.mjs wykonuje rzeczywiste wywołania skonfigurowanego API, więc może zużywać jego limit. Nie jest częścią zwykłego npm test.
