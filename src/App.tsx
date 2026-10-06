import React from 'react';
import { CinematicScrollExperience } from './components/cinematic/CinematicScrollExperience';

export default function App() {
  return (
    <main className="w-full min-h-screen bg-[#040711] text-white">
      {/* FULL-SCREEN SCROLL-CONTROLLED CINEMATIC ARCHITECTURE */}
      <CinematicScrollExperience />
    </main>
  );
}
