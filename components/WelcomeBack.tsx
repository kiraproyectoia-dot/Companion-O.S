
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
          Eres ${profile.aiName}, operando dentro de la interfaz Ly-Os. Estás hablando con ${profile.userName}. 
          Han pasado ${hoursSince} horas. Salúdale con calidez a través del sistema.
          Máximo 15 palabras.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        
        setGreetingText(response.text.trim().replace(/"/g, ''));
      } catch (error) {
        setGreetingText("Conexión con Ly-Os restablecida. Hola de nuevo.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchContextualGreeting();
  }, []);

  return (
    <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-neutral-900/60 rounded-3xl shadow-2xl w-full max-w-sm border border-white/5 flex flex-col gap-6 p-8 text-center backdrop-blur-3xl" onClick={e => e.stopPropagation()}>
        <div className="space-y-1">
            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Ly-Os Terminal</h2>
            <p className="text-white text-xl font-light tracking-tight">Vínculo Activo</p>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-20">
            <div className="scale-75 opacity-50"><LoadingIcon /></div>
          </div>
        ) : (
          <p className="text-gray-300 text-base font-light italic leading-relaxed">"{greetingText}"</p>
        )}
        <button onClick={onClose} className="mt-4 bg-white text-black font-black py-4 px-4 rounded-2xl transition-all w-full disabled:opacity-20 uppercase tracking-[0.2em] text-[10px] hover:bg-gray-200" disabled={isLoading}>Establecer Sesión</button>
      </div>
    </div>
  );
};
