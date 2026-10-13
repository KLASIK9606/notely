# Notely — zgłoszenie Sign in with ChatGPT

Status: prywatny projekt w rozwoju, bez firmy. Zgłoszenie nie zostało wysłane. Integracja konta ChatGPT nie jest aktywna i wymaga przyznania dostępu partnerskiego przez OpenAI.

Oficjalny formularz: https://openai.com/form/sign-in-with-chatgpt-interest/
Dokumentacja: https://developers.openai.com/siwc/request-client-id

Formularz wymaga: e-maila kontaktowego, imienia, nazwiska, nazwy firmy, adresu strony oraz opisu produktu. Firma i publiczna strona nie są obecnie wskazane; nie należy podawać fikcyjnych danych. Dokumentacja nie gwarantuje przyjęcia indywidualnego projektu bez firmy.

Wybrana funkcja: **Sign in and ChatGPT plan use for AI requests**.

## Gotowy opis produktu (do przejrzenia)

Notely is a privately developed mobile learning application for iOS and Android, currently in prototype development. It helps students turn handwritten notes, photos, and presentation PDFs into concise study notes, flashcards, quizzes, and mind maps. An interactive AI tutor explains the student's material and answers relevant follow-up questions.

We would like to integrate Sign in with ChatGPT so eligible users can explicitly connect their ChatGPT account and authorize supported AI requests using their own plan. Our intended initial scope is note understanding, structured study-material generation, and text-based tutoring. Account sign-in and authorization to use a ChatGPT plan will be separate, explicit user choices. The application source code will remain private.

## Przed wdrożeniem

- Uzyskać zgodę OpenAI, client ID i aktualne instrukcje integracji komercyjnej, w tym obsługę powrotu do aplikacji mobilnej. Nie używać rejestracji przeznaczonej dla open source.
- Oddzielić konto Notely od połączenia dostawcy AI. Pokazywać aktywne połączenie dopiero po zakończeniu autoryzacji; umożliwić odłączenie.
- Zweryfikować wymagania PKCE, state i nonce, przechowywanie oraz odświeżanie tokenów i uprawnienia partnera według przyznanej konfiguracji.
- Zweryfikować modele, ograniczenia planów oraz wymagania transportu i odpowiedzi. Nie kopiować automatycznie adaptera zwykłego OpenAI API.
- Sprawdzić osobno obsługę plików oraz audio. Dokumentacja podglądu dla open source nie zapewnia transkrypcji ani generowania głosu przez to połączenie; nie obiecywać ich w zgłoszeniu.

Wysłanie formularza wymaga uzupełnienia prawdziwych danych oraz osobnego polecenia użytkownika. Ten dokument jest lokalnym szkicem.
