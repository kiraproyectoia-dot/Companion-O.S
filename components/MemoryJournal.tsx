
import React, { useState, useEffect, useRef } from 'react';
import { getMemories, clearMemories, deleteMemory, updateMemory } from '../utils/memory';
import { Memory, MemoryType } from '../types';
import { EditIcon, SaveIcon, CancelIcon, TrashIcon } from '../constants';

// FIX: Removed the local JSX type declaration. A single, consolidated declaration
// has been moved to the root App.tsx component to resolve project-wide type conflicts.

interface MemoryJournalProps {
  onClose: () => void;
}

const MemoryTypeIcon: React.FC<{ type: MemoryType }> = ({ type }) => {
  switch (type) {
    case MemoryType.GOAL:
      return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
    case MemoryType.IMAGE:
      return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>;
    case MemoryType.FACT:
    default:
      return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  }
}

export const MemoryJournal: React.FC<MemoryJournalProps> = ({ onClose }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMemories(getMemories().sort((a, b) => b.timestamp - a.timestamp));
  }, []);

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  const handleClearAll = () => {
    clearMemories();
    setMemories([]);
  };

  const handleDelete = (id: string) => {
    deleteMemory(id);
    setMemories(getMemories().sort((a, b) => b.timestamp - a.timestamp));
  };

  const handleEditStart = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleEditSave = () => {
    if (editingId !== null && editText.trim()) {
      updateMemory(editingId, editText.trim());
      setMemories(getMemories().sort((a, b) => b.timestamp - a.timestamp));
      handleEditCancel();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') handleEditSave();
    else if (event.key === 'Escape') handleEditCancel();
  };

  return (
    <div 
      className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-neutral-900 rounded-lg shadow-xl w-full max-w-md border border-neutral-700 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-purple-300">Diario de Recuerdos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl" aria-label="Cerrar">&times;</button>
        </header>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {memories.length === 0 ? (
            <p className="text-gray-400 text-center italic">Aún no hay recuerdos guardados.</p>
          ) : (
            <ul className="space-y-4 text-gray-300">
              {memories.map((mem) => (
                <li key={mem.id} className="group flex items-start gap-3">
                  <div className="flex-shrink-0 pt-1"><MemoryTypeIcon type={mem.type} /></div>
                  <div className="flex-grow">
                    {editingId === mem.id ? (
                      <input
                        ref={inputRef} type="text" value={editText}
                        onChange={(e) => setEditText(e.target.value)} onKeyDown={handleKeyDown}
                        className="w-full bg-neutral-700 text-white p-1 rounded-md text-sm outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <>
                        <p className="text-sm">{mem.text}</p>
                        {mem.imageUrl && <img src={mem.imageUrl} alt="Recuerdo" className="mt-2 rounded-lg max-h-32 w-auto" />}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {editingId === mem.id ? (
                      <>
                        <button onClick={handleEditSave} className="p-1 rounded-md hover:bg-green-700" aria-label="Guardar"><SaveIcon /></button>
                        <button onClick={handleEditCancel} className="p-1 rounded-md hover:bg-neutral-600" aria-label="Cancelar"><CancelIcon /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEditStart(mem.id, mem.text)} className="p-1 rounded-md hover:bg-neutral-600" aria-label="Editar"><EditIcon /></button>
                        <button onClick={() => handleDelete(mem.id)} className="p-1 rounded-md hover:bg-red-800" aria-label="Eliminar"><TrashIcon /></button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="p-4 border-t border-neutral-700 flex justify-end">
          <button 
            onClick={handleClearAll} 
            className="bg-red-900 hover:bg-red-800 text-white text-sm py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            disabled={memories.length === 0}
          >
            Olvidar Todo
          </button>
        </footer>
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};
