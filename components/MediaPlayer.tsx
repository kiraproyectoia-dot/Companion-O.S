

import React from 'react';

// FIX: Removed the local JSX type declaration. A single, consolidated declaration
// has been moved to the root App.tsx component to resolve project-wide type conflicts.

interface MediaPlayerProps {
  url: string;
  onClose: () => void;
}

const createEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    try {
        const parsedUrl = new URL(url);

        // YouTube
        if (parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname === 'youtu.be') {
            let videoId: string | null = null;
            if (parsedUrl.hostname === 'youtu.be') {
                videoId = parsedUrl.pathname.slice(1);
            } else {
                videoId = parsedUrl.searchParams.get('v');
            }
            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            }
        }

        // Spotify
        if (parsedUrl.hostname === 'open.spotify.com' && parsedUrl.pathname.startsWith('/track/')) {
            const trackId = parsedUrl.pathname.split('/track/')[1];
            if (trackId) {
                return `https://open.spotify.com/embed/track/${trackId}`;
            }
        }

        // Apple Music
        if (parsedUrl.hostname === 'music.apple.com' && parsedUrl.pathname.includes('/album/')) {
            const embedUrl = `https://embed.music.apple.com${parsedUrl.pathname}${parsedUrl.search}`;
            return embedUrl;
        }

    } catch (e) {
        console.error("Invalid URL provided to createEmbedUrl:", url, e);
        return null;
    }

    return null; // Return null if not a recognized URL
};

export const MediaPlayer: React.FC<MediaPlayerProps> = ({ url, onClose }) => {
  const embedUrl = createEmbedUrl(url);

  if (!embedUrl) {
    console.error("Invalid or unsupported media URL provided to MediaPlayer:", url);
    onClose(); // Close the player if the URL is invalid
    return null;
  }

  const isMusicPlayer = embedUrl.includes('spotify.com') || embedUrl.includes('music.apple.com');
  const containerClasses = `bg-neutral-900 rounded-lg shadow-xl w-full border border-neutral-700 flex flex-col relative ${isMusicPlayer ? 'max-w-md h-[152px]' : 'max-w-2xl aspect-video'}`;

  return (
    <div 
      className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className={containerClasses}
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute -top-3 -right-3 z-50 bg-red-600 text-white rounded-full h-8 w-8 flex items-center justify-center text-lg font-bold hover:bg-red-500 transition-colors"
          aria-label="Cerrar reproductor"
        >
          &times;
        </button>
        <iframe
          width="100%"
          height={isMusicPlayer ? "152" : "100%"}
          src={embedUrl}
          title="Reproductor de medios"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="rounded-lg"
        ></iframe>
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};
