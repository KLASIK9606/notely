# Adaptacyjne opracowanie i drzewo myśli — 12.10.2026

## Wdrożone

- Wspólny prompt chmury i modelu lokalnego rozpoznaje rodzaj treści ze źródła, zamiast wymuszać ten sam układ rozdziałów. Historia może użyć chronologii, biologia budowy i procesów, matematyka metody oraz źródłowego przykładu, literatura wydarzeń i interpretacji obecnej w materiale. Kategorie nie są obowiązkowe.
- Długość opracowania odpowiada ilości istotnej treści. Nie ma sztywnego minimum ani docelowej liczby sekcji czy gałęzi. Limit 30 elementów w grupie pozostał zabezpieczeniem, nie celem.
- Notatka ogólna zachowuje pełne akapity oraz kontekst. Mapa grupuje spójne wątki i kolejność; szczegóły mogą być pełnymi zdaniami. Nie wymagamy jednakowej liczby podpunktów ani sztucznych kategorii.
- Puste fiszki, quiz i gałęzie mapy są dozwolone, gdy źródło nie uzasadnia ich stworzenia. Notatka ogólna i nazwa tematu pozostają obowiązkowe. Sprawdzanie istniejących elementów i odwołań do źródła zachowano.
- Drzewo w notatce rozwija szczegóły bezpośrednio pod wybranym wątkiem. Pierwszy wątek jest otwarty; na telefonie i przy powiększonej czcionce elementy zajmują całą szerokość. Tekst nie ma ograniczenia liczby wierszy. Osobna mapa ma komunikat dla braku gałęzi i nie wymusza minimalnej szerokości 260 px.
- W tym samym wywołaniu AI prompt wymaga sprawdzenia dat/liczb/nazw/wzorów, zgodności odwołań, ujęcia końca materiału i jednej rzeczywiście poprawnej opcji quizu.

## Weryfikacja i ograniczenia

- TypeScript: PASS.
- Kontrolowane testy serwera i przetwarzania materiałów: 14/14 PASS.
- Niezależny tester `ai_output_tests` otrzymał kontrakt pustych pomocy do regresji; pełny wynik jest w jego raporcie.
- Prompt nie jest dowodem poprawności merytorycznej. Dotychczasowy walidator sprawdza strukturę i odwołania, nie prawdziwość dowolnego zdania. Kontrolowane błędne wyniki mogą przejść tę walidację; test na rzeczywistym Gemini pozostaje konieczny.
- Nie dodano dodatkowego automatycznego wywołania AI. Cloud ma 10 000 tokenów odpowiedzi; Gemini ma istniejącą naprawę potwierdzonego MAX_TOKENS do 20 000. Partie źródła mają do 60 000 znaków/200 linii; nie obcinamy źródła. Obszerny materiał nadal może wymagać kilku partii i dłuższego czasu.
- Lokalny model ma limit 6500 znaków wejścia i 2000 tokenów wyjścia. Prompt priorytetyzuje notatkę/mapę oraz ogranicza powtarzanie; nie gwarantujemy pełnego opracowania bardzo długiego źródła w tym budżecie.
- Już zapisane notatki nie są automatycznie przegenerowywane. Nowy sposób generacji dotyczy nowego opracowania; układ drzewa działa także na istniejących materiałach.

## Pliki

`server/studyNotePrompt.mjs`, `server/schema.mjs`, `src/studyNote.tsx`, `src/study.tsx`.
