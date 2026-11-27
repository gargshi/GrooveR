import React, { useState } from 'react';
import { Disc3 } from 'lucide-react';

interface CoverArtProps {
  src?: string;
  alt: string;
  accentColor?: string;
  className?: string;
  iconSize?: string;
}

export const CoverArt: React.FC<CoverArtProps> = ({
  src,
  alt,
  accentColor = '#2E8BFF',
  className = 'w-12 h-12 rounded-xl',
  iconSize = 'w-5 h-5',
}) => {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center bg-zinc-200/80 dark:bg-[#181C24] border border-zinc-300/70 dark:border-white/[0.07] shrink-0 ${className}`}
        style={{
          backgroundImage: `radial-gradient(circle at 25% 20%, ${accentColor}33, transparent 70%)`,
        }}
        aria-label={alt}
      >
        <Disc3 className={`${iconSize} text-zinc-500 dark:text-zinc-400`} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-zinc-200 dark:bg-[#14171F] shrink-0 ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setErrored(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
};
