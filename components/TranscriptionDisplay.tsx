
import React, { useRef, useEffect } from 'react';
import { TranscriptEntry, TranscriptSource } from '../types';
import { JournalIcon, MapPinIcon } from '../constants';

interface TranscriptionDisplayProps {
  transcripts: TranscriptEntry[];
  isReplying: boolean;
  isSpeaking: boolean;
  saveImageMemory: (entry: TranscriptEntry) => void;
}

const TranscriptBubble: React.FC<{ entry: TranscriptEntry; onSaveMemory: (entry: TranscriptEntry) => void; }> = ({ entry, onSaveMemory }) => {
  const isUser = entry.source === TranscriptSource.USER;
  const bubbleClass = isUser
    ? 'bg-purple-900/20 backdrop-blur-md border border-purple-500/30 self-end text-right'
    : 'bg-neutral-800/30 backdrop-blur-md border border-white/5 self-start';
  const opacityClass = entry.isFinal ? 'opacity-100' : 'opacity-70';

  const hasContent = entry.text || entry.imageUrl || entry.attachment || (entry.searchResults && entry.searchResults.length > 0);

  if (!hasContent) return null;
  
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part && part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline decoration-purple-500/50 underline-offset-4 transition-colors">
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className={`relative group max-w-[85%] sm:max-w-md md:max-w-lg p-4 rounded-2xl transition-all duration-300 shadow-xl flex flex-col gap-3 ${bubbleClass} ${opacityClass}`}>
      {entry.attachment?.dataUrl && (
         <img src={entry.attachment.dataUrl} alt={entry.attachment.name} className="rounded-xl max-h-48 w-auto object-contain self-center border border-white/10" />
      )}
      {entry.imageUrl && (
        <img src={entry.imageUrl} alt="Imagen generada por Ly-Os" className="rounded-xl max-h-64 w-auto object-contain self-center border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]" />
      )}
      {entry.text && <p className="text-white/90 text-sm leading-relaxed tracking-tight">{renderTextWithLinks(entry.text)}</p>}
      
      {isUser && entry.attachment && (
        <button onClick={() => onSaveMemory(entry)} className="absolute -left-3 -top-3 p-2 bg-purple-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.5)] scale-90 group-hover:scale-100" aria-label="Guardar" title="Guardar en Memoria">
          <JournalIcon />
        </button>
      )}

      {entry.searchResults && entry.searchResults.length > 0 && (
        <div className="mt-2 pt-3 border-t border-white/5 space-y-2 text-left">
          <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">Fuentes de Sincronía:</h4>
          <ul className="space-y-2">
            {entry.searchResults.map((result, index) => (
              <li key={index} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                 <span className="text-purple-400 flex-shrink-0 scale-75"><MapPinIcon /></span>
                 <a href={result.uri} target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-400 hover:text-purple-300 truncate block font-medium">
                  {result.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ transcripts, isReplying, isSpeaking, saveImageMemory }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [transcripts, isReplying, isSpeaking]);

    return (
        <div ref={scrollRef} className="flex-grow p-6 space-y-6 overflow-y-auto pr-3 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
            {transcripts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-20">
                    <div className="w-12 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
                    <p className="text-gray-500 font-black uppercase tracking-[0.5em] text-[10px]">Núcleo Ly-Os Operativo</p>
                    <div className="w-12 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
                </div>
            ) : (
                transcripts.map((entry) => (
                    <div key={entry.id} className="flex flex-col animate-fade-in">
                        <TranscriptBubble entry={entry} onSaveMemory={saveImageMemory} />
                    </div>
                ))
            )}
        </div>
    );
};
