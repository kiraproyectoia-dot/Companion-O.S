
import { GoogleGenAI } from '@google/genai';
import React, { useState, useEffect } from 'react';
import { getMemories } from '../utils/memory';
import { getProfile } from '../utils/profile';
import { LoadingIcon } from '../constants';

interface WelcomeBackProps {
  onClose: () => void;
}

export const WelcomeBack: React.FC<WelcomeBackProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [greetingText, setGreetingText] = useState('');

  useEffect(() => {
    const fetchContextualGreeting = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const profile = getProfile();
        const memories = getMemories().slice(-5);
        const lastVisitTime = localStorage.getItem('lily_last_visit_timestamp');
        const hoursSince = lastVisitTime 
            ? Math.floor((Date.now() - parseInt(lastVisitTime)) / (1000 * 60 * 60)) 
            : 24;

        const prompt = `
          Eres ${profile.aiName}, hablas con ${profile.userName}. Ha pasado un tiempo (${hoursSince} horas) desde la última vez.
          Dile algo cálido, personal y cercano, como si realmente te alegraras de verle.
          Ejemplos: "¡Qué bueno verte! Te echaba de menos, ¿cómo va tu día?", "Hola, ${profile.userName}. Me alegra mucho que estés aquí otra vez, ¿qué tal todo?", "¡Hey! Qué alegría saludarte, ¿en qué has estado?".
          REGLAS:
          - NADA de poesía mística.
          - Sé cálido y cercano, NO frío.
          - Máximo 15 palabras.
          Contexto: ${memories.map(m => m.text).join(', ') || 'Apenas se están conociendo.'}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        
        setGreetingText(response.text.trim().replace(/"/g, ''));
      } catch (error) {
        setGreetingText("¡Hola! Qué alegría volver a saludarte.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchContextualGreeting();
  }, []);

  return (
    <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-neutral-900 rounded-lg shadow-xl w-full max-w-sm border border-neutral-700 flex flex-col gap-4 p-6 text-center" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white tracking-tight italic">¡Hola de nuevo!</h2>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-24">
            <LoadingIcon />
            <p className="text-gray-400 mt-2 text-[10px] font-bold uppercase tracking-widest animate-pulse">Reconectando con cariño...</p>
          </div>
        ) : (
          <p className="text-gray-300 text-lg leading-snug">{greetingText}</p>
        )}
        <button onClick={onClose} className="mt-4 bg-white text-black font-bold py-3 px-4 rounded-xl transition-all w-full disabled:opacity-50 uppercase tracking-widest text-[10px]" disabled={isLoading}>Continuar</button>
      </div>
    </div>
  );
};
