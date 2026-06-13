import { ALL_PARTS_VALUE, CUSTOM_DECK_NAME } from "./config.js";
import {
  loadCardsFromPairedSourceFiles,
  loadCardsFromSourceFiles,
  loadQuizQuestionsFromFiles,
} from "./loaders.js";
import { startsWithVraag } from "./parsers.js";
import { CustomCardStore, UiSettingsStore } from "./storage.js";
import {
  createQuizAnswerButton,
  createStudyAppElements,
  getDeckNames,
  getPartNames,
  getQuizFeedbackState,
  renderBoldMarkdown,
} from "./study-app-view.js";

export class StudyApp {
  constructor(config) {
    this.config = config;
    this.cardStore = new CustomCardStore(config.customCardsStorageKey);
    this.uiSettingsStore = new UiSettingsStore(config.uiSettingsStorageKey);

    this.allCards = [];
    this.cards = [];
    this.allQuizQuestions = [];
    this.quizQuestions = [];
    this.lastErrors = [];
    this.lastQuizErrors = [];
    this.lastSourceCardCount = 0;
    this.lastCustomCardCount = 0;
    this.lastQuizQuestionCount = 0;
    this.currentIndex = 0;
    this.currentQuizIndex = 0;
    this.isFlipped = false;
    this.selectedQuizAnswers = new Set();
    this.isQuizChecked = false;
    this.uiSettings = this.uiSettingsStore.get();
    this.elements = createStudyAppElements();
  }

  async init() {
    this.applyUiSettings();
    this.bindEvents();
    await this.reloadDeck();
  }

  bindEvents() {
    this.elements.card.addEventListener("click", () => this.flipCard());
    this.elements.flipBtn.addEventListener("click", () => this.flipCard());
    this.elements.nextBtn.addEventListener("click", () => this.nextCard());
    this.elements.prevBtn.addEventListener("click", () => this.prevCard());
    this.elements.quizNextBtn.addEventListener("click", () => this.nextQuizQuestion());
    this.elements.quizPrevBtn.addEventListener("click", () => this.prevQuizQuestion());
    this.elements.quizCheckBtn.addEventListener("click", () => this.checkQuizAnswer());

    this.elements.shuffleBtn.addEventListener("click", () => this.shuffleDeck());
    this.elements.reloadBtn.addEventListener("click", async () => {
      await this.reloadDeck();
    });

    this.elements.showToolsToggle.addEventListener("change", (event) => {
      this.uiSettings.showDeckTools = event.target.checked;
      this.uiSettingsStore.save(this.uiSettings);
      this.applyUiSettings();
    });

    this.elements.disableFlipAnimationToggle.addEventListener("change", (event) => {
      this.uiSettings.disableFlipAnimation = event.target.checked;
      this.uiSettingsStore.save(this.uiSettings);
      this.applyUiSettings();
    });

    this.elements.enableBoldMarkdownToggle.addEventListener("change", (event) => {
      this.uiSettings.enableBoldMarkdown = event.target.checked;
      this.uiSettingsStore.save(this.uiSettings);
      this.render();
    });

    this.elements.themeSelect.addEventListener("change", (event) => {
      this.uiSettings.theme = event.target.value;
      this.uiSettingsStore.save(this.uiSettings);
      this.applyUiSettings();
    });

    this.elements.modeSelect.addEventListener("change", (event) => {
      this.uiSettings.selectedMode = event.target.value;
      this.uiSettingsStore.save(this.uiSettings);
      this.applyUiSettings();
      this.updatePartOptions();
      this.applySelectedPartFilter();
      this.render();
      this.updateSourceStatus(this.lastErrors, this.lastSourceCardCount, this.lastCustomCardCount);
    });

    this.elements.partSelect.addEventListener("change", (event) => {
      this.uiSettings.selectedPart = event.target.value;
      this.uiSettingsStore.save(this.uiSettings);
      this.applySelectedPartFilter();
      this.updateSourceStatus(this.lastErrors, this.lastSourceCardCount, this.lastCustomCardCount);
    });

    this.elements.clearCustomBtn.addEventListener("click", async () => {
      if (!confirm("Remove all custom cards?")) {
        return;
      }

      this.cardStore.clear();
      await this.reloadDeck();
    });

    this.elements.addCardForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const rawQuestion = this.elements.questionInput.value.trim();
      const rawAnswer = this.elements.answerInput.value.trim();

      if (!rawQuestion || !rawAnswer) {
        return;
      }

      const normalizedQuestion = startsWithVraag(rawQuestion)
        ? rawQuestion
        : `Vraag: ${rawQuestion}`;

      this.cardStore.add({
        question: normalizedQuestion,
        answer: rawAnswer,
        source: "custom",
        deck: CUSTOM_DECK_NAME,
      });

      this.elements.addCardForm.reset();
      this.uiSettings.selectedPart = CUSTOM_DECK_NAME;
      this.uiSettingsStore.save(this.uiSettings);
      await this.reloadDeck();

      if (this.cards.length > 0) {
        this.currentIndex = this.cards.length - 1;
        this.isFlipped = false;
        this.render();
      }
    });

    globalThis.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        this.uiSettings.selectedMode === "quizzes" ? this.nextQuizQuestion() : this.nextCard();
      }

      if (event.key === "ArrowLeft") {
        this.uiSettings.selectedMode === "quizzes" ? this.prevQuizQuestion() : this.prevCard();
      }

      if (event.key === " " || event.key === "Enter") {
        if (event.target && ["TEXTAREA", "INPUT"].includes(event.target.tagName)) {
          return;
        }

        event.preventDefault();
        if (this.uiSettings.selectedMode === "quizzes") {
          this.checkQuizAnswer();
        } else {
          this.flipCard();
        }
      }
    });
  }

  applyUiSettings() {
    this.elements.modeSelect.value = this.uiSettings.selectedMode;
    this.elements.showToolsToggle.checked = this.uiSettings.showDeckTools;
    this.elements.disableFlipAnimationToggle.checked = this.uiSettings.disableFlipAnimation;
    this.elements.enableBoldMarkdownToggle.checked = this.uiSettings.enableBoldMarkdown;
    this.elements.themeSelect.value = this.uiSettings.theme;
    this.elements.workspace.classList.toggle("focus-mode", !this.uiSettings.showDeckTools);
    document.body.classList.remove("theme-white", "theme-navy", "theme-dark-modern");
    document.body.classList.add(`theme-${this.uiSettings.theme}`);
    document.documentElement.style.colorScheme =
      this.uiSettings.theme === "white" ? "light" : "dark";
    document.body.classList.toggle("no-flip-animation", this.uiSettings.disableFlipAnimation);
    document.body.classList.toggle("quiz-mode", this.uiSettings.selectedMode === "quizzes");
    this.elements.flashcardPanel.hidden = this.uiSettings.selectedMode === "quizzes";
    this.elements.quizPanel.hidden = this.uiSettings.selectedMode !== "quizzes";
    this.elements.partSelect.value = this.uiSettings.selectedPart;
  }

  updatePartOptions() {
    const partNames =
      this.uiSettings.selectedMode === "quizzes"
        ? getPartNames(this.allQuizQuestions)
        : getDeckNames(this.allCards);

    this.elements.partSelect.innerHTML = "";

    const allPartsOption = document.createElement("option");
    allPartsOption.value = ALL_PARTS_VALUE;
    allPartsOption.textContent = "All parts";
    this.elements.partSelect.append(allPartsOption);

    for (const partName of partNames) {
      const option = document.createElement("option");
      option.value = partName;
      option.textContent = partName;
      this.elements.partSelect.append(option);
    }

    if (
      this.uiSettings.selectedPart !== ALL_PARTS_VALUE &&
      !partNames.includes(this.uiSettings.selectedPart)
    ) {
      this.uiSettings.selectedPart = ALL_PARTS_VALUE;
      this.uiSettingsStore.save(this.uiSettings);
    }

    this.elements.partSelect.value = this.uiSettings.selectedPart;
  }

  applySelectedPartFilter() {
    if (this.uiSettings.selectedMode === "quizzes") {
      if (this.uiSettings.selectedPart === ALL_PARTS_VALUE) {
        this.quizQuestions = [...this.allQuizQuestions];
      } else {
        this.quizQuestions = this.allQuizQuestions.filter(
          (question) => question.part === this.uiSettings.selectedPart,
        );
      }

      if (this.quizQuestions.length === 0) {
        this.currentQuizIndex = 0;
      } else {
        this.currentQuizIndex = Math.min(this.currentQuizIndex, this.quizQuestions.length - 1);
      }

      this.selectedQuizAnswers.clear();
      this.isQuizChecked = false;
      this.render();
      return;
    }

    if (this.uiSettings.selectedPart === ALL_PARTS_VALUE) {
      this.cards = [...this.allCards];
    } else {
      this.cards = this.allCards.filter((card) => card.deck === this.uiSettings.selectedPart);
    }

    if (this.cards.length === 0) {
      this.currentIndex = 0;
    } else {
      this.currentIndex = Math.min(this.currentIndex, this.cards.length - 1);
    }

    this.isFlipped = false;
    this.render();
  }

  updateSourceStatus(errors, sourceCardCount, customCardCount) {
    if (this.uiSettings.selectedMode === "quizzes") {
      const selectedPartLabel =
        this.uiSettings.selectedPart === ALL_PARTS_VALUE
          ? "All parts"
          : this.uiSettings.selectedPart;
      const summary = `Showing ${this.quizQuestions.length} of ${this.allQuizQuestions.length} quiz questions (Part: ${selectedPartLabel}).`;

      if (this.lastQuizErrors.length > 0) {
        this.elements.sourceStatus.textContent =
          `${summary} Could not read: ${this.lastQuizErrors.join(", ")}. ` +
          "Open this with a local web server (not file://).";
        return;
      }

      this.elements.sourceStatus.textContent =
        `${summary} Loaded ${this.lastQuizQuestionCount} quiz questions.`;
      return;
    }

    const selectedPartLabel =
      this.uiSettings.selectedPart === ALL_PARTS_VALUE ? "All parts" : this.uiSettings.selectedPart;
    const summary = `Showing ${this.cards.length} of ${this.allCards.length} cards (Part: ${selectedPartLabel}).`;

    if (errors.length > 0) {
      this.elements.sourceStatus.textContent =
        `${summary} Could not read: ${errors.join(", ")}. ` +
        "Open this with a local web server (not file://).";
      return;
    }

    this.elements.sourceStatus.textContent =
      `${summary} Loaded ${sourceCardCount} source cards + ${customCardCount} custom cards.`;
  }

  async reloadDeck() {
    const [singleSourceResult, pairedSourceResult, quizResult] = await Promise.all([
      loadCardsFromSourceFiles(this.config.sourceFiles),
      loadCardsFromPairedSourceFiles(this.config.qaSourceBases),
      loadQuizQuestionsFromFiles(this.config.quizFiles),
    ]);

    const sourceCards = [...singleSourceResult.cards, ...pairedSourceResult.cards];
    const errors = [...singleSourceResult.errors, ...pairedSourceResult.errors];
    const customCards = this.cardStore
      .getAll()
      .map((card) => ({ ...card, source: "custom", deck: card.deck || CUSTOM_DECK_NAME }));

    this.allCards = [...sourceCards, ...customCards];
    this.allQuizQuestions = quizResult.questions;
    this.lastErrors = errors;
    this.lastQuizErrors = quizResult.errors;
    this.lastSourceCardCount = sourceCards.length;
    this.lastCustomCardCount = customCards.length;
    this.lastQuizQuestionCount = quizResult.questions.length;
    this.updatePartOptions();
    this.applySelectedPartFilter();
    this.updateSourceStatus(this.lastErrors, this.lastSourceCardCount, this.lastCustomCardCount);
  }

  render() {
    if (this.uiSettings.selectedMode === "quizzes") {
      this.renderQuiz();
      return;
    }

    const hasCards = this.cards.length > 0;

    if (hasCards) {
      const card = this.cards[this.currentIndex];

      this.elements.progress.textContent = `${this.currentIndex + 1} / ${this.cards.length}`;
      renderBoldMarkdown(this.elements.questionText, card.question, {
        enabled: this.uiSettings.enableBoldMarkdown,
      });
      renderBoldMarkdown(this.elements.answerText, card.answer, {
        enabled: this.uiSettings.enableBoldMarkdown,
      });
      this.elements.card.classList.toggle("is-flipped", this.isFlipped);
      return;
    }

    this.elements.progress.textContent = "0 / 0";
    renderBoldMarkdown(this.elements.questionText, "No cards found in the configured files.", {
      enabled: this.uiSettings.enableBoldMarkdown,
    });
    renderBoldMarkdown(this.elements.answerText, "Add a custom card or verify your source files.", {
      enabled: this.uiSettings.enableBoldMarkdown,
    });
    this.elements.card.classList.remove("is-flipped");
  }

  renderQuiz() {
    if (this.quizQuestions.length === 0) {
      this.elements.progress.textContent = "0 / 0";
      this.elements.quizQuestionText.textContent = "No quiz questions found in the configured files.";
      this.elements.quizAnswers.innerHTML = "";
      this.elements.quizFeedback.textContent = "Choose another part or verify your quiz source files.";
      this.elements.quizCheckBtn.disabled = true;
      return;
    }

    const question = this.quizQuestions[this.currentQuizIndex];
    this.elements.progress.textContent = `${this.currentQuizIndex + 1} / ${this.quizQuestions.length}`;
    renderBoldMarkdown(
      this.elements.quizQuestionText,
      `${question.part} - ${question.number}. ${question.text}`,
      { enabled: this.uiSettings.enableBoldMarkdown },
    );
    this.elements.quizAnswers.innerHTML = "";

    for (const answer of question.answers) {
      this.elements.quizAnswers.append(
        createQuizAnswerButton(
          {
            document,
            selectedQuizAnswers: this.selectedQuizAnswers,
            isQuizChecked: this.isQuizChecked,
            enableBoldMarkdown: this.uiSettings.enableBoldMarkdown,
            onToggleAnswer: (letter) => this.toggleQuizAnswer(letter),
          },
          answer,
        ),
      );
    }

    const correctLetters = question.answers
      .filter((answer) => answer.isCorrect)
      .map((answer) => answer.letter);

    const quizFeedbackState = getQuizFeedbackState({
      isQuizChecked: this.isQuizChecked,
      selectedQuizAnswersCount: this.selectedQuizAnswers.size,
      correctLetters,
      isCurrentQuizAnswerCorrect: this.isCurrentQuizAnswerCorrect(),
    });

    this.elements.quizCheckBtn.textContent = quizFeedbackState.checkButtonText;
    this.elements.quizCheckBtn.disabled = quizFeedbackState.checkButtonDisabled;
    this.elements.quizFeedback.textContent = quizFeedbackState.feedbackText;
  }

  nextCard() {
    if (this.cards.length === 0) {
      return;
    }

    this.currentIndex = (this.currentIndex + 1) % this.cards.length;
    this.isFlipped = false;
    this.render();
  }

  prevCard() {
    if (this.cards.length === 0) {
      return;
    }

    this.currentIndex = (this.currentIndex - 1 + this.cards.length) % this.cards.length;
    this.isFlipped = false;
    this.render();
  }

  flipCard() {
    if (this.cards.length === 0) {
      return;
    }

    this.isFlipped = !this.isFlipped;
    this.render();
  }

  shuffleDeck() {
    if (this.cards.length < 2) {
      return;
    }

    for (let i = this.cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }

    this.currentIndex = 0;
    this.isFlipped = false;
    this.render();
  }

  toggleQuizAnswer(letter) {
    if (this.isQuizChecked || this.quizQuestions.length === 0) {
      return;
    }

    if (this.selectedQuizAnswers.has(letter)) {
      this.selectedQuizAnswers.delete(letter);
    } else {
      this.selectedQuizAnswers.add(letter);
    }

    this.renderQuiz();
  }

  checkQuizAnswer() {
    if (this.quizQuestions.length === 0 || this.selectedQuizAnswers.size === 0) {
      return;
    }

    this.isQuizChecked = true;
    this.renderQuiz();
  }

  isCurrentQuizAnswerCorrect() {
    const question = this.quizQuestions[this.currentQuizIndex];
    const correctLetters = question.answers
      .filter((answer) => answer.isCorrect)
      .map((answer) => answer.letter)
      .sort((left, right) => left.localeCompare(right));
    const selectedLetters = [...this.selectedQuizAnswers].sort((left, right) =>
      left.localeCompare(right),
    );

    return (
      correctLetters.length === selectedLetters.length &&
      correctLetters.every((letter, index) => letter === selectedLetters[index])
    );
  }

  nextQuizQuestion() {
    if (this.quizQuestions.length === 0) {
      return;
    }

    this.currentQuizIndex = (this.currentQuizIndex + 1) % this.quizQuestions.length;
    this.selectedQuizAnswers.clear();
    this.isQuizChecked = false;
    this.renderQuiz();
  }

  prevQuizQuestion() {
    if (this.quizQuestions.length === 0) {
      return;
    }

    this.currentQuizIndex =
      (this.currentQuizIndex - 1 + this.quizQuestions.length) % this.quizQuestions.length;
    this.selectedQuizAnswers.clear();
    this.isQuizChecked = false;
    this.renderQuiz();
  }
}
