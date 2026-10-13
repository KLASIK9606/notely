# Elastyczna mapa myśli — 2026-10-12

Mapa ma dziewięć układów: drzewo, oś czasu, proces, porównanie, pojęcia, cykl, przyczyny i skutki, decyzje oraz argumenty. Nowa generacja wybiera layout według treści; użytkownik może przełączyć prezentację bez kolejnego wywołania AI. Kolejność elementów i fakty nie zmieniają się przy przełączeniu.

Nowy format mindMap zachowuje center i branches dla zgodności, dodaje layout oraz nodes. Każdy node ma id, parentId (pusty dla głównego wątku), label, detail i sourceLines. Płaski zapis obsługuje wiele poziomów bez rekurencyjnego schematu JSON. Limit bezpieczeństwa to 300 węzłów na odpowiedź, bez sztywnego minimum, dwóch poziomów czy równych gałęzi. Walidacja odrzuca cykle, duplikaty ID, brakujących rodziców i błędne odwołania. Granice sekcji, fiszek i quizów pozostają osobne.

Stare mapy są konwertowane w widoku bez zmiany zapisanych danych, z zachowaniem wszystkich opisów i źródeł. Łączenie części notatki nadaje unikalne prefiksy ID, zachowuje rodziców oraz przelicza sourceLines na pełny odczyt. Węzły nie tracą tekstu na ekranie telefonu; głębokość wcięcia jest ograniczona wizualnie, a nie w danych. Powtórzone odwołania potomka do tych samych źródeł są dostępne raz przy rodzicu.

Weryfikacja: 173 testy PASS, TypeScript PASS, eksport Android/iOS/web PASS. Nowe regresje sprawdzają pięć układów, głębszą hierarchię, 60 węzłów, cykle, zgodność starych map i łączenie części. Podgląd istniejącego przykładu w przeglądarce 320×640: przełączanie układu i zwijanie gałęzi działa; szerokość dokumentu wynosi 320px. Screenshot: flexible-map-mobile.jpg.

Nie wykonano nowej generacji na rzeczywistym Gemini ani testu fizycznego telefonu. Pełny nowy format powstaje przy następnym opracowaniu materiału. Zmiana wyglądu starej mapy nie dopisuje brakującej treści. Walidacja struktury i odwołań nie dowodzi prawdziwości twierdzeń.

Rozszerzenie: layoutReason przechowuje krótkie uzasadnienie wyboru LLM. Nowa generacja wymaga tego pola; starsze zapisane mapy bez niego pozostają zgodne. Wybór ręczny jest pod przyciskiem Zmień układ, domyślnie pozostaje Automatycznie. Przełączenie nie wywołuje AI i nie zmienia danych źródłowych. Nowe typy i zachowanie uzasadnienia przeszły regresje, menu i układ decyzji przeszły próbę 320×640 bez poziomego overflow. Screenshot map-layout-choices.jpg. Rzeczywisty wybór LLM nadal nie był wywoływany bez skonfigurowanego dostępu.
