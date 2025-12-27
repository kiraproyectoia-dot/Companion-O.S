import { Memory, MemoryType } from '../types';

const MEMORY_KEY = 'lily_memories_v2'; // Bumped version for new structure

/**
 * Retrieves all stored memories from localStorage.
 * @returns An array of Memory objects.
 */
export const getMemories = (): Memory[] => {
  try {
    const storedMemories = localStorage.getItem(MEMORY_KEY);
    return storedMemories ? JSON.parse(storedMemories) : [];
  } catch (error) {
    console.error("Failed to retrieve memories from localStorage", error);
    return [];
  }
};

/**
 * Adds a new memory to localStorage.
 * @param memoryData - The partial memory object to add.
 */
export const addMemory = (memoryData: Partial<Omit<Memory, 'id' | 'timestamp'>> & { text: string }): void => {
  try {
    const currentMemories = getMemories();
    const newMemory: Memory = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: memoryData.type || MemoryType.FACT,
      ...memoryData,
    };
    const updatedMemories = [...currentMemories, newMemory];
    localStorage.setItem(MEMORY_KEY, JSON.stringify(updatedMemories));
  } catch (error)
    {
    console.error("Failed to add memory to localStorage", error);
  }
};

/**
 * Deletes a memory by its ID.
 * @param id - The ID of the memory to delete.
 */
export const deleteMemory = (id: string): void => {
  try {
    const currentMemories = getMemories();
    const updatedMemories = currentMemories.filter((mem) => mem.id !== id);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(updatedMemories));
    }
   catch (error) {
    console.error("Failed to delete memory from localStorage", error);
  }
};

/**
 * Updates a memory's text by its ID.
 * @param id - The ID of the memory to update.
 * @param newText - The new text for the memory.
 */
export const updateMemory = (id: string, newText: string): void => {
  try {
    const currentMemories = getMemories();
    const updatedMemories = currentMemories.map(mem =>
      mem.id === id ? { ...mem, text: newText } : mem
    );
    localStorage.setItem(MEMORY_KEY, JSON.stringify(updatedMemories));
    }
   catch (error) {
    console.error("Failed to update memory in localStorage", error);
  }
};

/**
 * Clears all memories from localStorage.
 */
export const clearMemories = (): void => {
  try {
    localStorage.removeItem(MEMORY_KEY);
  } catch (error) {
    console.error("Failed to clear memories from localStorage", error);
  }
};
