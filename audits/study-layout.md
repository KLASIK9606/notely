# Weryfikacja ekranów nauki — 9 października 2026

Niezależny tester zmian autorów fiszek i quizu. Testy wykonano na lokalnym podglądzie web `http://localhost:8081/`, z wbudowanym przykładem Fotosynteza, bez wywołań AI i bez zmiany prawdziwych materiałów użytkownika.

## Wynik

- `npm run typecheck`: PASS.
- `npm test`: 131/131 PASS, w tym 6 nowych testów `src/studyLayout.test.mjs`.
- Browser 320×640 i 360×640: pytanie i odpowiedź fiszki widoczne; przyciski Umiem/Nie umiem pozostają na ekranie. W 320×640 ich wysokość wynosiła 63 px, dolna krawędź 632 px. Dokument miał 320×640 bez przepełnienia.
- Browser quiz: wszystkie cztery krótkie opcje widoczne; poprawny i błędny wybór pokazują odpowiednie wyjaśnienie; Następne pytanie przechodzi do następnego; wynik 2/3 oraz pierwsza odpowiedź w podsumowaniu widoczne na 320×640 bez przewijania. Na 360×640 opcje miały 50 px wysokości.
- Powrót z fiszek i quizu do notatki działa. Globalny nagłówek i dolna nawigacja nie zabierają miejsca w ekranie ćwiczenia.

## Błędy wykryte i poprawione przez autorów

1. Fiszka pozostawała pusta wizualnie na web, ponieważ React Native Web nie wysyłał `onTextLayout`. Autor dodał pomiar DOM. Po poprawce pytanie i odpowiedź były widoczne.
2. Strona długiej opcji quizu przekraczała dostępny budżet o 4–8 px. Tester utrwalił przypadek regresyjny (height250, potrzebne258). Autor poprawił rezerwę na odstępy/etykietę/border oraz budżet szerokości. Test regresyjny przechodzi.

## Zakres dowodów i ograniczenia

Testy helperów potwierdzają zachowanie wszystkich znaków, polskich liter, emoji, białych znaków i kolejności powtarzanych linii. Długie pytania/opcje/odpowiedzi sprawdzono automatycznie, również przy fontScale 1, 1.5 i 2 oraz różnych budżetach wysokości.

Nie testowano na fizycznym iPhonie/Androidzie ani rzeczywistego systemowego powiększenia czcionki. Browser sprawdzono na krótkich wbudowanych materiałach: wielostronicowa treść i przycisk powrotu do początku pytania przy paginacji nie były kontrolowane wizualnie. Zachowanie budżetu helpera nie jest dowodem dokładnego pomiaru tekstu na każdym urządzeniu. Tymczasowy testowy tab zamknięto i przywrócono domyślny viewport; taby użytkownika pozostały bez zmian.
