'use client';

import { useState } from 'react';
import GeminiStars from '@/components/GeminiStars';
import ClientWrapper from '@/components/ClientWrapper';

export default function Home() {
  const [activeView, setActiveView] = useState<'landing' | 'github-import' | 'app'>(
    () => {
      // If URL has a hash, go directly to app
      if (typeof window !== 'undefined' && window.location.hash) {
        return 'app';
      }
      return 'landing';
    }
  );

  // Once we leave the landing page, render the full app
  if (activeView === 'github-import') {
    // Set hash so the app opens directly on the GitHub import page
    if (typeof window !== 'undefined') {
      window.location.hash = 'github-import';
    }
    return <ClientWrapper />;
  }

  if (activeView === 'app') {
    return <ClientWrapper />;
  }

  return (
    <div className="relative min-h-screen bg-black text-white flex items-center justify-center overflow-hidden">
      {/* Dim Aurora Lights Effect */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Realistic Dense Starfield */}
      <GeminiStars />

      {/* Content Container */}
      <div className="relative z-10 flex flex-col gap-8 items-center justify-center">
        
        {/* Button 1 — Import from GitHub */}
        <button
          onClick={() => setActiveView('github-import')}
          className="px-14 py-5 rounded-full border border-white/80 bg-[#0c1222] text-white text-2xl font-medium tracking-wider transition-all duration-300 hover:scale-[1.02] hover:border-white cursor-pointer hover:bg-[#0f1830] hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]"
        >
          Import from Github
        </button>
        
        {/* Button 2 — Import from Device (opens dashboard) */}
        <button
          onClick={() => setActiveView('app')}
          className="px-14 py-5 rounded-full border border-white/80 bg-[#0c1222] text-white text-2xl font-medium tracking-wider transition-all duration-300 hover:scale-[1.02] hover:border-white cursor-pointer hover:bg-[#0f1830] hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]"
        >
          Import from Device
        </button>

      </div>
    </div>
  );
}
