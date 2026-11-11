import React from 'react';
import { Film } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-white/10 bg-carbon-950/80 py-10 text-xs text-gray-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-cinema-red" />
          <span className="font-bold text-gray-300">Voidflix Anime Cinema</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
        <p className="text-center sm:text-right text-[11px] text-gray-500 max-w-md">
          Voidflix is an educational anime player demonstration. All video manifests are hosted by third parties.
        </p>
      </div>
    </footer>
  );
};
