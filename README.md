# Study App

Simple static study app that reads flashcards and quizzes from local source files.

## How cards are parsed

Each card is built from one text block (blocks are separated by an empty line):

- Lines that start with `Vraag` become the question.
- The lines below become the answer.

This matches the format in `Deelexamen`.

The app also supports paired source files:

- `*.questions.txt`
- `*.answers.txt`

For paired files, each numbered entry (for example `1. ...`, `2. ...`) is parsed as one card side.
Questions and answers are matched by number order.

## Run locally

Use any local static server from this folder. Examples:

- Python: `python -m http.server 8000`
- Node: `npx serve .`

Then open `http://localhost:8000`.

## Extend with more cards

Option 1: Add more blocks to `Deelexamen` using the same pattern.

Option 2: Add another source text file and include it in `APP_CONFIG.sourceFiles` in
`assets/js/config.js`.

Example:

```js
const APP_CONFIG = {
  sourceFiles: ["flashcards/Deelexamen", "flashcards/MyExtraCards.txt"],
  qaSourceBases: [
    "flashcards/Infrastructure",
    "flashcards/Main",
    "flashcards/DistributedServices",
  ],
  quizFiles: ["quizzes/examenvragen-it-law.md"],
  customCardsStorageKey: "flashcards.custom.cards.v1",
  uiSettingsStorageKey: "flashcards.ui.settings.v1",
};
```

If you add `Architecture.questions.txt` and `Architecture.answers.txt`, add
`"flashcards/Architecture"` to `qaSourceBases`.

Option 3: Use the add-card form in the UI. These cards are stored in browser local storage.
