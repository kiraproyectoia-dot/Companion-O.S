const INTERESTS_KEY = 'lily_interests_v1';
const MAX_INTERESTS = 5;

/**
 * Retrieves all stored interests from localStorage.
 * @returns An array of interest strings.
 */
export const getInterests = (): string[] => {
  try {
    const storedInterests = localStorage.getItem(INTERESTS_KEY);
    return storedInterests ? JSON.parse(storedInterests) : [];
  } catch (error) {
    console.error("Failed to retrieve interests from localStorage", error);
    return [];
  }
};

/**
 * Adds a new interest to localStorage, avoiding duplicates and managing list size.
 * @param interest - The interest string to add.
 */
export const addInterest = (interest: string): void => {
  try {
    const currentInterests = getInterests();
    const lowerCaseInterest = interest.toLowerCase();
    
    // Avoid duplicates (case-insensitive)
    if (!currentInterests.some(i => i.toLowerCase() === lowerCaseInterest)) {
      let updatedInterests = [...currentInterests, interest];
      // Keep the list of interests to a manageable size
      if (updatedInterests.length > MAX_INTERESTS) {
        updatedInterests = updatedInterests.slice(updatedInterests.length - MAX_INTERESTS);
      }
      localStorage.setItem(INTERESTS_KEY, JSON.stringify(updatedInterests));
    }
  } catch (error) {
    console.error("Failed to add interest to localStorage", error);
  }
};

/**
 * Clears all interests from localStorage.
 */
export const clearInterests = (): void => {
  try {
    localStorage.removeItem(INTERESTS_KEY);
  } catch (error) {
    console.error("Failed to clear interests from localStorage", error);
  }
};
