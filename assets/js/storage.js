import { ALL_PARTS_VALUE } from "./config.js";

export class CustomCardStore {
  constructor(storageKey) {
    this.storageKey = storageKey;
  }

  getAll() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  add(card) {
    const cards = this.getAll();
    cards.push(card);
    localStorage.setItem(this.storageKey, JSON.stringify(cards));
  }

  clear() {
    localStorage.removeItem(this.storageKey);
  }
}

export class UiSettingsStore {
  constructor(storageKey) {
    this.storageKey = storageKey;
  }

  get() {
    const defaultSettings = {
      showDeckTools: false,
      selectedMode: "flashcards",
      selectedPart: ALL_PARTS_VALUE,
      disableFlipAnimation: true,
      enableBoldMarkdown: true,
      theme: "navy",
    };

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return defaultSettings;
      }

      const parsed = JSON.parse(raw);
      let selectedPart = defaultSettings.selectedPart;

      if (typeof parsed?.selectedPart === "string" && parsed.selectedPart.trim().length > 0) {
        selectedPart = parsed.selectedPart;
      } else if (typeof parsed?.selectedDeck === "string" && parsed.selectedDeck.trim().length > 0) {
        selectedPart = parsed.selectedDeck;
      } else if (
        typeof parsed?.selectedQuizPart === "string" && parsed.selectedQuizPart.trim().length > 0
      ) {
        selectedPart = parsed.selectedQuizPart;
      }

      return {
        showDeckTools:
          typeof parsed?.showDeckTools === "boolean"
            ? parsed.showDeckTools
            : defaultSettings.showDeckTools,
        selectedMode: parsed?.selectedMode === "quizzes" ? "quizzes" : defaultSettings.selectedMode,
        selectedPart,
        disableFlipAnimation:
          typeof parsed?.disableFlipAnimation === "boolean"
            ? parsed.disableFlipAnimation
            : defaultSettings.disableFlipAnimation,
        enableBoldMarkdown:
          typeof parsed?.enableBoldMarkdown === "boolean"
            ? parsed.enableBoldMarkdown
            : defaultSettings.enableBoldMarkdown,
        theme: this.normalizeTheme(parsed, defaultSettings.theme),
      };
    } catch {
      return defaultSettings;
    }
  }

  normalizeTheme(parsed, fallbackTheme) {
    if (typeof parsed?.theme === "string") {
      const normalizedTheme = parsed.theme.trim();
      if (normalizedTheme === "white" || normalizedTheme === "navy" || normalizedTheme === "dark-modern") {
        return normalizedTheme;
      }
    }

    if (typeof parsed?.darkMode === "boolean") {
      return parsed.darkMode ? "dark-modern" : fallbackTheme;
    }

    return fallbackTheme;
  }

  save(settings) {
    localStorage.setItem(this.storageKey, JSON.stringify(settings));
  }
}
