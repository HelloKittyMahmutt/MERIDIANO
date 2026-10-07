import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ForkliftDiagnosticViewer } from './components/diagnostic/ForkliftDiagnosticViewer';
import { CinematicScrollExperience } from './components/cinematic/CinematicScrollExperience';

export default function App() {
  // Support URL param ?mode=diagnostic or ?mode=cinematic, default to cinematic master experience
  const [viewMode, setViewMode] = useState<'diagnostic' | 'cinematic'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'diagnostic') return 'diagnostic';
    }
    return 'cinematic';
  });

  const switchToCinematic = () => {
    setViewMode('cinematic');
    if (typeof window !== 'undefined' && window.history?.pushState) {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'cinematic');
      window.history.pushState({}, '', url.toString());
    }
  };

  const switchToDiagnostic = () => {
    setViewMode('diagnostic');
    if (typeof window !== 'undefined' && window.history?.pushState) {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'diagnostic');
      window.history.pushState({}, '', url.toString());
    }
  };

  return (
    <ErrorBoundary fallbackTitle="MERIDIANO 3D Scene Runtime Error">
      <main className="w-full min-h-screen bg-[#040711] text-white">
        {viewMode === 'diagnostic' ? (
          <ForkliftDiagnosticViewer onSwitchToCinematic={switchToCinematic} />
        ) : (
          <CinematicScrollExperience onSwitchToDiagnostic={switchToDiagnostic} />
        )}
      </main>
    </ErrorBoundary>
  );
}
