
import { GenerateContentResponse } from "@google/genai";

export enum TranscriptSource {
  USER = 'user',
  MODEL = 'model',
}

export interface TranscriptEntry {
  id: string; // Unique ID for each entry
  source: TranscriptSource;
  text: string;
  isFinal: boolean;
  imageUrl?: string; // For Lily's generated images
  attachment?: { // For user uploads
    dataUrl: string; // The base64 data URL for preview
    name: string;
    type: string;
  };
  searchResults?: { // For Lily's web search results
    uri: string;
    title: string;
    type: 'web' | 'maps';
  }[];
}

export enum MemoryType {
  FACT = 'fact',
  GOAL = 'goal',
  IMAGE = 'image',
}

export interface Memory {
  id: string;
  text: string;
  imageUrl?: string;
  type: MemoryType;
  timestamp: number;
}

export interface UserProfile {
  userName: string;
  userGender: 'male' | 'female' | 'unspecified';
  aiGender: 'male' | 'female';
  aiName: string; // El nombre que la IA elige para sí misma
  aiVoice: string; // Puck, Charon, Kore, Fenrir, Zephyr
  userSociability: string; // ¿Te consideras una persona sociable?
  userRelation: string;
  aiPersona: string; // Prompt de personalidad compartido
  emotionalState: string;
  lastInteractionTimestamp: number;
  initialSetupCompleted: boolean;
}
