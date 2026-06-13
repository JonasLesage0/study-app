export function startsWithVraag(line) {
  return /^\s*Vraag\b/i.test(line);
}

export function isNumberedLine(line) {
  return /^\s*\d+\.\s+/.test(line);
}

export function containsIcon(line) {
  return /\p{Extended_Pictographic}/u.test(line);
}

export function getDeckNameFromSourceFile(fileName) {
  const fileNamePart = fileName.split(/[\\/]/).at(-1) || fileName;
  return fileNamePart.replace(/\.txt$/i, "");
}

export function stripMarkdownFormatting(text) {
  return text
    .replaceAll("*", "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export function normalizeCardSideText(text) {
  return text
    .replaceAll("\r\n", "\n")
    .replaceAll(/\n\s*\.\s*(?=\S)/g, ". ")
    .replaceAll(/\s+\./g, ".")
    .replaceAll(/[ \t]+\n/g, "\n")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();
}

export function collectNumberedParserLines(text, options = {}) {
  const { isAnswerFile = false } = options;
  const normalized = text.replaceAll("\r\n", "\n");
  const result = [];
  let skipNextNonNumberedLine = false;

  for (const line of normalized.split("\n")) {
    if (containsIcon(line)) {
      continue;
    }

    if (isAnswerFile && /^\s*-{4,}/.test(line)) {
      skipNextNonNumberedLine = true;
      continue;
    }

    if (skipNextNonNumberedLine && !isNumberedLine(line)) {
      skipNextNonNumberedLine = false;
      continue;
    }

    if (skipNextNonNumberedLine && isNumberedLine(line)) {
      skipNextNonNumberedLine = false;
    }

    result.push(line);
  }

  return result;
}

export function parseNumberedEntries(text, options = {}) {
  const lines = collectNumberedParserLines(text, options);
  const entries = [];
  let currentEntry = [];

  for (const line of lines) {
    if (isNumberedLine(line)) {
      if (currentEntry.length > 0) {
        entries.push(normalizeCardSideText(currentEntry.join("\n")));
      }

      currentEntry = [line.trim()];
      continue;
    }

    if (currentEntry.length > 0) {
      currentEntry.push(line);
    }
  }

  if (currentEntry.length > 0) {
    entries.push(normalizeCardSideText(currentEntry.join("\n")));
  }

  return entries.filter(Boolean);
}

export function parseBlockToCard(block) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !containsIcon(line));

  const questionLines = [];
  const answerLines = [];

  let questionStarted = false;
  let answerStarted = false;

  for (const line of lines) {
    if (!questionStarted && startsWithVraag(line)) {
      questionStarted = true;
      questionLines.push(line);
      continue;
    }

    if (!questionStarted) {
      continue;
    }

    if (!answerStarted && startsWithVraag(line)) {
      questionLines.push(line);
      continue;
    }

    answerStarted = true;
    answerLines.push(line);
  }

  if (!questionLines.length || !answerLines.length) {
    return null;
  }

  return {
    question: normalizeCardSideText(questionLines.join("\n")),
    answer: normalizeCardSideText(answerLines.join("\n")),
    source: "file",
  };
}

export function parseFlashcardsFromText(text) {
  const normalized = text.replaceAll("\r\n", "\n").trim();
  if (!normalized) {
    return [];
  }

  const blocks = normalized.split(/\n\s*\n+/);
  return blocks.map((block) => parseBlockToCard(block)).filter(Boolean);
}

function isQuizPartHeading(line) {
  return /^deel\s+\d+(?:\s+.+)?$/i.test(line);
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function removeTrailingUnmatchedBold(text) {
  const boldMarkers = text.match(/\*\*/g) || [];

  if (boldMarkers.length % 2 === 1 && text.endsWith("**")) {
    return text.slice(0, -2).trim();
  }

  return text;
}

function getMarkdownQuestionText(line, number, fallbackText) {
  const numberPattern = escapeRegExp(number);
  const questionPrefixPattern = new RegExp(
    String.raw`^\*{0,2}\s*${numberPattern}\s*(?:\*+)?\s*\.\s*(?:\*+)?\s*`,
  );
  const markdownText = line.replace(questionPrefixPattern, "").trim();

  return removeTrailingUnmatchedBold(markdownText || fallbackText);
}

function appendQuizLine(currentQuestion, currentAnswer, markdownLine) {
  if (currentAnswer) {
    currentAnswer.text = `${currentAnswer.text} ${markdownLine}`.trim();
    return;
  }

  if (currentQuestion) {
    currentQuestion.text = `${currentQuestion.text} ${markdownLine}`.trim();
  }
}

export function parseQuizQuestionsFromMarkdown(text, source) {
  const normalized = text.replaceAll("\r\n", "\n");
  const questions = [];
  let currentPart = "Unsorted";
  let currentQuestion = null;
  let currentAnswer = null;
  let nextAnswerIsCorrect = false;

  const finishQuestion = () => {
    if (!currentQuestion) {
      return;
    }

    if (currentQuestion.text && currentQuestion.answers.length > 0) {
      questions.push(currentQuestion);
    }

    currentQuestion = null;
    currentAnswer = null;
  };

  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      currentAnswer = null;
      continue;
    }

    const plainLine = stripMarkdownFormatting(line);

    if (isQuizPartHeading(plainLine)) {
      finishQuestion();
      currentPart = plainLine.replace(/^deel/i, "DEEL");
      continue;
    }

    const questionMatch = plainLine.match(/^(\d+)\.\s+(.+)/);

    if (questionMatch) {
      finishQuestion();
      currentQuestion = {
        id: `${source}-${currentPart}-${questionMatch[1]}`,
        number: questionMatch[1],
        text: getMarkdownQuestionText(line, questionMatch[1], questionMatch[2]),
        part: currentPart,
        source,
        answers: [],
      };
      continue;
    }

    const answerMatch = plainLine.match(/^(JUIST:\s*)?([A-Z])\.\s+(.+)/i);

    if (answerMatch && currentQuestion) {
      const markdownAnswerMatch = line.match(/^(JUIST:\s*)?([A-Z])\.\s+(.+)/i);
      const answerText = (markdownAnswerMatch?.[3] || answerMatch[3]).trim();

      if (/^JUIST:?\s*$/i.test(answerText)) {
        nextAnswerIsCorrect = true;
        currentAnswer = null;
        continue;
      }

      currentAnswer = {
        letter: answerMatch[2].toUpperCase(),
        text: answerText,
        isCorrect: Boolean(answerMatch[1]) || nextAnswerIsCorrect,
      };
      nextAnswerIsCorrect = false;
      currentQuestion.answers.push(currentAnswer);
      continue;
    }

    appendQuizLine(currentQuestion, currentAnswer, line);
  }

  finishQuestion();
  return questions;
}
