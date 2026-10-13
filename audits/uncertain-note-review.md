# Sprawdzanie odczytu — 9 października 2026

Niejasny wiersz pokazuje faktyczny odczyt i konkretny powód niepewności; UI nie dopowiada słów. Edycja usuwa pomarańczowe oznaczenie, jeśli nie pozostał placeholder. Można też potwierdzić widoczny odczyt, pominąć pojedynczy wiersz lub usunąć dowolny fragment. Usunięcie remapuje numery uncertainty. Oryginalne załączniki pozostają.

Jawne „Pomiń niejasne i przygotuj notatkę” usuwa wszystkie oznaczone wiersze przed generacją i pozwala przejść bez checkboxa sprawdzenia. Nadal wymaga zgody na przetwarzanie chmurowe. Wiersze z placeholderami nie trafiają do generacji; cały nieczytelny dokument wymaga przynajmniej jednej poprawionej linii. Potwierdzenie i edycja są oddzielnymi sposobami rozwiązania ostrzeżenia.

Przycisk główny „Przygotuj notatkę do nauki”, z informacją o dobrowolnych dodatkach: fiszki, mapa i quiz. TextInput nie obcina długiej istniejącej linii limitem 4000 znaków.

TypeScript: PASS. Testy helpera i UI prowadzi niezależny tester. Urządzenia fizyczne i prawdziwy odczyt Gemini nie były testowane przez tego agenta.
`nRetest wykrył pusty edytor po usunięciu ostatniej linii. Naprawiono: zawsze dostępny przycisk Dodaj fragment, również po przywróceniu pustego draft. Generacja pustego materiału nadal zablokowana.
