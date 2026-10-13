# Fiszki ze słówek — 2026-10-09

## Zmiany
- Dodaj ma osobny przycisk Fiszki ze słówek. Flow: zdjęcia lub wklejona lista → sprawdzenie pełnej listy → zapis → od razu nauka.
- Pary słowo–znaczenie zapisują się bez AI, bez limitu 20 fiszek. Zachowujemy kolejność, powtórzenia i wszystkie wiersze. Niekompletna lista blokuje zapis.
- Zdjęcia korzystają z istniejącego OCR i zgody; odczytane source IDs chronią przed powtórnym dodaniem tych samych zdjęć. Niepewność OCR oznacza konkretny wiersz [niepewne]; placeholdery wymagają ręcznej korekty przed zapisem lub generowaniem.
- Same słówka można uzupełnić z AI po zgodzie. Batching i API implementował koordynator. Częściowe odpowiedzi zapisują się w szkicu nawet przy błędzie kolejnej części. Gotowych par nie zmieniamy.
- Osobny szkic słówek ma własny klucz per konto, zdjęcia, tytuł i tekst; zwykłe notatki zachowują oddzielny szkic. Usuwanie materiałów nie usuwa zdjęć używanych w szkicu słówek.
- Zestaw pojawia się w Moje materiały jako Słówka / Ucz się słówek, ma tylko listę i fiszki, nie pusty quiz/mapę/wykładowcę.

## Weryfikacja
- TypeScript PASS.
- 3 testy helpera PASS: 651 par (kolejność/duplikaty/sourceLines), separatory, niekompletne i nieczytelne wiersze.
- Tester potwierdził browser 320×640: zapis i otwarcie sesji, brakujące znaczenia, placeholdery, import zdjęcia i błąd braku modelu bez utraty zdjęcia/listy, odtworzenie szkicu po reload, izolację od notatek.

## Ograniczenia
- Nie wykonano OCR realnego zdjęcia ani tłumaczeń z produkcyjnym kluczem modelu.
- Zdjęcia podlegają obecnym limitom OCR (8 plików, 64 MB, połączony odczyt maks. 200 linii / 60000 znaków). Wklejone jawne pary nie mają limitu liczby kart; zdjęcia większych list można odczytywać osobno i dołączać kolejne.
- AI do znaczeń wymaga chmury i podlega jej limitom. Nieznane słowa pozostają do ręcznego uzupełnienia.
