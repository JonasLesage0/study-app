export function createStudyAppElements() {
  return {
    workspace: document.querySelector("#workspace"),
    sourceStatus: document.querySelector("#source-status"),
    progress: document.querySelector("#progress"),
    modeSelect: document.querySelector("#mode-select"),
    card: document.querySelector("#card"),
    flashcardPanel: document.querySelector("#flashcard-panel"),
    quizPanel: document.querySelector("#quiz-panel"),
    questionText: document.querySelector("#question-text"),
    answerText: document.querySelector("#answer-text"),
    quizQuestionText: document.querySelector("#quiz-question-text"),
    quizAnswers: document.querySelector("#quiz-answers"),
    quizFeedback: document.querySelector("#quiz-feedback"),
    prevBtn: document.querySelector("#prev-btn"),
    flipBtn: document.querySelector("#flip-btn"),
    nextBtn: document.querySelector("#next-btn"),
    quizPrevBtn: document.querySelector("#quiz-prev-btn"),
    quizCheckBtn: document.querySelector("#quiz-check-btn"),
    quizNextBtn: document.querySelector("#quiz-next-btn"),
    shuffleBtn: document.querySelector("#shuffle-btn"),
    reloadBtn: document.querySelector("#reload-btn"),
    clearCustomBtn: document.querySelector("#clear-custom-btn"),
    addCardForm: document.querySelector("#add-card-form"),
    questionInput: document.querySelector("#question-input"),
    answerInput: document.querySelector("#answer-input"),
    showToolsToggle: document.querySelector("#show-tools-toggle"),
    disableFlipAnimationToggle: document.querySelector("#disable-flip-animation-toggle"),
    enableBoldMarkdownToggle: document.querySelector("#enable-bold-markdown-toggle"),
    themeSelect: document.querySelector("#theme-select"),
    partSelect: document.querySelector("#part-select"),
    partField: document.querySelector("#part-field"),
  };
}

export function getDeckNames(cards) {
  return [...new Set(cards.map((card) => card.deck).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function getPartNames(questions) {
  return [...new Set(questions.map((question) => question.part).filter(Boolean))];
}

export function renderBoldMarkdown(element, text, options = {}) {
  const { enabled = true } = options;
  element.textContent = "";

  if (!enabled) {
    element.textContent = String(text ?? "").replaceAll("**", "");
    return;
  }

  const ownerDocument = element.ownerDocument;
  const source = String(text ?? "");
  const boldPattern = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  let match = boldPattern.exec(source);

  while (match) {
    if (match.index > cursor) {
      element.append(ownerDocument.createTextNode(source.slice(cursor, match.index)));
    }

    const strong = ownerDocument.createElement("strong");
    strong.textContent = match[1];
    element.append(strong);
    cursor = match.index + match[0].length;
    match = boldPattern.exec(source);
  }

  if (cursor < source.length) {
    element.append(ownerDocument.createTextNode(source.slice(cursor)));
  }
}

export function createQuizAnswerButton(context, answer) {
  const {
    document,
    selectedQuizAnswers,
    isQuizChecked,
    enableBoldMarkdown,
    onToggleAnswer,
  } = context;
  const button = document.createElement("button");
  const isSelected = selectedQuizAnswers.has(answer.letter);

  button.type = "button";
  button.className = "quiz-answer";
  button.dataset.answer = answer.letter;
  button.setAttribute("aria-pressed", String(isSelected));
  renderBoldMarkdown(button, `${answer.letter}. ${answer.text}`, { enabled: enableBoldMarkdown });

  if (isSelected) {
    button.classList.add("is-selected");
  }

  if (isQuizChecked) {
    button.disabled = true;

    if (answer.isCorrect) {
      button.classList.add("is-correct");
      renderBoldMarkdown(button, `JUIST: ${answer.letter}. ${answer.text}`, {
        enabled: enableBoldMarkdown,
      });
    } else if (isSelected) {
      button.classList.add("is-wrong");
    }
  }

  button.addEventListener("click", () => onToggleAnswer(answer.letter));
  return button;
}

export function getQuizFeedbackState({
  isQuizChecked,
  selectedQuizAnswersCount,
  correctLetters,
  isCurrentQuizAnswerCorrect,
}) {
  if (!isQuizChecked) {
    return {
      checkButtonText: "Check",
      checkButtonDisabled: selectedQuizAnswersCount === 0,
      feedbackText:
        correctLetters.length > 1 ? "Select one or more answers." : "Select an answer.",
    };
  }

  const answerSuffix = correctLetters.length > 1 ? "s" : "";
  const correctAnswerText = correctLetters.join(", ");

  return {
    checkButtonText: "Checked",
    checkButtonDisabled: true,
    feedbackText: isCurrentQuizAnswerCorrect
      ? "Correct."
      : `Not quite. Correct answer${answerSuffix}: ${correctAnswerText}.`,
  };
}
