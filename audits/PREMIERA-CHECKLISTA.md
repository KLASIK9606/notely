# Notely — lista testów przed publikacją

Wszystkie pola pozostają nieodhaczone: wcześniejszy test automatyczny nie zastępuje sprawdzenia aktualnej wersji na telefonie. Dla każdego testu zapisz telefon, wersję aplikacji, wynik, datę i dowód. Wyniki: OK / BŁĄD / NIE SPRAWDZONO / NIE DOTYCZY z powodem.

P0 oznacza warunek dopuszczenia do publikacji. P1 oznacza ważną jakość i wygodę. NIE SPRAWDZONO nie jest zaliczeniem. Testuj osobno Androida i iPhone'a, także na zainstalowanej wersji przeznaczonej do wydania, a nie tylko w Expo Go.

## Co nadal wymaga potwierdzenia

- Rzeczywisty odczyt odręcznych zdjęć, PDF i audio przez skonfigurowane AI.
- Trafność notatek, fiszek, quizów, map i odpowiedzi wykładowcy.
- Mikrofon, słyszalny dźwięk, przerwania rozmowy i zapis na fizycznych telefonach.
- Logowanie Google i powroty z linków w docelowym buildzie.
- W ostatnim kontrolowanym audycie walidator przepuszczał sześć rodzajów błędnej treści: datę, liczbę, niepopierające źródło, dwie poprawne opcje quizu, pominięcie ważnej informacji i ogólnikową notatkę. To luki kontroli, nie zaobserwowane odpowiedzi Gemini. Trzeba ocenić rzeczywiste wyniki, nie sam JSON.
- Materiały są lokalne; synchronizacja między telefonami nie jest wdrożona. Model lokalny i logowanie Google wymagają osobnego buildu, nie Expo Go.

## Zestaw materiałów do prób

Przygotuj własne materiały testowe i sprawdzoną odpowiedź wzorcową. Nie korzystaj z prawdziwych danych innych osób. Zaznacz najważniejsze fakty, daty, liczby i ostatnią informację w każdym źródle.

- [ ] Wyraźna odręczna strona z historii: daty, przyczyna, wydarzenie, skutek.
- [ ] Wyraźna odręczna strona z biologii: budowa, funkcje i proces.
- [ ] Matematyka: wzór, jednostki, warunki i zapisane kroki rozwiązania.
- [ ] Strona z przekreśleniami, cienkim pismem i jednym nieczytelnym słowem.
- [ ] Osiem ponumerowanych zdjęć, w tym ważna informacja na ostatnim.
- [ ] PDF z kilkoma stronami, tabelą, diagramem i faktem na końcu; również PDF będący skanem.
- [ ] Krótka notatka z jednym faktem oraz dłuższy materiał mieszany.
- [ ] Lista słówek z tłumaczeniami, samymi słowami, powtórzeniami i 650 parami.
- [ ] Nagranie 30–60 sekund oraz dłuższe nagranie z ręcznym spisem kluczowych faktów.
- [ ] Pusty plik, uszkodzony PDF, zły typ, za duży plik i bardzo długa nazwa.

## 1. Instalacja i pierwsze uruchomienie — P0

- [ ] Czysta instalacja otwiera aplikację bez zawieszenia i czerwonego błędu.
- [ ] Zainstalowany build działa bez komputera, Metro, kodu QR i lokalnej sieci deweloperskiej.
- [ ] Dostępny jest działający docelowy serwer HTTPS; publikowana konfiguracja nie wskazuje localhost ani prywatnego adresu komputera.
- [ ] Użytkownik bez skonfigurowanego AI rozumie, co może zrobić i jak skonfigurować odczyt. Nie ma pozornie działających przycisków.
- [ ] Podstawowa nauka z już zapisanych materiałów działa bez internetu.
- [ ] Aktualizacja z wcześniejszej wersji zachowuje notatki, pliki, fiszki i postępy.

## 2. Konta — P0

- [ ] Rejestracja e-mailem, potwierdzenie i logowanie działają; błędne dane dają czytelny komunikat.
- [ ] Google otwiera wybór konta, loguje i wraca do właściwego ekranu w docelowym buildzie.
- [ ] Anulowanie logowania Google nie zostawia aplikacji w stanie ładowania.
- [ ] Link resetowania hasła działa po zimnym uruchomieniu aplikacji; nowym hasłem można się zalogować.
- [ ] Po restarcie sesja zachowuje się poprawnie; jej wygaśnięcie nie usuwa zapisanych danych.
- [ ] Po wylogowaniu konto B nie widzi materiałów, szkiców ani kluczy konta A.
- [ ] Przejścia gość → konto A → konto B → gość nie mieszają danych ani ustawień AI.
- [ ] Wylogowanie podczas operacji nie zapisuje jej wyniku do innego konta.
- [ ] Użytkownik ma jasno określony sposób usunięcia konta i jego danych; sprawdzono rzeczywisty rezultat tej operacji.

## 3. Dodawanie materiałów — P0

- [ ] Aparat, galeria i wybór plików otwierają się na obu telefonach.
- [ ] Odmowa dostępu oraz anulowanie wyboru nie zawieszają aplikacji; można spróbować ponownie.
- [ ] JPG, PNG, PDF i obsługiwane audio importują się; nieobsługiwany format ma jasny komunikat.
- [ ] Osiem zdjęć zachowuje kolejność, podpisy i cały zestaw po restarcie.
- [ ] Długa nazwa pliku i polskie znaki nie powodują błędu odczytu.
- [ ] Pusty, uszkodzony lub zbyt duży plik nie jest zgłaszany jako prawidłowo zapisany.
- [ ] Błąd pobrania pliku nie wysyła strony błędu do AI.
- [ ] Usunięcie jednej pozycji z importu nie usuwa innych plików ani wspólnych źródeł.
- [ ] Szkic zwykłej lekcji i szkic słówek pozostają odrębne po przełączaniu ekranów i restarcie.
- [ ] Podgląd zdjęcia, PDF i odsłuch audio dotyczą faktycznie wybranego pliku.

## 4. Rzeczywisty OCR i transkrypcja — P0

- [ ] Każdy wzorcowy materiał odczytano przez rzeczywiście skonfigurowaną usługę, nie przez atrapę testową.
- [ ] Pismo odręczne jest odczytywane; jeden niejasny wyraz nie powoduje odrzucenia całej czytelnej strony.
- [ ] Sprawdzono daty, liczby, jednostki, negacje, nazwy i wzory względem oryginału.
- [ ] Osiem zdjęć obejmuje pierwszą i ostatnią stronę, bez zmiany kolejności i duplikacji.
- [ ] PDF obejmuje wszystkie istotne strony, tabelę, diagram i zakończenie. Opracowanie PDF jest opisane jako opracowanie, nie wierny cytat.
- [ ] Audio obejmuje zakończenie i kluczowe fakty; cisza nie tworzy wymyślonej transkrypcji.
- [ ] Postęp jest widoczny, ekran reaguje, a anulowanie rzeczywiście zatrzymuje dalsze przetwarzanie.
- [ ] Błąd późniejszej części nie zapisuje niepełnego materiału jako kompletnego.
- [ ] Brak sieci, zły klucz, limit API i niedostępny model dają różne, zrozumiałe komunikaty; nie ma niekończących się prób.
- [ ] Powrót po błędzie zachowuje pliki i tekst użytkownika; ponowienie nie duplikuje gotowych danych.
- [ ] Jeśli udostępniamy kilku dostawców, odczyt sprawdzono dla każdego deklarowanego zastosowania. Nieobsługiwane zastosowanie jest wyjaśnione.

## 5. Niejasne fragmenty i edycja — P0

- [ ] Ostrzeżenie jest przy właściwej treści, pokazuje odczyt i powód niepewności.
- [ ] Poprawienie tekstu usuwa jego oznaczenie; niezmieniony tekst nie jest automatycznie uznany za sprawdzony.
- [ ] „Treść jest poprawna” akceptuje czytelny fragment, ale nie ukrywa pozostałego znacznika nieczytelności.
- [ ] Usunięcie lub pominięcie wiersza poprawnie przesuwa pozostałe ostrzeżenia i odwołania.
- [ ] „Pomiń niejasne” nie wysyła usuniętej treści do generacji i zachowuje oryginalne pliki.
- [ ] Pominięcie wszystkiego blokuje pustą generację, a „Dodaj fragment” pozwala wpisać tekst również po restarcie.
- [ ] Długa linia nie zostaje obcięta po rozpoczęciu edycji.

## 6. Notatki, fiszki i quiz — P0 / P1

- [ ] Historia daje zrozumiały kontekst, chronologię i rzeczywiście opisane przyczyny/skutki, bez dopisanych dat.
- [ ] Biologia wyjaśnia budowę i procesy; matematyka zachowuje wzory i warunki. Materiał mieszany nie jest wciskany w jeden szablon.
- [ ] Opracowanie obejmuje najważniejsze informacje ze źródła, także końcowe fragmenty.
- [ ] Odwołanie do źródła faktycznie popiera twierdzenie. Istniejący numer linii nie jest wystarczającym wynikiem testu.
- [ ] Notatka ma konkretne, użyteczne akapity zamiast samych ogólników lub listy pytań.
- [ ] Fiszka nie ma pustej, błędnej albo dwuznacznej odpowiedzi.
- [ ] Każdy sprawdzony quiz ma dokładnie jedną merytorycznie poprawną opcję, również gdy dwie opcje są parafrazami.
- [ ] Wyjaśnienie quizu zgadza się z odpowiedzią i źródłem; ocena, następne pytanie i wynik działają.
- [ ] „Umiem / Nie umiem”, cofnięcie i „Ćwicz ponownie” działają bez podwójnego naliczania.
- [ ] Często mylona konkretna fiszka wraca częściej; poprawnie utrwalona ma późniejszy termin. Postęp przetrwał restart.
- [ ] Cała treść długiej fiszki/quizu jest dostępna na stronach, bez uciętych słów i nieczytelnej czcionki.
- [ ] Zestaw 650 par zapisuje wszystkie pary i kolejność; brakujące znaczenia nie są pomijane bez informacji.
- [ ] Jeśli źródło nie daje podstaw do dodatkowej pomocy, pusty quiz/fiszki mają czytelny stan, a notatka nadal działa.

## 7. Mapy myśli — P1, poprawność treści P0

- [ ] Nowa generacja wybiera sensowny typ spośród dziewięciu: drzewo, oś czasu, proces, porównanie, pojęcia, cykl, przyczyny i skutki, decyzje, argumenty.
- [ ] Uzasadnienie wyboru odnosi się do materiału, nie tylko nazwy przedmiotu.
- [ ] AI nie wymusza cyklu, przyczynowości, decyzji ani argumentów tam, gdzie źródło ich nie opisuje.
- [ ] Wiele poziomów, nierówne gałęzie i większa liczba węzłów zachowują wszystkie opisy oraz właściwych rodziców.
- [ ] Chronologia i etapy nie zmieniają kolejności. Połączenie kilku części nie miesza ID, rodziców ani źródeł.
- [ ] „Zmień układ” i „Automatycznie” działają bez nowego wywołania AI; ręczny układ nie tworzy nowych faktów.
- [ ] Rozwijanie/zwijanie i źródła działają przy małym ekranie i dużej czcionce.
- [ ] Stare zapisane mapy otwierają się poprawnie, także bez nowego uzasadnienia.

## 8. Nagrania i wykładowca — P0

- [ ] Nagraj własny głos, zapisz, zamknij aplikację i odsłuchaj po restarcie: plik ma słyszalny dźwięk oraz prawidłową długość.
- [ ] Dłuższe nagranie zapisuje się w całości; błąd zapisu umożliwia ponowienie bez fałszywego sukcesu.
- [ ] Odmowa mikrofonu, blokada telefonu, tło aplikacji i przerwanie przez inne audio nie psują sesji ani pliku.
- [ ] Wykładowca startuje bez „undefined is not a function”; słychać wybrany głos.
- [ ] Sprawdzono zarówno głos AI, jak i dostępny głos telefonu, głośnik i słuchawki.
- [ ] Wykład przechodzi między tematami bez zawieszenia, podwójnego głosu i utraty miejsca.
- [ ] „Zadaj pytanie” przerywa wykład, rejestruje pytanie i daje odpowiedź przed dalszym wykładem.
- [ ] Odpowiedź rzeczywiście dotyczy pytania; trudniejsze pytanie nie jest ignorowane.
- [ ] Pytanie praktyczne o temat jest dozwolone; niezwiązany temat i zmiana roli są odrzucane bez nadmiernego blokowania normalnej nauki.
- [ ] Po odpowiedzi wraca do właściwego miejsca; pauza, wznowienie i zakończenie są poprawne.
- [ ] Brak danych jest sygnalizowany; informacje z internetu są odróżnione od notatki i mają rzeczywiste źródła.
- [ ] Błąd głosu, limit, brak sieci i wyjście z ekranu nie zostawiają mikrofonu, odtwarzania ani ładowania aktywnych.

## 9. Dane, dostęp i konfiguracja — P0

- [ ] Restart i wymuszone zamknięcie zachowują materiały, źródła, szkice oraz postępy.
- [ ] Brak miejsca i błąd zapisu są jawne; aplikacja nie obiecuje, że dane zapisano.
- [ ] Usunięcie materiału usuwa właściwe dane; anulowanie go zachowuje. Pliki wykorzystywane przez inny materiał pozostają.
- [ ] Wersja użytkowa jasno informuje o lokalnym zapisie i braku synchronizacji; ustalony jest sposób zabezpieczenia materiałów przed utratą urządzenia lub odinstalowaniem.
- [ ] Klucze dostawców AI i tokeny nie pojawiają się w komunikatach, logach, adresach URL ani udostępnionych plikach.
- [ ] W aplikacji nie ma klucza service_role/sekretnego Supabase; API ma działającą kontrolę dostępu i ograniczenie nadużyć.
- [ ] Użytkownik rozumie, kiedy jego materiał trafi do serwera/dostawcy AI; brak zgody blokuje wysłanie.
- [ ] Kontrola braku dostępu, limitu i wygaśnięcia połączenia działa także po zmianie konta.
- [ ] Funkcje wymagające klucza API nie sugerują, że samo konto Google lub abonament ChatGPT/Claude automatycznie daje dostęp do ich API.

## 10. Model lokalny — jeśli udostępniany w wydaniu

- [ ] W docelowym buildzie model pobiera się i uruchamia na wskazanych telefonach; nie opieramy testu na Expo Go.
- [ ] Brak miejsca, przerwanie pobierania i uszkodzony plik nie dają fałszywego statusu „gotowy”.
- [ ] Odczyt/nauka w obsługiwanym zakresie działa bez internetu; brak obsługi formatu jest wyjaśniony.
- [ ] Zmierzono pamięć, czas, zużycie baterii i temperaturę na słabszym telefonie; aplikacja nie jest ubijana podczas typowej próby.
- [ ] Jeśli lokalne AI nie jest gotowe do publikacji, jego dostępność w wydaniu i opis możliwości są uczciwie ograniczone.

## 11. Wygoda i wydajność — P1

- [ ] Mały Android i iPhone z wycięciem ekranu: przyciski nie są pod paskiem systemowym, klawiaturą ani poza ekranem.
- [ ] Powiększona czcionka nie ucina pytania, odpowiedzi, błędu ani ważnego przycisku.
- [ ] Długie tytuły, polskie znaki i emoji są czytelne.
- [ ] Szybkie wielokrotne kliknięcie nie tworzy duplikatu notatki, zapisu ani żądania AI.
- [ ] Duża biblioteka, 650 fiszek i odczyt ośmiu stron nie zamrażają interfejsu.
- [ ] Zmierzono czas importu, OCR, generacji i startu wykładowcy; zapisano konkretne czasy na danych telefonach i sieci.
- [ ] Błędy są widoczne wystarczająco długo i mają możliwy następny krok.

## 12. Ostateczne dopuszczenie do publikacji

- [ ] Wszystkie P0 mają OK na obu platformach w dokładnie wskazanym buildzie; każdy pozostały błąd ma opis i decyzję.
- [ ] Ponownie uruchomiono testy automatyczne, TypeScript i kompilację po ostatniej zmianie.
- [ ] Rzeczywiste wyniki AI ocenił ktoś porównujący je z wzorcowym materiałem; sam brak błędu HTTP nie jest zaliczeniem jakości.
- [ ] Kilka osób spoza zespołu wykonało samodzielnie: dodanie materiału → sprawdzenie odczytu → nauka → pytanie wykładowcy → powrót następnego dnia.
- [ ] Opis aplikacji i prezentowane zrzuty odpowiadają możliwościom wydania, w tym ograniczeniom lokalnego zapisu i dostępu do AI.
- [ ] Przygotowano sposób zgłaszania błędów, diagnozowania awarii bez ujawniania treści notatek i wycofania wadliwej wersji.

Szablon zgłoszenia: numer testu, platforma/telefon, wersja aplikacji, źródło testowe, kroki, oczekiwany wynik, rzeczywisty wynik, częstotliwość, screenshot/nagranie i bezpieczny log bez kluczy ani prywatnych notatek.
