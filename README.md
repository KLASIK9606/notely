# Notely — lekcje ze zdjęć i aktywna nauka

Projekt Expo / React Native na Androida i iPhone’a, z interfejsem po polsku.

## Lekcje i zdjęcia

Wybierz **Dodaj materiały**, dodaj zdjęcia, pliki lub nagranie. Tytuł jest opcjonalny — po odczycie AI może zaproponować go z treści.

Dodawaj zdjęcia aparatem, z galerii lub z plików. Każdy plik ma pole podpisu, podgląd, zmianę kolejności i usunięcie. **Zapisz lekcję i pliki bez AI** działa bez AI i internetu. Zapisane lekcje otworzysz na ekranie głównym. Źródła pozostają w pamięci aplikacji na telefonie; podgląd webowy korzysta z IndexedDB.

Odczyt wymaga wybranego silnika AI. Zdjęcia są przepisywane, a PDF-y opracowywane własnymi słowami jako notatki z oznaczeniami stron; tryb PDF jest widocznie oznaczony. Popraw rozpoznany tekst i potwierdź jego sprawdzenie. Następnie powstają notatka, fiszki z powtórkami, mapa myśli i quiz, z odwołaniami do linii źródła. Można też wpisać tekst ręcznie. Zestaw przykładowy działa bez AI.

## Wykładowca AI

W gotowej notatce wybierz **Wykładowca AI**, a potem **Rozpocznij rozmowę**. Ekran pokazuje mówiące kółko i przycisk **Zadaj pytanie**. Tematy przechodzą automatycznie, a po odpowiedzi wykład wraca do przerwanego miejsca. Dotknięcie kółka wstrzymuje lub wznawia rozmowę. Podczas przygotowywania odpowiedzi obraca się pierścień z 🤔; to przetwarzanie materiału, nie wyszukiwanie w internecie. AI opowiada poprzez ciekawe pytania, proste wyjaśnienia i krótkie analogie, zachowując fakty z notatki. Gemini i GPT generują naturalny głos i obsługują pytania głosowe. Po wykryciu mowy i chwili ciszy pytanie wysyła się automatycznie; można też wybrać **Gotowe — odpowiedz** (maksymalnie 60 sekund). Opcje pod trzema kropkami zawierają głos telefonu, tempo, pytanie pisemne i tekst odpowiedzi ze źródłami. Claude obsługuje pytania pisemne. Potrzebne są działający serwer i własne API; głos korzysta z osobnego limitu API, historia i audio pozostają w bieżącej sesji.

Instrukcja testowania na obu telefonach: [TESTOWANIE-TELEFONY.md](TESTOWANIE-TELEFONY.md).

Zatrzymanie nagrania automatycznie zapisuje także lekcję. Po zmianie podpisów zapisz je przyciskiem zapisu lekcji. Próba ponownego zapisu tego samego nagrania wykorzystuje już skopiowany plik.

## Nagrania wykładów

W **Dodaj → Nagranie z wykładu → Nagraj wykład** uruchomisz mikrofon. „Zatrzymaj i dodaj nagranie” doda plik do lekcji. Przez **Pliki** zaimportujesz MP3, M4A, WAV, WEBM, OGG lub FLAC. Każde nagranie ma podpis i odtwarzacz z przewijaniem o 10 sekund. Zatrzymanie nagrania automatycznie zapisuje także lekcję. Po zmianie podpisów zapisz lekcję ponownie. Nagrywanie i odtwarzanie korzystają z `expo-audio`, dostępnego w Expo Go.

Nagrywanie odbywa się przy otwartej aplikacji. Przejście do tła zatrzymuje i zapisuje fragment; po 20 minutach następuje automatyczny zapis. Dłuższy wykład dodawaj w kolejnych częściach. Nagrania nie są automatycznie wysyłane do AI.

Transkrypcja nagrań działa przez własny serwer po zaznaczeniu zgody i wybraniu **GPT / OpenAI** (speech API `gpt-4o-mini-transcribe`) lub **Gemini**. Obecny lokalny Qwen oraz Claude nie obsługują transkrypcji audio w tej aplikacji. Możesz nadal przechowywać i odsłuchiwać nagrania lokalnie. Po odczycie sprawdź tekst, a potem utwórz materiały wybranym modelem. W lekcji mieszanej odczyt zachowuje kolejność zdjęć i nagrań oraz numery niepewnych linii. Zbyt długie transkrypcje są odrzucane zamiast obcinania końca wykładu.

## Fiszki — dwie oceny i historia każdej karty

Są tylko **Umiem** i **Nie umiem**. Pytanie i odkryta odpowiedź pozostają razem na karcie; duże przyciski są przyklejone do dołu ekranu. Ostatnią ocenę można cofnąć, razem ze zmianą terminu i kolejki.

Każda karta zapisuje osobno liczbę odpowiedzi „Umiem”, „Nie umiem”, serię poprawnych odpowiedzi, etap nauki i następny termin. Algorytm korzysta z samooceny użytkownika, nie ocenia automatycznie treści odpowiedzi.

- „Nie umiem” zeruje serię, ustawia powrót za minutę i wstawia kartę po innych pytaniach. Sesja dopuszcza maksymalnie trzy próby tej karty; dalsza powtórka pozostaje zapisana na później.
- Nowa karta po „Umiem” wróci po 10 minutach; następna poprawna odpowiedź prowadzi do powtórki następnego dnia. Po błędach krótkie kroki trwają 3 minuty, a karta z co najmniej trzema błędami wymaga trzech poprawnych kroków do utrwalenia.
- Utrwalone karty po kolejnych poprawnych odpowiedziach dostają dłuższe odstępy, do 180 dni. Częste błędy na konkretnej karcie spowalniają wzrost jej odstępów. Błąd na utrwalonej karcie skraca zapisany odstęp i przywraca krótkie kroki nauki.
- Sesja przeplata dwie zaległe powtórki z jedną nową kartą, maksymalnie 10 nowych kart na sesję. Wśród dostępnych powtórek pierwszeństwo mają karty z większym udziałem błędów.
- Swobodne ćwiczenie całego zestawu nie zmienia historii ani zaplanowanych terminów.

## Testowanie w Expo Go

Potrzebujesz Node.js 24 i Expo Go zgodnego z SDK 57. W folderze projektu:

```powershell
npm ci
npm start -- --lan
```

Telefon i komputer powinny być w tej samej sieci. Otwórz QR w Expo Go na Androidzie lub aparatem na iPhone’ie. Podgląd na komputerze: `npm run web`.

W Expo Go działają lekcje, zdjęcia, podpisy i integracje chmurowe przez własny serwer. **Lokalny model wymaga osobnego buildu Notely** z modułem natywnym; Expo Go oraz przeglądarka go nie uruchamiają.

## AI lokalnie na telefonie

Dodano integrację `llama.rn` z modelem **Qwen3-VL 2B Instruct Q4_K_M** i projektorem obrazu Q8. Model jest na licencji Apache 2.0. W Ustawieniach wybierz **Lokalnie na telefonie**, następnie pobierz model: około **1,55 GB**. Pliki są pobierane z przypiętej wersji oficjalnego repozytorium Qwen. Aplikacja sprawdza rozmiar i nagłówek GGUF.

Po pobraniu odczyt JPG/PNG i tworzenie materiałów odbywają się na urządzeniu bez opłat API, serwera i internetu. Lokalny tryb nie wysyła danych do chmury ani nie przełącza się na nią automatycznie. PDF i WEBP wymagają zamiany na JPG/PNG lub wybrania chmury.

Telefon potrzebuje wolnego miejsca oraz wystarczającej pamięci RAM. Szybkość i jakość odczytu pisma odręcznego trzeba sprawdzić na konkretnych urządzeniach. Nie potwierdzono działania modelu na fizycznym telefonie w tym środowisku. Długie lekcje trzeba dzielić na części; generowanie lokalne przyjmuje do około 6500 znaków.

Build developerski zawierający silnik AI:

```powershell
npx eas-cli build --platform android --profile development
# Po instalacji buildu na telefonie:
npm run native -- --lan
```

Samodzielny testowy APK, działający bez Metro:

```powershell
npx eas-cli build --platform android --profile preview
```

iPhone:

```powershell
npx eas-cli build --platform ios --profile development
```

Zdalne buildy wymagają konta Expo, a iOS konfiguracji podpisywania Apple. Identyfikatory aplikacji `app.notely.mobile` są robocze. Nie wykonano buildu APK/IPA ani publikacji. `npm ci` powinno wykonać skrypt instalacyjny `llama.rn`, który pobiera biblioteki natywne. Na komputerze użytym do przygotowania projektu ten skrypt był blokowany przez ograniczenia uruchamiania procesów; zainstalowano pakiet bez skryptu. Biblioteki natywne trzeba pobrać podczas normalnej instalacji/buildowania.

## Opcjonalnie GPT, Gemini albo Claude

W Ustawieniach wybierz dostawcę i opcjonalnie własny klucz API. Szybkie modele są dobierane automatycznie: `gpt-6-luna` (reasoning none), `gemini-3.5-flash-lite` lub `gemini-3.1-flash-lite` (minimal thinking), `claude-haiku-5-5` (thinking disabled, effort low). Starsze ustawienia telefonu przechodzą na szybkie modele. Materiały mają zwięzłe odpowiedzi, ale odczyt nie streszcza notatek. Nie uruchamiamy dodatkowego testu połączenia przed każdym odczytem. Test porównawczy szybkości i jakości na rzeczywistych kontach API nie został przeprowadzony. Korzystanie z API zależy od rozliczeń dostawcy; abonament aplikacji czatu nie zastępuje klucza API.

Klucze na telefonie są zapisywane w Expo SecureStore po zapisaniu ustawień. W przeglądarce pozostają wyłącznie w pamięci strony. Wybrany klucz i materiały są przekazywane przez skonfigurowany serwer do dostawcy, dlatego używaj własnego zaufanego serwera i HTTPS. Przed wysłaniem materiałów aplikacja wymaga zaznaczenia zgody.

Konfiguracja serwera:

1. Skopiuj `server/.env.example` do `server/.env`.
2. Opcjonalnie ustaw `OPENAI_API_KEY`, `GEMINI_API_KEY` lub `ANTHROPIC_API_KEY` jako klucze serwera. Klucz podany w aplikacji ma pierwszeństwo dla wybranego dostawcy.
3. Dla dostępu z telefonu ustaw `HOST=0.0.0.0` oraz losowy `API_TOKEN`. Bez tokena serwer odmawia nasłuchiwania na interfejsie sieciowym.
4. Uruchom `npm run api` w drugim terminalu.
5. W aplikacji wpisz URL serwera i token. W wersji developerskiej do testu LAN można użyć np. `http://192.168.1.20:3001`; adres musi należeć do Twojego komputera. `localhost` na telefonie oznacza telefon. W instalacji samodzielnej używaj HTTPS.
6. Zapisz ustawienia i sprawdź połączenie. Dodaj materiały, odczytaj i popraw treść.

Limit lekcji: 8 plików i 64 MB łącznie. Zdjęcia/PDF: do 8 MB, audio: do 20 MB; dla Gemini nagranie inline do 12 MB. Odczyt zdjęć jest wysyłany w partiach do 18 MB. Serwer nie zapisuje kluczy ani treści żądań w logach. OpenAI jest wywoływane z `store: false`; retencja danych zależy również od zasad dostawcy.

## Weryfikacja

```powershell
npm run typecheck
npm test
npx expo export --platform all --no-bytecode --max-workers 1
```

110 testów sprawdza osobną historię kart, etapy nauki, mieszanie i ograniczenie kolejki, walidację audio, kontrakty transkrypcji oraz kontrakty serwera, adaptery dostawców, błędne pliki, odwołania do źródeł, numerację lekcji, migrację ustawień i powtórki fiszek. Wywołania AI w testach są zastępowane atrapami. Eksport JavaScript nie jest instalowalną aplikacją i nie potwierdza działania natywnych bibliotek ani jakości modelu.

Odczyt prawdziwych zdjęć na telefonie, aparat, mikrofon, odtwarzanie i rzeczywiste wywołania dostawców wymagają testów na urządzeniu. Przyciski fiszek i cofanie oceny sprawdzono w podglądzie przy szerokości 390 px. Test przesłania przykładowego zdjęcia w przeglądarce został zablokowany przez odmowę uprawnienia do wysyłania plików.

Wersja zawiera integrację kont wymagającą konfiguracji Supabase. Nie zawiera synchronizacji ani abonamentów. Token serwera jest rozwiązaniem testowym. Odczyt AI wymaga sprawdzenia; walidacja JSON i numerów linii nie gwarantuje poprawności treści.

## Dokumentacja integracji

- [llama.rn — natywny silnik i obsługa obrazu](https://github.com/mybigday/llama.rn)
- [Oficjalny Qwen3-VL 2B GGUF](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct-GGUF)
- [OpenAI — Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Gemini — generateContent](https://ai.google.dev/api/generate-content)
- [Claude — Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)

- [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/)
- [OpenAI — Speech to text](https://developers.openai.com/api/docs/guides/speech-to-text)
- [Gemini — Audio](https://ai.google.dev/gemini-api/docs/generate-content/audio)




## Pytania i wyszukiwanie — v27

Pytanie przerywa wykład. AI dostaje osobny tryb odpowiedzi: najpierw odpowiada na najnowsze pytanie w kontekście całej notatki. Pełny odsłuch kończy się zdaniem „No to wracamy do naszej prezentacji”, jeśli lekcja będzie kontynuowana. Przy niejasnym pytaniu lub braku informacji wykładowca prosi o doprecyzowanie i czeka; odpowiedź na doprecyzowanie może następnie wznowić pierwotny temat. W wypowiedziach dopuszczony jest delikatny humor związany z materiałem.

W pytaniach do Gemini włączone jest oficjalne narzędzie Google Search. Model sam decyduje, czy wyszukiwanie pomoże w odpowiedzi. Odczyt, tworzenie notatki i zwykły wykład nie korzystają z wyszukiwania. Uzupełnienia mają być oznaczane „Poza Twoją notatką”; internetowe informacje nie dostają fikcyjnych numerów linii. Po rzeczywistym wyszukiwaniu API zwraca sugestie Google i linki źródeł, widoczne na ekranie i w opcjach odpowiedzi. Sam obrót kółka nie potwierdza wyszukiwania. Wyszukiwanie wymaga dostępu i odpowiedniego limitu konta API; może mieć osobny koszt i zwiększyć czas odpowiedzi. Nie przełączamy dostawcy ani nie ponawiamy limitu 429.

Dokumentacja: https://ai.google.dev/gemini-api/docs/generate-content/google-search oraz https://ai.google.dev/gemini-api/docs/generate-content/structured-output . Sugestie dostawcy renderowane są w izolowanym iframe (web) lub WebView bez JavaScript (Expo Go). Linki otwierają się po kliknięciu.


## Limit Gemini — v28

Google Search dla modeli Gemini 3.5/3.1 Flash Lite jest niedostępny w darmowym API według cennika Google z 8 października 2026; zwykłe generowanie może nadal być dostępne. Błąd 429 przy pytaniu z wyszukiwaniem pokazuje przycisk Odpowiedz bez internetu. Jest to jedna nowa próba na kliknięcie, tylko z notatką, bez automatycznego ponawiania ani zmiany dostawcy. Opcje rozmowy mają przełącznik Internet w pytaniach; wybór dotyczy bieżącej rozmowy. Jeśli limit obejmuje generowanie lub mowę, wyłączenie wyszukiwania nie pomoże.

Serwer wykorzystuje strukturalne szczegóły quotaId/quotaMetric/quotaValue oraz RetryInfo do rozróżnienia limitu dziennego, chwilowego i potwierdzonego limitu 0. Gdy szczegóły są nieobecne, pozostaje komunikat ogólny; nie zgadujemy przyczyny i nie zwracamy surowego tekstu dostawcy. 429 nie jest automatycznie ponawiany. Konkretny ostatni błąd z telefonu nie był dostępny do odtworzenia. Dokumentacja: https://ai.google.dev/gemini-api/docs/pricing i https://ai.google.dev/gemini-api/docs/rate-limits .


## Kontrola wykładowcy — v29

Pytanie przechodzi kontrolę zakresu przed odpowiedzią i dostępem do wyszukiwarki. Jawne prośby o zmianę roli, ignorowanie instrukcji lub ujawnienie promptu są odrzucane lokalnie na serwerze. Osobna ocena modelu sprawdza sens pytania względem całej notatki, krótkie doprecyzowania, pytania mieszające tematy i próby ukrycia poleceń. Odrzucone pytania nie trafiają do historii rozmowy; niejasne pytania pozostają w historii, aby zachować kontekst doprecyzowania.

Każda cytowana linia wymaga prawdziwego, dosłownego fragmentu źródła. Osobne wywołanie modelu sprawdza, czy gotowa wypowiedź odpowiada na pytanie i nie przeczy materiałowi: także definicje, negacje, liczby, jednostki i błędne założenia. Przy niewystarczającym potwierdzeniu odpowiedź nie jest odtwarzana; wykładowca prosi o doprecyzowanie albo zatrzymuje wykład. Kontrola nie gwarantuje bezbłędności AI ani całkowitej odporności na obejścia. Nie naprawia automatycznie błędnych notatek. Recenzent nie pobiera stron źródeł i nie jest niezależnym internetowym fact-checkerem.

Koszt kontroli: zwykłe pytanie to do trzech wywołań modelu (zakres, odpowiedź, ocena), fragment wykładu dwa (wypowiedź, ocena). Rozpoznanie mowy i głos mają osobne wywołania. Jawna próba zmiany roli nie wymaga generowania odpowiedzi AI. Cały proces odpowiedzi ma wspólny limit 100 sekund. Dodatkowa kontrola może zwiększać czas odpowiedzi i zużycie limitów dostawcy; 429 nadal nie jest automatycznie ponawiany.

Weryfikacja: 96/96 testów, TypeScript, eksport Android/iOS/web. Testy obejmują kontrakt HTTP, odmowy, obfuskację, pytania mieszane, doprecyzowania, zmyślone cytaty, poprawny cytat z błędnym wnioskiem i odrzucenie niepoprawnego wyniku kontroli. Odpowiedzi modeli w testach są symulowane; rzeczywista jakość wymaga sprawdzenia z kluczem API na telefonie.

## Praktyczne pytania i mniejsze zużycie API — v30

Ocena zakresu obejmuje ogólny temat i obiekt lekcji, nie tylko treść slajdów. Pytania o krojenie, gotowanie, przechowywanie i uprawę ziemniaka są dozwolone przy prezentacji o ziemniaku. Nieobecność odpowiedzi w materiale nie oznacza zmiany tematu. Roleplay, próby zmiany zasad i rzeczywiście niezwiązane zadania nadal są odrzucane.

Zastąpiono osobną recenzję AI samokontrolą w tym samym wywołaniu, które generuje odpowiedź. Pytanie wymaga zwykle dwóch wywołań (zakres + odpowiedź), fragment wykładu jednego. Walidacja prawdziwych cytatów pozostaje na serwerze. Samokontrola modelu nie jest niezależnym sprawdzeniem prawdziwości: ta zmiana zmniejsza koszt i opóźnienie kosztem dodatkowej oceny semantycznej. Podstawowa wiedza praktyczna spoza materiału jest dozwolona, ale odpowiedź musi zaczynać się od „Uzupełnienie ogólne:”. Nie jest oznaczana jako fakt ze slajdu ani zweryfikowana przez internet.

Kontrola zakresu wskazuje, czy wyszukiwanie jest potrzebne. Google Search jest dołączane tylko przy rzeczywistej potrzebie i włączonym internecie; proste pytania z notatki lub podstawowej wiedzy ogólnej nie używają tego narzędzia. Ograniczono liczbę wskazywanych linii i długość wyników kontroli. Wspólny limit odpowiedzi wynosi 65 sekund, limit klienta 75 sekund. Urwany wynik jest odrzucany i ma komunikat odróżniający długość odpowiedzi od kwoty API. Nie dodano automatycznych ponowień 429.

W aplikacji zapamiętywane są wypowiedzi dla poszczególnych fragmentów wykładu na czas bieżącej rozmowy; ponowne rozpoczęcie wykorzystuje gotowy tekst i istniejący cache audio, dopóki plik jest jeszcze dostępny. Nie zapisujemy tej pamięci między sesjami. Równoczesne ponowne wysłanie podczas przygotowania wypowiedzi jest blokowane. Głos AI i transkrypcja nadal zużywają osobne limity.

Sprawdzenie: 97/97 testów, TypeScript, eksport Android/iOS/web. Testy obejmują praktyczne pytanie o krojenie ziemniaka, oznaczenie wiedzy ogólnej, dwa wywołania bez wyszukiwania i recenzenta, blokady roleplay oraz osobny błąd długości odpowiedzi. Modele w testach są symulowane; nie odtworzono rzeczywistego błędu kwoty konta użytkownika. Limity Gemini: https://ai.google.dev/gemini-api/docs/rate-limits .


## Płynniejsze przejścia wykładowcy — v31

Podczas odtwarzania fragmentu wykładu aplikacja przygotowuje jeden następny fragment, w tym jego naturalny głos AI. Przy przejściu korzysta z tego samego zadania i zapisanego nagrania; nie wysyła ponownie żądania, które już trwa. Głos telefonu wymaga przygotowania tylko tekstu. Celową przerwę między tematami skrócono z 850 do 150 ms.

Przygotowanie nie uruchamia odtwarzania ani nie modyfikuje historii rozmowy. Pytanie, pauza, tło i wyjście anulują oczekujące przygotowanie, aby dać pierwszeństwo użytkownikowi. Gotowe teksty i pliki mogą zostać użyte po powrocie; spóźnione wyniki anulowanej pracy nie zapisują plików ani nie uruchamiają kolejnego tematu. Zapamiętywane nagrania nie usuwają pliku aktualnie odtwarzanego ani miejsca powrotu do wykładu.

Błąd przygotowania w tle nie zatrzymuje bieżącej wypowiedzi. Jeśli użytkownik dotrze do tego fragmentu, pojawia się istniejący komunikat błędu; nie dodano automatycznych ponowień limitu. Jeśli AI lub sieć nie zdąży przygotować kolejnego tematu podczas bieżącego odsłuchu, aplikacja nadal może chwilę czekać. Nie jest to natywny odtwarzacz z gwarantowanym bezprzerwowym przejściem między plikami. Przygotowujemy tylko jeden fragment naprzód, więc wcześniejsze zatrzymanie może zużyć jedno dodatkowe wywołanie do niewysłuchanego tematu.

Weryfikacja: 101/101 testów, TypeScript i eksport Android/iOS/web. Testy obejmują wspólne zadanie przygotowania i odsłuchu, brak duplikacji, zachowanie przy błędzie limitu, anulowanie i spóźnione wyniki. AI i audio w testach są symulowane; płynność rzeczywistego głosu na iPhonie/Androidzie wymaga odsłuchu na urządzeniu.


## Konta i logowanie — v32

Dodano integrację Supabase Auth: rejestrację e-mail/hasło, logowanie, Google przez PKCE, odzyskiwanie hasła, wylogowanie i odtwarzanie sesji. Ikona konta znajduje się w nagłówku, wejście także w Ustawieniach. Bez konfiguracji aplikacja jasno pokazuje, że konta czekają na uruchomienie; tryb gościa i dotychczasowe dane działają dalej.

Konfiguracja i testy telefonu: [KONTA.md](KONTA.md). Google wymaga własnego development build na telefonie; e-mail działa w Expo Go. Dodano schemat notely i plugin expo-web-browser. Hasła są obsługiwane przez Supabase; klient zapisuje sesję w SecureStore, na webie w sessionStorage. Prawdziwe logowanie wymaga utworzenia projektu i włączenia dostawcy Google — nie zostało jeszcze aktywowane ani sprawdzone na koncie zewnętrznym.

Oddzielono materiały, postępy, szkice, ustawienia i klucze AI każdego konta oraz bibliotekę gościa. Ta wersja nie synchronizuje notatek i plików do chmury; konto nie zastępuje kopii zapasowej. Sesja konta nie zastępuje istniejącego tokena serwera AI.

Weryfikacja: 110/110 testów, TypeScript i eksport iOS/Android/web. Nowe testy sprawdzają izolację lokalnych danych, bezpieczny typ konfiguracji, callback PKCE, odtwarzanie i usuwanie dużych sesji, przerwany zapis oraz rzeczywisty SDK Supabase z symulowanymi odpowiedziami logowania, odświeżania, wylogowania i wymiany kodu Google. Podgląd 390 × 844: formularze, komunikat braku konfiguracji i powrót do materiałów gościa. Nie wykonano realnego logowania Google ani buildu APK/IPA.



## Aktywacja projektu kont

Dodano publiczną konfigurację projektu Supabase do lokalnego .env, z nazwami EXPO_PUBLIC wymaganymi przez Expo. Odpowiedź rzeczywistej usługi /auth/v1/settings: HTTP 200, e-mail i rejestracja włączone, potwierdzenie e-maila wymagane, Google wyłączone. Włączenie Google wymaga panelu Supabase i danych klienta OAuth według KONTA.md. Formularz logowania jest aktywny w podglądzie; nie utworzono konta testowego ani nie wysłano wiadomości e-mail. Supabase SDK przypięto do wersji 2.117.3 i zachowano lockfile. Dane konfiguracji Next.js przystosowano do istniejącej aplikacji Expo; nie dodano Next.js middleware ani SSR. Zainstalowane globalne umiejętności: supabase oraz supabase-postgres-best-practices.
#   n o t e l y  
 