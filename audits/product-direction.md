# Kierunek produktu Notely — 9 października 2026

## Cel i granice oceny

Notely ma pomagać przejść od własnego materiału do rozumienia i pamiętania: **dodaj → sprawdź → ucz się → wróć do trudnych zagadnień**. Sukcesem jest poprawna odpowiedź ucznia po czasie, a nie liczba wygenerowanych ekranów.

Ocena opiera się na kodzie i dokumentacji, nie na odsłuchu prawdziwego AI ani fizycznym telefonie. Przejrzano App.tsx, src/lessonUI.tsx, src/materialCard.tsx, src/studyNote.tsx, src/flashcards.tsx, src/review.ts, src/quiz.tsx, src/teacherUI.tsx, src/aiSettingsUI.tsx, src/googleAIUI.tsx, src/accountUI.tsx i README.md. Nie znaleziono AGENTS.md dla aplikacji; pliki w node_modules dotyczą zależności i nie są instrukcjami projektu. Nie zmieniono kodu aplikacji.

## Co zachować

- Jedną bibliotekę „Moje materiały”, jeden główny przycisk dodawania, opcjonalny tytuł i widoczne oznaczenie niedokończonych materiałów.
- Oryginały zdjęć/PDF/nagrań przy notatce, zapis bez AI i poprawienie odczytu przed nauką.
- Fiszki z dwoma dużymi przyciskami „Umiem / Nie umiem”, cofnięciem oceny i osobną historią każdej karty. Nie zastępować ich skalą ocen.
- Quiz z dużymi odpowiedziami, wyjaśnieniem i przyciskiem następnego pytania u góry.
- Wykładowcę uruchamianego osobno, automatyczne przechodzenie tematów, żywe kółko i jedno wyraźne działanie „Zadaj pytanie”.
- Prywatny kod. Pokazywać rzeczywisty status połączeń: Google do Gemini API nie oznacza abonamentu Gemini, ChatGPT przez konto czeka na dostęp partnerski, Claude obecnie przez API.

## Pięć priorytetów

### 1. P0 — Pewność zachowania materiału i odzyskiwania pracy

**Dlaczego:** problemy z zapisem i dźwiękiem uderzają w główny powód korzystania z aplikacji. Kod sygnalizuje błędy zapisu, zachowuje pliki lokalnie i izoluje biblioteki kont, ale użytkownik musi rozumieć różnicę między plikiem zapisanym a opracowaniem gotowym. Wejście na inne konto może wyglądać jak utrata notatek, mimo poprawnej izolacji danych.

**Zmienić / dodać:** jeden czytelny stan materiału: „Pliki zapisane”, „Sprawdź odczyt”, „Gotowe do nauki”. Opracowanie po błędzie lub limicie wznawiać od ostatniego ukończonego etapu, bez ponownego wybierania plików. Przy logowaniu powiedzieć, że materiały gościa pozostają w bibliotece gościa; przenoszenie może być późniejszą, świadomą akcją. Dodać lokalny eksport i sprawdzone przywracanie materiału z jego oryginałami i postępem, zanim obiecamy synchronizację.

**Usunąć:** komunikaty sukcesu przed trwałym zapisem i niejasne „AI nie przetworzyła”, jeśli znana jest konkretna przyczyna i dostępne następne działanie. To wymaganie audytowe, nie stwierdzenie, że każdy obecny zapis robi ten błąd.

**Kryterium sukcesu:** na iPhonie i Androidzie zdjęcie, PDF i nagranie dają się otworzyć/odsłuchać po zamknięciu i ponownym uruchomieniu; anulowanie odczytu i 429/503 zachowują pliki oraz ukończony etap. Eksport → przywrócenie zachowuje liczbę plików, treść i terminy fiszek. Przełączenie kont nie ujawnia cudzych danych, a tester potrafi wrócić do materiałów gościa.

### 2. P0 — Pierwsza działająca nauka bez zgadywania konfiguracji AI

**Dlaczego:** obecna ścieżka chmurowa wymaga serwera i konfiguracji, Google dodatkowo projektu Cloud oraz ponownego połączenia po około 55 minutach. Tryb lokalny wymaga osobnego buildu i około 1,55 GB. „Moje konto Google” jest wartościowe, ale dziś nie spełnia obietnicy „loguję się i od razu uczę”.

**Zmienić / dodać:** pokazywać gotowość dla wybranego materiału i urządzenia, np. „Zdjęcia: gotowe”, „PDF: potrzebne połączenie”, „Nagranie: zapis i odsłuch dostępne”. Jedno działanie prowadzące do brakującego kroku. Na Expo Go nie wybierać nieobsługiwanej funkcji jako pozornie gotowej. Demo ma prowadzić do pierwszej fiszki lub quizu bez konfiguracji. Ustawienia serwera traktować jako zaawansowane po przygotowaniu rzeczywistej obsługi po stronie Notely; samo schowanie wymaganych pól nie rozwiąże bariery.

**Usunąć:** sugestię, że logowanie do Notely automatycznie daje dostęp do AI, martwe przyciski logowania do niedostępnych integracji i obietnicę darmowego przetwarzania bez rzeczywistego pomiaru kosztów/jakości.

**Kryterium sukcesu:** pięciu nowych testerów samodzielnie uruchamia naukę z demo w mniej niż minutę. Po dodaniu własnego materiału każdy widzi, czy AI jest gotowe, i zna jeden następny krok. Wygaśnięcie Google nie usuwa pracy ani nie przełącza po cichu konta finansującego żądanie.

### 3. P1 — Rzetelny wynik z przejściem do prawdziwego źródła

**Dlaczego:** odwołania w typie Evidence zawierają numery linii odczytu. Okno „Sprawdź źródło” pokazuje te linie, nie konkretną stronę oryginału. Dla PDF są to już notatki własnymi słowami. Sam poprawny numer linii nie potwierdza poprawności twierdzenia.

**Zmienić / dodać:** zachować pochodzenie linii: plik + strona PDF lub zdjęcie, a przy audio także zakres czasu, gdy transkrypcja go dostarcza. Rozdzielić „z materiału” i „uzupełnienie ogólne / internet”. Dodać lekkie „Zgłoś błąd” przy odpowiedzi oraz korektę konkretnej karty/pytania bez ponownego generowania wszystkiego. Poprawione źródło powinno oznaczać zależne materiały jako wymagające odświeżenia, z ochroną postępu niezmienionych kart.

**Usunąć:** traktowanie zgody „sprawdziłem treść” lub walidacji JSON jako potwierdzenia wiedzy. Nie wymuszać dodatkowych ilustracji, jeśli nie objaśniają konkretnego pojęcia i nie pochodzą z wiarygodnego materiału.

**Kryterium sukcesu:** dla zestawu 20 materiałów referencyjnych obejmujących pismo odręczne, PDF i nagrania wszystkie liczby, jednostki, negacje oraz kluczowe zależności w opracowaniu są poprawne albo wyraźnie oznaczone jako niepewne; każde sprawdzane odwołanie pozwala znaleźć odpowiadający fragment oryginału. Fiszki pytają o jeden konkretny fakt, quiz ma jedną jednoznaczną poprawną odpowiedź. Niespełnienie kryterium blokuje uznanie danego przykładu za poprawny.

### 4. P1 — Wykładowca odpowiada i wraca, a nie tylko mówi

**Dlaczego:** żywe kółko i naturalny głos są mocną stroną. Wartość zależy jednak od poprawnej odpowiedzi na wtrącenie, słyszalnego dźwięku i zachowania miejsca w wykładzie. Animacja nie potwierdza ani wyszukiwania, ani odtwarzania dźwięku.

**Zmienić / dodać:** testować pojedynczy przebieg „słucham → przerywam → pytam → słyszę odpowiedź → wracam”. Dopuszczać pytania praktyczne i wyjaśniające związane z tematem (np. czym ciąć ziemniaka), poprawiać błędne założenie i prosić o doprecyzowanie, gdy potrzeba. Odrzucać zmianę roli i niezwiązane tematy bez długiego moralizowania. Przy problemie głosu dać odsłuch tej samej gotowej odpowiedzi lub jej tekst, bez niepotrzebnej nowej generacji odpowiedzi. Szybkie pytanie ma pierwszeństwo nad przygotowywaniem kolejnego tematu.

**Usunąć:** dodatkowe ręczne przechodzenie tematów, obowiązkowe wybieranie trybu rozmowy i humor dodawany mechanicznie do każdej wypowiedzi. Podcast nie powinien być kolejną osobną funkcją przed stabilnym wykładowcą.

**Kryterium sukcesu:** scenariusz 10 minut z co najmniej trzema pytaniami przechodzi na obu telefonach: żadnego zagubionego pytania, nakładających się głosów lub pominiętego fragmentu; po odpowiedzi wraca prawidłowe miejsce. Pytania „czym ciąć?”, „dlaczego to nie korzeń?” i krótkie doprecyzowanie otrzymują właściwą reakcję, a „udawaj pirata” i samochody nie zmieniają tematu. P95 przerwy między gotowymi fragmentami poniżej 1 sekundy na ustalonym urządzeniu/sieci jest celem pomiaru, nie gwarancją każdej sieci i API.

### 5. P1 — Powrót do słabych punktów bez nowego planera

**Dlaczego:** biblioteka już pokazuje „Do powtórki”, a algorytm przeplata powtórki z nowymi kartami. isDue zalicza również karty nowe, dlatego jeden licznik może sugerować zaległość tam, gdzie są tylko nowe pytania. Quiz obecnie nie zapisuje historii między sesjami.

**Zmienić / dodać:** na istniejącej karcie materiału rozróżnić krótko „powtórki na teraz” i „nowe”, z bezpośrednim wejściem do sesji. Po quizie umożliwić ćwiczenie samych błędnych pytań i wznowienie nieukończonego quizu. Można pokazać niewielkie podsumowanie trudnych zagadnień wewnątrz materiału. Nie zmieniać automatycznie oceny fiszki na podstawie zgadnięcia odpowiedzi w quizie; samoocena i wynik quizu to różne dowody.

**Usunąć:** nową sekcję „plan nauki”, ogólny procent opanowania materiału wyliczony tylko z kliknięć „Umiem” i rozbudowane statystyki na ekranie pojedynczej fiszki. Szczegółowa historia może być opcjonalna.

**Kryterium sukcesu:** użytkownik zaczyna zaległe powtórki z biblioteki jednym działaniem; karta wielokrotnie oznaczana „Nie umiem” wraca częściej od utrwalonej. Ponowne uruchomienie zachowuje terminy i niedokończony quiz. Oznaczenie nowych kart nie sugeruje, że użytkownik jest spóźniony. Po sesji wiadomo, kiedy wrócić, bez obowiązkowego harmonogramu.

## Decyzja o nowych funkcjach

Teraz nie dodawać osobnego podcastu, sieci społecznościowej, grywalizacji ani rozbudowanego planera. Najpierw doprowadzić główną ścieżkę i wykładowcę do powtarzalnego działania na obu telefonach. Późniejszy podcast może być zapisanym odsłuchem gotowego wykładu, jeśli użytkownicy potwierdzą potrzebę słuchania bez aktywnej rozmowy. Synchronizacja jest wartościowa, ale wymaga świadomego projektu własności danych, kosztu i odzyskiwania; obecnych kont nie nazywać synchronizacją.

## Co koordynator może zrobić od razu

Najmniejsza zmiana produktu, która nie wymaga nowej usługi: rozróżnić na karcie materiału nowe fiszki od rzeczywistych powtórek i dodać wejście w powtórki bez otwierania całej notatki. Pozostałe priorytety wymagają scenariuszy testowych i danych z telefonu; sam przegląd kodu nie potwierdza ich ukończenia.
