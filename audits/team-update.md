# Podsumowanie zespołu Notely — 9 października 2026

Koordynator prowadzi sześć ról: wykładowca AI, testowanie, kierunek produktu, niezależna ocena jakości, research i asystent informacyjny. Ze względu na trzy miejsca dla subagentów role pracują w turach. Zespół działa podczas aktywnej pracy w tym czacie; nie jest stałym monitoringiem.

**Faktycznie naprawione:** zapis na web odrzuca pusty plik i odpowiedź HTTP z błędem oraz czeka na zakończenie zapisu; błąd zatrzymania nagrania pozwala ponowić zatrzymanie. Wykładowca lepiej obsługuje anulowanie, spóźnione zdarzenia audio i próbę zmiany roli ukrytą w pytaniu o lekcję. Odłączenie żądania HTTP anuluje oczekiwanie na model. Przy braku potwierdzenia końca audio nie pozostaje bez końca w stanie „mówię”. Biblioteka odróżnia nowe fiszki od powtórek, a etykieta „odczyt materiału” obejmuje także PDF i nagrania. Są to poprawki kodu potwierdzone dostępnymi testami, nie pełnym odsłuchem na telefonie.

**Oceniono, ale nie wdrożono:** kierunek produktu wskazuje prostą ścieżkę „dodaj → sprawdź → ucz się → powtórz”. Priorytetem jest zachowanie materiałów, czytelna gotowość AI i możliwość sprawdzenia oryginalnego źródła. Osobny podcast, planer i rozbudowana grywalizacja powinny poczekać. Research znalazł poprawkę Expo dotyczącą zacięć audio na iOS; jej warunki różnią się od lokalnych klipów Notely, dlatego jest tropem do testu, a nie potwierdzoną przyczyną. Nie zmieniono natywnych zależności.

**Końcowa wspólna weryfikacja:** 125/125 testów automatycznych, kontrola TypeScript i eksport Android/iOS/web przeszły. W podglądzie web potwierdzono otwieranie materiału, etykiety, jednokrotne naliczenie odpowiedzi quizu i przejście do kolejnego pytania. Eksport potwierdza budowanie kodu, nie działanie mikrofonu ani głośnika.

**Najważniejsza luka jakości:** niezależne 16 prób offline wykazało, że odpowiedź sprzeczna z materiałem może przejść walidację, jeśli dołączono prawdziwy cytat. Dotyczy to również wymyślonych liczb i niejednoznacznych opcji quizu. To potwierdzona luka walidacji, nie pomiar częstości błędów Gemini. Poprawne cytowanie i działający interfejs nie gwarantują poprawnej wiedzy.

**Nadal potrzebne:** testy fizycznego iPhone’a i Androida oraz rzeczywistego modelu. Szczególnie: słyszalne nagranie po ponownym uruchomieniu, przerwanie i wznowienie wykładu, krótkie klipy audio, odczyt pisma/PDF oraz utrata sieci i limity. Zmiana sesji konta w trakcie nagrania pozostaje ryzykiem do sprawdzenia. Nie deklarujemy pełnej bezbłędności.

## Trzy następne kroki

1. Przejść na obu telefonach scenariusz: nagraj → zapisz → odtwórz → zamknij aplikację → odtwórz ponownie, także przy błędzie i zmianie sesji.
2. Sprawdzić prawdziwy wykład o ziemniaku z kilkoma przerwaniami i pytaniami; ocenić poprawność odpowiedzi, dźwięk oraz powrót do właściwego miejsca.
3. Zbudować mały zestaw wzorcowych zdjęć, PDF i nagrań z oczekiwanymi odpowiedziami; osobno mierzyć odczyt i poprawność notatek, fiszek oraz quizu.
