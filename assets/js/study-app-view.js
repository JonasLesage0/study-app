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

export function createQuizAnswerButton(context, answer) {
  const { document, selectedQuizAnswers, isQuizChecked, onToggleAnswer } = context;
  const button = document.createElement("button");
  const isSelected = selectedQuizAnswers.has(answer.letter);

  button.type = "button";
  button.className = "quiz-answer";
  button.dataset.answer = answer.letter;
  button.setAttribute("aria-pressed", String(isSelected));
  button.textContent = `${answer.letter}. ${answer.text}`;

  if (isSelected) {
    button.classList.add("is-selected");
  }

  if (isQuizChecked) {
    button.disabled = true;

    if (answer.isCorrect) {
      button.classList.add("is-correct");
      button.textContent = `JUIST: ${button.textContent}`;
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