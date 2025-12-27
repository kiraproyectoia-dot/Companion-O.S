import { TranscriptEntry } from '../types';

const HISTORY_KEY = 'lily_history_v1';

/**
 * Retrieves the conversation history from localStorage.
 * @returns An array of TranscriptEntry objects.
 */
export const getHistory = (): TranscriptEntry[] => {
  try {
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch (error) {
    console.error("Failed to retrieve history from localStorage", error);
    return [];
  }
};

/**
 * Saves the entire conversation history to localStorage.
 * @param transcripts - The array of TranscriptEntry objects to save.
 */
export const saveHistory = (transcripts: TranscriptEntry[]): void => {
  try {
    const historyString = JSON.stringify(transcripts);
    localStorage.setItem(HISTORY_KEY, historyString);
  } catch (error) {
    console.error("Failed to save history to localStorage", error);
  }
};

/**
 * Clears the conversation history from localStorage.
 */
export const clearHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error("Failed to clear history from localStorage", error);
  }
};
