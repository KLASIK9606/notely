# Uruchomienie kont Notely

## AI przez konto użytkownika — stan wdrożenia

- **Gemini:** Ustawienia → Gemini / Google → Moje konto Google. Podaj własny identyfikator projektu Google Cloud i kliknij Połącz Gemini z Google. Aplikacja poprosi o osobną zgodę `https://www.googleapis.com/auth/generative-language.retriever` przez istniejącego dostawcę Google w Supabase. Zwykłe logowanie Google nie włącza Gemini.
- W projekcie użytkownika musi być włączone **Generative Language API**, a konto musi mieć uprawnienia do używania limitów wskazanego projektu (m.in. `serviceusage.services.use`). Serwer wysyła token OAuth w nagłówku Authorization i projekt w `x-goog-user-project`. Nie przełącza tego trybu na klucz serwera.
- Dostęp jest krótkotrwały; ta wersja wymaga ponownego połączenia po około 55 minutach. Token na telefonie trafia do SecureStore, a w przeglądarce do sessionStorage bieżącej karty; nie trafia do ustawień ani AsyncStorage. Wylogowanie usuwa zapisane połączenie z urządzenia. Odłączenie w Notely nie cofa zgody na koncie Google; zgodę można osobno usunąć w ustawieniach konta Google.
- Token oraz wybrane materiały są przekazywane do skonfigurowanego zaufanego serwera, a następnie do Google. Produkcja wymaga HTTPS; lokalne HTTP dopuszczamy tylko podczas testów w prywatnej sieci.
- To dostęp do **Gemini API i limitów własnego projektu**, nie do abonamentu aplikacji Gemini. Wybór konta Google jest także wyborem konta Notely; biblioteki różnych kont pozostają oddzielne.
- Google OAuth na telefonie wymaga własnej wersji Notely, nie Expo Go. Klucz API pozostaje dostępny w Expo Go. Przy pierwszym połączeniu nowego konta Notely bez zapisanych ustawień aplikacja odtwarza wybrany projekt z udzielonej zgody.
- Projekt OAuth nadal jest testowy. Przed szerszym udostępnieniem trzeba skonfigurować zakres AI w Google Auth Platform → Data Access, sprawdzić wymagania weryfikacji Google i opublikować aplikację. Zgody na dodatkowy zakres oraz prawdziwego odczytu przez OAuth nie sprawdzono jeszcze na koncie użytkownika.
- **ChatGPT:** kod pozostaje prywatny. Dostęp przez plan użytkownika wymaga zatwierdzenia Notely jako partnera OpenAI. Przygotowany opis i brakujące dane znajdują się w `CHATGPT-PARTNER.md`; nie wysłano zgłoszenia. Przycisk udający działające logowanie ChatGPT nie został dodany.
- **Claude:** integracja działa przez API. Dostawca nie pozwala aplikacjom zewnętrznym wykorzystywać konsumenckich sesji OAuth Claude Free/Pro/Max.

Dokumentacja: [Gemini OAuth](https://ai.google.dev/gemini-api/docs/oauth), [Sign in with ChatGPT](https://developers.openai.com/siwc/request-client-id), [zasady Claude](https://code.claude.com/docs/en/legal-and-compliance).

Projekt Supabase został połączony w lokalnym pliku .env aplikacji. Sprawdzenie publicznych ustawień Auth 9 października 2026: HTTP 200, rejestracja, e-mail i Google włączone, potwierdzenie adresu wymagane. Zapisano Site URL i przekierowanie webowe `http://localhost:8081/` oraz przekierowanie mobilne `notely://auth/callback`. Przycisk Google w podglądzie otwiera rzeczywisty ekran wyboru konta Google; końcowe zatwierdzenie logowania i powrót z sesją pozostają do sprawdzenia przez użytkownika. Dostęp do konta: ikona osoby w prawym górnym rogu albo Ustawienia → Zaloguj się do Notely.

W projekcie Google Cloud `notigay` (`gen-lang-client-0840013612`) utworzono klienta webowego „Notely – Supabase” dla callbacku `https://tnnirkyqkpyeqtvmeuxm.supabase.co/auth/v1/callback`. Sekret jest zapisany wyłącznie w ustawieniach dostawcy Google w Supabase. Google OAuth pozostaje w trybie testowym; dodano zatwierdzone konto właściciela jako testera. Kolejne konta trzeba dodać w Google Auth Platform → Odbiorcy → Użytkownicy testowi albo przygotować aplikację do publikacji.

## 1. Utwórz projekt Supabase

1. Otwórz [panel Supabase](https://supabase.com/dashboard) i utwórz projekt.
2. W projekcie kliknij **Connect** lub otwórz ustawienia **API Keys**. Skopiuj **Project URL** i **Publishable key**. Starszy publiczny klucz **anon** też jest obsługiwany.
3. W głównym katalogu aplikacji `outputs/notely` skopiuj `.env.example` do `.env`. To inny plik niż `server/.env`, który konfiguruje AI.
4. Uzupełnij:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://TWOJ-PROJEKT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TUTAJ_PUBLICZNY_KLUCZ
```

Do aplikacji trafiają tylko publiczne dane projektu. Klucz `service_role`, `sb_secret_...` i Google Client Secret pozostają poza kodem aplikacji. Konfiguracja klienta odrzuca klucze backendowe.

5. Zatrzymaj Expo i uruchom ponownie `npm start -- --clear`, następnie przeładuj aplikację.

Dokumentacja: [Supabase w React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native).

## 2. Włącz e-mail i adresy powrotu

W **Authentication → Sign In / Providers → Email** włącz logowanie e-mailem i hasłem. Pozostaw potwierdzenie adresu e-mail włączone. Zalecana minimalna długość hasła w konfiguracji projektu: co najmniej 8 znaków.

W **Authentication → URL Configuration** dodaj do **Redirect URLs**:

```text
http://localhost:8081/
notely://auth/callback
```

Dla testu webowego ustaw **Site URL** na `http://localhost:8081/`. Przed udostępnieniem produkcyjnym zmień go na rzeczywisty adres HTTPS aplikacji. Jeśli używasz innego adresu podglądu, dodaj dokładnie ten adres, z końcowym `/`, zamiast dowolnego szerokiego wzorca.

Po rejestracji aplikacja może poprosić o potwierdzenie adresu. Nie tworzy lokalnego, fikcyjnego konta. W Expo Go potwierdź adres w poczcie, wróć do aplikacji i zaloguj się e-mailem i hasłem. Link zmiany hasła obsługują wersja webowa oraz własna wersja deweloperska/produkcyjna z zarejestrowanym schematem `notely`; w Expo Go ekran wyjaśnia tę ograniczoną obsługę.

W razie problemów z dostarczaniem wiadomości sprawdź limity usługi i konfigurację SMTP w Supabase. [Przekierowania](https://supabase.com/docs/guides/auth/redirect-urls), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## 3. Włącz Google

1. Otwórz [Google Cloud Console](https://console.cloud.google.com/). Utwórz lub wybierz projekt.
2. W **Google Auth Platform** skonfiguruj nazwę aplikacji, dane kontaktowe i odbiorców. Jeżeli aplikacja ma status testowy, dodaj konta Google używane do testów jako test users.
3. Utwórz klienta OAuth typu **Web application**. Supabase pośredniczy w logowaniu także na telefonie.
4. W **Authorized redirect URIs** wpisz adres callback podany w panelu Supabase → Authentication → Google. Zwykle ma postać:

```text
https://TWOJ-PROJEKT.supabase.co/auth/v1/callback
```

To adres Supabase, a nie `notely://...`. Schemat `notely://auth/callback` należy do listy przekierowań Supabase z poprzedniego kroku.

5. Skopiuj **Client ID** i **Client Secret** do konfiguracji dostawcy **Google** w Supabase i włącz go. Nie dodawaj sekretu Google do pliku `.env` aplikacji ani do zmiennych `EXPO_PUBLIC_*`.
6. Otwórz konto w Notely i kliknij **Kontynuuj z Google**. Aplikacja korzysta z przeglądarki systemowej i PKCE. Nie zapisuje hasła Google i nie prosi o dostęp do plików Drive ani poczty.

Dokumentacja: [Google w Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google).

## 4. Test na telefonie

E-mail i hasło działają w Expo Go po konfiguracji. Google wymaga własnego development build, ponieważ Expo Go nie rejestruje schematu tej aplikacji. [Ograniczenie Expo Go](https://docs.expo.dev/guides/authentication/).

Konfiguracja `app.json` zawiera już `scheme: notely`, a `eas.json` profil `development`. Uruchomienie własnego buildu:

```powershell
npx eas-cli build --platform android --profile development
npx eas-cli build --platform ios --profile development
```

Buildy wymagają konta Expo, a iOS także konfiguracji podpisywania Apple. Po zainstalowaniu własnej aplikacji uruchom bundler:

```powershell
npm run native
```

Po zmianie schematu lub natywnego pluginu trzeba ponownie zbudować aplikację. Nie wykonano buildu APK/IPA w tym zadaniu.

## Dane konta i ograniczenia tej wersji

- To prawdziwa integracja tożsamości Supabase, nie lokalna lista haseł. Hasła obsługuje Supabase Auth.
- Sesja na telefonie jest przechowywana w SecureStore w niewielkich fragmentach. Na webie używamy `sessionStorage`, więc sesja dotyczy bieżącej karty przeglądarki.
- Materiały, postępy, szkic, ustawienia AI i klucze AI mają osobną przestrzeń dla użytkownika i projektu. Wylogowanie odsłania bibliotekę gościa. Dotychczasowe materiały gościa nie są automatycznie przypisywane do nowego konta.
- Notatki i pliki nadal są lokalne. Nie dodano synchronizacji między urządzeniami ani wysyłania biblioteki do Supabase Database/Storage. Konto nie stanowi jeszcze kopii zapasowej notatek.
- Serwer AI nadal używa własnego tokena dostępu. Sesja Supabase nie zastępuje tego tokena; nie dodano serwerowych uprawnień ani limitów AI per konto.
- Testy automatyczne korzystają z symulowanych odpowiedzi Supabase. W skonfigurowanym projekcie sprawdzono żywe ustawienia Auth i przejście z aplikacji do wyboru konta Google. Nie sprawdzono końcowego przyznania zgody, wymiany kodu na rzeczywistą sesję ani dostarczania e-maili.

## Sprawdzenie po konfiguracji

1. Zarejestruj konto e-mailem, potwierdź adres i zaloguj się.
2. Dodaj materiał, zamknij i otwórz aplikację, sprawdź sesję i materiał.
3. Wyloguj się: wcześniejsze materiały gościa powinny pozostać dostępne.
4. Zaloguj drugie konto: nie powinno widzieć materiałów ani kluczy pierwszego konta.
5. Na własnym buildzie zaloguj się przez Google. Sprawdź anulowanie logowania i powrót do aplikacji po wyborze konta.
6. W webie lub własnym buildzie użyj Nie pamiętam hasła i otwórz link na tym samym urządzeniu/przeglądarce. Ustaw nowe hasło i sprawdź ponowne logowanie.
