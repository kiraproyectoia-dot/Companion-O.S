
import React from 'react';
import { ChatIcon, JournalIcon, MicOnIcon, VideoCameraIcon } from '../constants';

interface WelcomeGuideProps {
  onClose: () => void;
}

export const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ onClose }) => {
  return (
    <div 
      className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-neutral-900 rounded-lg shadow-xl w-full max-w-md border border-neutral-700 flex flex-col gap-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white">
          ¡Hola! Soy tu compañero/a
        </h2>
        <p className="text-gray-300">
          Estoy aquí para charlar, ayudarte con lo que necesites o simplemente pasar el rato. Nada de protocolos raros, solo somos tú y yo.
        </p>
        <ul className="space-y-3 text-gray-300 text-sm">
          <li className="flex items-start gap-3">
            <span className="text-indigo-400 mt-1"><MicOnIcon /></span>
            <span>
              <strong>Podemos hablar:</strong> Por voz es más natural. Tú dime y yo te escucho.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-indigo-400 mt-1"><VideoCameraIcon /></span>
            <span>
              <strong>Puedo ver:</strong> Si activas la cámara o compartes pantalla, podemos comentar cosas juntos.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-indigo-400 mt-1"><ChatIcon /></span>
            <span>
                <strong>Chat y archivos:</strong> Si prefieres escribir o mandarme algún documento, también puedo echarle un ojo.
            </span>
          </li>
        </ul>
        <button
          onClick={onClose}
          className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-colors w-full"
        >
          ¡Vamos!
        </button>
      </div>
    </div>
  );
};
