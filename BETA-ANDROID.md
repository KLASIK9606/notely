# Testowa wersja Androida

Tester instaluje APK i dodaje materiały bez logowania. Nie wpisuje klucza AI, adresu ani tokenu serwera. Nie pobiera modelu lokalnego.

## Serwer

Gotowy `render.yaml` umożliwia konfigurację przez Render → New → Blueprint po przesłaniu zmian do GitHuba. Wskaż repozytorium Notely. Panel poprosi o trzy wartości: klucz Gemini oraz publiczny URL i klucz Supabase. Plan Free jest wpisany w pliku. Nie dodawaj metody płatności, jeśli chcesz uniknąć opłat za przekroczenie limitów Render.

Na Render utwórz Web Service z tego repozytorium, wybierz Free, build `npm ci`, start `npm run api`. Ustaw `NODE_VERSION=24`, `HOST=0.0.0.0`, `MANAGED_AI=true`, `GEMINI_API_KEY` (prywatny klucz właściciela), `SUPABASE_URL` i `SUPABASE_PUBLISHABLE_KEY` (publiczny klucz projektu logowania Notely). Nie umieszczaj klucza Gemini w GitHubie ani w zmiennych EXPO_PUBLIC.

Tymczasowy tryb gościa nie sprawdza sesji Supabase; endpoint AI jest publiczny i korzysta ze wspólnej puli właściciela. Aby przywrócić konta, ustaw ALLOW_GUEST_AI=false na serwerze oraz EXPO_PUBLIC_REQUIRE_AI_LOGIN=true w nowym buildzie aplikacji. Klient nie może zmienić dostawcy ani przekazać własnych danych AI w trybie beta. Domyślnie obowiązuje 100 operacji AI dziennie na użytkownika, 500 łącznie, 30 żądań na minutę na użytkownika oraz maksymalnie 3 równoległe operacje. Limity można zmienić przez `AI_DAILY_USER_LIMIT` i `AI_DAILY_TOTAL_LIMIT`.

To liczniki operacji, nie tokenów ani wydatków. Jedna lekcja może obejmować wiele operacji. Liczniki dzienne są w pamięci i resetują się przy restarcie lub uśpieniu serwera. Darmowy Render zasypia i nie gwarantuje ciągłej dostępności. Nie włączaj płatnego planu API, jeśli testy muszą pozostać bezpłatne. Trwałe limity wymagają późniejszego magazynu danych.

## Aplikacja

W środowisku EAS używanym przez profil preview ustaw `EXPO_PUBLIC_API_URL` na publiczny adres HTTPS serwera oraz `EXPO_PUBLIC_SUPABASE_URL` i `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` projektu Notely. Profil preview ustawia `EXPO_PUBLIC_MANAGED_AI=true` i pomija natywny plugin llama.rn.

Uruchom `npx eas-cli build --platform android --profile preview`. Po poprawnym buildzie udostępnij link instalacyjny. Tester akceptuje instalację APK spoza sklepu. Google login wymaga poprawnej konfiguracji dostawcy Supabase i dozwolonego redirectu `notely://auth/callback`.

## Przed udostępnieniem

Na fizycznym Androidzie sprawdź Google login, sesję po ponownym uruchomieniu, zdjęcia pisma odręcznego, PDF, nagrania, fiszki, quiz i wykładowcę. Sprawdź także brak dostępu do AI bez logowania, wylogowanie oraz komunikat o wyczerpaniu limitu. Wdrożenie i wygenerowanie APK nie są wykonane przez samą konfigurację repozytorium.

W trybie gościa limit osobisty dotyczy adresu połączenia. Na hostingu z proxy może być współdzielony przez testerów. Wciąż działa limit globalny. Kontrola limitu jest w pamięci, nie stanowi gwarancji budżetu API.
