# Hasła i klucze

Klucz Gemini i inne prywatne dane przechowuj wyłącznie w ignorowanym `server/.env` lub w polach Environment serwera Render. Nigdy nie dodawaj ich do zmiennych `EXPO_PUBLIC_*`, kodu aplikacji, README ani screenów. Dane `EXPO_PUBLIC_*` trafiają do aplikacji i można je odczytać z instalatora.

Publiczny URL Supabase i klucz `sb_publishable_*` są przeznaczone do aplikacji. Klucze `service_role`, `sb_secret_*`, klucz Gemini i hasła są prywatne.

W tym lokalnym repozytorium włączono hooki Git: pre-commit sprawdza rzeczywistą zawartość staged, a pre-push pliki oraz historię. Wykryte typowe klucze, prywatne pliki i wartości sekretów z lokalnych `.env` blokują operację. Komunikaty pokazują tylko nazwy plików i identyfikatory commitów.

Po nowym klonowaniu uruchom `npm run secrets:install`. Kontrola ręczna: `npm run secrets:check`. Hooki można ominąć, a skaner nie rozpozna dowolnego hasła; nie zastępuje to ostrożnego przeglądu zmian. Jeśli klucz został opublikowany, unieważnij go u dostawcy — samo usunięcie pliku nie wystarcza.
