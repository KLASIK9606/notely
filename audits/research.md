# Research Notely — 9 października 2026

Przeczytano `product-direction.md` i `app-testing.md`. Poniższe sześć obserwacji łączy dokumentację dostawców, zgłoszenia upstream oraz anegdoty społeczności. Nie są one listą potwierdzonych błędów Notely. Nie użyto kluczy, płatnych modeli ani prywatnych materiałów użytkownika; nie zmieniono kodu. Dokumentacja bez podanej daty publikacji ma datę sprawdzenia 09.10.2026. Względnych dat Reddit nie przeliczano na dokładną datę, ponieważ indeks wyszukiwarki i strona zwracają różne oznaczenia czasu.

## 1. P0 — „Wybrany plik” nie oznacza „trwale zapisany materiał”

**Dowód:** Expo zaleca `copyToCacheDirectory: true`, gdy plik z pickera ma być od razu odczytywany. Cache może jednak zostać usunięty przez system przy braku miejsca; katalog dokumentów jest przeznaczony na trwalsze dane. Źródła: [DocumentPicker](https://docs.expo.dev/versions/latest/sdk/document-picker/), [FileSystem: Paths](https://docs.expo.dev/versions/latest/sdk/filesystem/#paths), sprawdzone 09.10.2026.

**Wniosek dla Notely:** zachować import przez cache, ale sukces materiału pokazywać dopiero po sprawdzonej kopii do magazynu aplikacji. Nie obiecywać odzyskania po odinstalowaniu; trwały lokalny zapis nie jest kopią zapasową. Audyt testowy już znalazł i opisał poprawkę pustych plików/HTTP failure na web — research nie powiela jej jako nowej usterki.

**Test:** import PDF i audio z iCloud/Drive oraz lokalnych Plików; odłączenie sieci po imporcie; usunięcie cache w kontrolowanym środowisku; restart aplikacji; odczyt i odsłuch oryginału. Brak miejsca musi zachować możliwość ponowienia, bez fałszywego sukcesu. Priorytet: eksport i sprawdzone przywrócenie przed synchronizacją.

## 2. P0 — Słyszalność i przerwanie wykładowcy wymagają testu sesji audio

**Dowód:** Expo opisuje konfigurację `playsInSilentMode`, oddzielną konfigurację nagrywania/odtwarzania w tle oraz zatrzymanie dźwięku po odłączeniu słuchawek/Bluetooth. Nagranie domyślnie trafia do cache. Źródło: [expo-audio](https://docs.expo.dev/versions/latest/sdk/audio/), sprawdzone 09.10.2026. To zachowanie biblioteki, nie dowód ciszy w Notely.

**Wniosek dla Notely:** po przejściu od pytania nagranego mikrofonem do odpowiedzi głosowej sprawdzać rzeczywisty stan odtwarzacza. Animacja kółka powinna odróżniać myślenie, gotową odpowiedź i odtwarzanie. Po przerwaniu odpowiedź i miejsce wykładu muszą pozostać dostępne. Brak dźwięku nie powinien wymuszać nowego zapytania do modelu.

**Test:** iPhone w trybie cichym, głośnik i Bluetooth; pytanie → stop mikrofonu → odpowiedź; odłączenie słuchawek podczas wykładu; przejście do tła i powrót. Trzy wtrącenia w jednej sesji, także podczas ładowania kolejnego klipu: żaden stary głos nie wraca, pytanie dostaje odpowiedź, wykład wraca do właściwego miejsca. Nie deklarować nagrywania w tle, jeśli aplikacja celowo kończy fragment.

## 3. P1 — Jest konkretny upstream trop zacinania przy zmianie głosu na iOS

**Dowód:** [Expo PR #50724](https://github.com/expo/expo/pull/50724), scalony 06.10.2026, naprawia blokujące odczyty AVPlayerItem na głównym wątku podczas `replace()`. W opublikowanej weryfikacji na symulatorze iOS i `expo-audio@57.0.5` 4 z 19 przełączeń wolnego URL bez rozszerzenia blokowały UI około 2,57 s; z patchem 0 z 19. [Changelog](https://github.com/expo/expo/blob/main/packages/expo-audio/CHANGELOG.md) umieszcza poprawkę w 58.0.7. Notely deklaruje `~57.0.5`: zgodność wersji zwiększa przydatność testu, ale nie potwierdza tego samego błędu w Notely.

**Dodatkowy dowód zapisu:** [PR #48002](https://github.com/expo/expo/pull/48002), scalony 24.07.2026, opublikowany 10.09.2026, naprawia nadpisywanie poprzedniego pliku na iOS po `prepareToRecordAsync()` bez opcji. Osobna trwała kopia Notely może już chronić zapisany materiał — trzeba to sprawdzić.

**Backport i różnica wobec Notely:** sprawdzony 09.10.2026 [oficjalny changelog gałęzi SDK 57](https://raw.githubusercontent.com/expo/expo/sdk-57/packages/expo-audio/CHANGELOG.md) kończy wydania na 57.0.5 (11.09.2026), ma pustą sekcję Unpublished i nie wymienia #50724 ani #48002. Nie znaleziono w tym źródle oficjalnego kompatybilnego backportu; to nie dowód, że nigdy się nie pojawi. Notely zapisuje głos jako kompletny lokalny WAV/MP3 przed `player.replace()` (`src/teacherAudio.ts`); warunki wolnego zdalnego URL z reprodukcji nie są tym samym przebiegiem. Zbieżność wersji nie dowodzi identycznej reprodukcji.

**Test/poprawka:** wykonać 20 przełączeń lokalnych klipów Notely, osobno wolnego URL w izolowanym repro; mierzyć czas braku reakcji przycisku, nie tylko przerwy między dźwiękami. Nagrać dwa różne fragmenty, ponownie odtworzyć pierwszy i porównać pliki. Nie podmieniać samej natywnej biblioteki na SDK 58 w projekcie SDK 57 bez oceny kompatybilności i nowego buildu. Expo Go nie wczyta lokalnej poprawki natywnej przez zwykłe odświeżenie JS. Nie zmieniono zależności.

## 4. P1 — Odczyt PDF/pisma trzeba oceniać względem oryginału, nie samego JSON

**Dowód:** Google zaleca właściwą orientację i unikanie rozmytych stron. Rozumienie wizualne dokumentów dotyczy PDF; inne formaty dokumentowe mogą być traktowane jako sam tekst, tracąc diagramy i układ. Źródło: [Gemini document understanding](https://ai.google.dev/gemini-api/docs/document-processing), aktualizacja 08.10.2026. Dokumentacja nie gwarantuje bezbłędnego odczytu pisma odręcznego.

**Wniosek dla Notely:** podgląd i korekta obrotu/czytelności przed AI, zachowane pochodzenie strony lub zdjęcia, łatwe poprawienie odczytu. Poprawne referencje do linii streszczenia nie wystarczają do udowodnienia zgodności z PDF. Nie ukrywać trudnego fragmentu pod płynną, pewną odpowiedzią.

**Test:** wzorce: rozmyte i obrócone pismo, polskie znaki, indeksy we wzorach, „nie”, liczby z jednostkami, tabela, wykres i slajd bez tekstu. Osoba ocenia zgodność faktów z oryginałem i kompletność stron. Błędne liczby/negacje lub dopisane fakty blokują zaliczenie przykładu; nie wystarcza przejście walidacji struktury.

## 5. P1 — Społeczność skarży się także na poprawne, ale mało użyteczne fiszki

**Anegdoty, nie pomiar:** autor [wątku o fiszkach z całego kursu](https://www.reddit.com/r/notebooklm/comments/1wgvpmw/flashcards_generated_from_a_whole_course_pack_are/) opisuje pytania o przypisy i drobiazgi zamiast istotnych pojęć. Strona pokazuje „10h ago”, indeks „3 weeks ago”; data dokładna niepotwierdzona, sprawdzono 09.10.2026. W [wątku o quizach NotebookLM](https://www.reddit.com/r/notebooklm/comments/1rhjbsw/to_the_devs_fix_notebook_lm_please/) użytkownicy zgłaszają brakujące pytania/odpowiedzi, niepełne uzasadnienia i błędne karty; strona pokazuje „7mo ago”, sprawdzono 09.10.2026. Samoopis komentującego jako pracownika produktu nie został zweryfikowany. Te wypowiedzi nie określają częstości problemu ani obecnej jakości NotebookLM.

**Wniosek dla Notely:** generować z najważniejszych pojęć konkretnej lekcji; umożliwić poprawę pojedynczej karty/pytania i naukę błędnych odpowiedzi. Zachować prosty interfejs „Umiem / Nie umiem”; nie dokładać obowiązkowej konfiguracji quizu ani wróżenia zakresu egzaminu.

**Test:** materiał z trzema celami lekcji i wieloma przypisami. Ocenić pokrycie celów, brak kart o nieistotnych detalach, jedną jednoznaczną odpowiedź quizu i wyjaśnienie wynikające ze źródła. Test liczby/kompletności jest automatyczny; trafność i prawdziwość wymagają oceny człowieka. Oceny algorytmu powtórek nie utożsamiać z pomiarem wiedzy użytkownika.

## 6. P0 — Limity są cechą projektu API, nie dowodem zbyt trudnego pytania

**Dowód:** Gemini stosuje osobne limity m.in. żądań/min, tokenów/min i żądań/dzień, liczone na projekt, nie na klucz. Modele i poziomy kont mają różne limity; Google nie gwarantuje podanej dostępnej przepustowości. Źródło: [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), aktualizacja 02.09.2026.

**Wniosek dla Notely:** rozróżniać własny limit serwera od limitu dostawcy i błędu chwilowej dostępności. Nie naprawiać quota przez nowe klucze tego samego projektu. Pytanie użytkownika ma pierwszeństwo nad przygotowywaniem kolejnego fragmentu głosu; gotowy tekst/głos należy wykorzystać ponownie. Logowanie do konta nie usuwa limitów. Nie deklarować konkretnych bezpłatnych wartości limitów wszystkim użytkownikom.

**Test:** kontrolowane odpowiedzi 429, 503, wygaśnięcie tokenu, limit serwera oraz szybkie trzy pytania. Aplikacja zachowuje materiał i miejsce rozmowy, pokazuje właściwe następne działanie, nie uruchamia kaskady retry ani nie obciąża po cichu innego konta. Liczyć żądania osobno dla odpowiedzi, transkrypcji, wyszukiwania i głosu, żeby znaleźć rzeczywiste źródło limitu.

## Najbliższa decyzja produktu

Najpierw potwierdzić zapis i odsłuch po restarcie na obu telefonach, sprawdzić upstream zacięcia i wykonać wzorcową ocenę odczytu oraz odpowiedzi. Następne niewielkie ulepszenie: poprawa konkretnej błędnej karty i powrót do błędnych pytań. Osobny podcast, dodatkowy planer i nowe integracje nie rozwiązują wymienionych problemów. Ten dokument dostarcza zadań i dowodów zewnętrznych; nie zastępuje testów urządzeniowych Notely.
