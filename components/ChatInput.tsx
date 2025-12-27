
import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, AttachmentIcon } from '../constants';

interface ChatInputProps {
    onSendMessage: (payload: { message: string; attachment?: { dataUrl: string; name: string; type: string; } }) => void;
    isReplying: boolean;
    externalFile?: { dataUrl: string; name: string; type: string; } | null;
    onExternalFileClear?: () => void;
}

const placeholders = [
    "Escribe un mensaje o adjunta un archivo...",
    "Puedes pedirme que dibuje algo para ti...",
    "Prueba a decir: 'Busca las últimas noticias'",
    "¿Sabías que puedo cantar? Pídemelo.",
  ];

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isReplying, externalFile, onExternalFileClear }) => {
    const [text, setText] = useState('');
    const [attachment, setAttachment] = useState<{ dataUrl: string; name: string; type: string; } | null>(null);
    const [placeholder, setPlaceholder] = useState(placeholders[0]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (externalFile) setAttachment(externalFile);
    }, [externalFile]);

    useEffect(() => {
        if (isReplying) {
            setPlaceholder("Escuchando tus pensamientos...");
        } else {
            setPlaceholder(placeholders[0]);
            const interval = setInterval(() => {
                setPlaceholder(current => {
                    const idx = placeholders.indexOf(current);
                    return placeholders[(idx + 1) % placeholders.length];
                });
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [isReplying]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                setAttachment({
                    dataUrl: loadEvent.target?.result as string,
                    name: file.name,
                    type: file.type,
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClearAttachment = () => {
        setAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (onExternalFileClear) onExternalFileClear();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if ((text.trim() || attachment) && !isReplying) {
            onSendMessage({ message: text, attachment: attachment || undefined });
            setText('');
            handleClearAttachment();
        }
    };
    
    return (
        <div className="flex-shrink-0 p-4 border-t border-white/5">
            {attachment && (
                <div className="mb-2 flex items-center justify-between bg-neutral-800 p-2 rounded-lg text-sm animate-fade-in">
                   <div className="flex items-center gap-2 overflow-hidden">
                     {attachment.type.startsWith('image/') 
                        ? <img src={attachment.dataUrl} alt="preview" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        : <div className="w-8 h-8 bg-purple-900 flex items-center justify-center rounded font-bold text-xs">DOC</div>
                     }
                     <span className="text-gray-300 truncate">{attachment.name}</span>
                   </div>
                   <button onClick={handleClearAttachment} className="text-gray-400 hover:text-white font-bold text-lg px-2">&times;</button>
                </div>
            )}
            <form onSubmit={handleSubmit} className={isReplying ? 'opacity-50' : ''}>
                <div className="relative flex items-center">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,text/plain,application/pdf" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-400 hover:text-white hover:bg-neutral-700 transition-colors" disabled={isReplying}>
                        <AttachmentIcon />
                    </button>
                    <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="w-full bg-gray-900/50 border border-neutral-700 rounded-full py-2 pl-12 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all" autoComplete="off" disabled={isReplying} />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-neutral-700 hover:bg-neutral-600 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors" disabled={(!text.trim() && !attachment) || isReplying}>
                        <SendIcon />
                    </button>
                </div>
            </form>
        </div>
    );
};
