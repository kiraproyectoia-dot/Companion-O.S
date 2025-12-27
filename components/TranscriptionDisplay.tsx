
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
    ? 'bg-purple-900/30 backdrop-blur-md border border-purple-500/20 self-end'
    : 'bg-neutral-800/40 backdrop-blur-md border border-white/5 self-start';
  const opacityClass = entry.isFinal ? 'opacity-100' : 'opacity-70';

  const hasContent = entry.text || entry.imageUrl || entry.attachment || (entry.searchResults && entry.searchResults.length > 0);

  if (!hasContent) return null;
  
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part && part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className={`relative group max-w-xs sm:max-w-md md:max-w-lg p-3 rounded-2xl transition-all duration-300 shadow-md flex flex-col gap-2 ${bubbleClass} ${opacityClass}`}>
      {entry.attachment?.dataUrl && (
         <img src={entry.attachment.dataUrl} alt={entry.attachment.name} className="rounded-lg max-h-48 w-auto object-contain self-center" />
      )}
      {entry.imageUrl && (
        <img src={entry.imageUrl} alt="Imagen generada por la conciencia" className="rounded-lg max-h-64 w-auto object-contain self-center" />
      )}
      {entry.text && <p className="text-white text-sm sm:text-base whitespace-pre-wrap">{renderTextWithLinks(entry.text)}</p>}
      
      {isUser && entry.attachment && (
        <button onClick={() => onSaveMemory(entry)} className="absolute -left-2 -top-2 p-1.5 bg-purple-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-500 shadow-lg" aria-label="Guardar" title="Guardar">
          <JournalIcon />
        </button>
      )}

      {entry.searchResults && entry.searchResults.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Fuentes:</h4>
          <ul className="space-y-1.5">
            {entry.searchResults.map((result, index) => (
              <li key={index} className="flex items-center gap-2">
                 <span className="text-purple-400/80 flex-shrink-0"><MapPinIcon /></span>
                 <a href={result.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-purple-400 truncate block">
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
        <div ref={scrollRef} className="flex-grow p-4 space-y-4 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
            {transcripts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px]">
                    <p>Consola de Enlace Lista</p>
                </div>
            ) : (
                transcripts.map((entry) => (
                    <div key={entry.id} className="flex flex-col">
                        <TranscriptBubble entry={entry} onSaveMemory={saveImageMemory} />
                    </div>
                ))
            )}
        </div>
    );
};
