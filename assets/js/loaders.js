import {
  getDeckNameFromSourceFile,
  parseFlashcardsFromText,
  parseNumberedEntries,
  parseQuizQuestionsFromMarkdown,
} from "./parsers.js";

export async function loadCardsFromSourceFiles(fileNames) {
  const allCards = [];
  const errors = [];

  for (const fileName of fileNames) {
    try {
      const response = await fetch(fileName);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${fileName}: ${response.status}`);
      }

      const text = await response.text();
      const deck = getDeckNameFromSourceFile(fileName);
      const cards = parseFlashcardsFromText(text).map((card) => ({
        ...card,
        source: fileName,
        deck,
      }));
      allCards.push(...cards);
    } catch (error) {
      errors.push(`${fileName} (${error.message})`);
    }
  }

  return { cards: allCards, errors };
}

export async function loadCardsFromPairedSourceFiles(baseNames) {
  const allCards = [];
  const errors = [];

  for (const baseName of baseNames) {
    const questionsFileName = `${baseName}.questions.txt`;
    const answersFileName = `${baseName}.answers.txt`;

    try {
      const [questionsResponse, answersResponse] = await Promise.all([
        fetch(questionsFileName),
        fetch(answersFileName),
      ]);

      if (!questionsResponse.ok) {
        throw new Error(`Failed to fetch ${questionsFileName}: ${questionsResponse.status}`);
      }

      if (!answersResponse.ok) {
        throw new Error(`Failed to fetch ${answersFileName}: ${answersResponse.status}`);
      }

      const [questionsText, answersText] = await Promise.all([
        questionsResponse.text(),
        answersResponse.text(),
      ]);

      const questions = parseNumberedEntries(questionsText);
      const answers = parseNumberedEntries(answersText, { isAnswerFile: true });
      const pairCount = Math.min(questions.length, answers.length);

      for (let index = 0; index < pairCount; index += 1) {
        allCards.push({
          question: questions[index],
          answer: answers[index],
          source: `${questionsFileName} + ${answersFileName}`,
          deck: getDeckNameFromSourceFile(baseName),
        });
      }

      if (questions.length !== answers.length) {
        errors.push(
          `${baseName}: ${questions.length} questions but ${answers.length} answers (using first ${pairCount}).`,
        );
      }
    } catch (error) {
      errors.push(`${baseName} (${error.message})`);
    }
  }

  return { cards: allCards, errors };
}

export async function loadQuizQuestionsFromFiles(fileNames) {
  const allQuestions = [];
  const errors = [];

  for (const fileName of fileNames) {
    try {
      const response = await fetch(fileName);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${fileName}: ${response.status}`);
      }

      const text = await response.text();
      allQuestions.push(...parseQuizQuestionsFromMarkdown(text, fileName));
    } catch (error) {
      errors.push(`${fileName} (${error.message})`);
    }
  }

  return { questions: allQuestions, errors };
}
