import React, { useState } from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { TruckAssemblyCalibrationStudio } from './components/truck-calibration/TruckAssemblyCalibrationStudio';
import { ForkliftDiagnosticViewer } from './components/diagnostic/ForkliftDiagnosticViewer';
import { CinematicScrollExperience } from './components/cinematic/CinematicScrollExperience';

export default function App() {
  // Support URL param ?mode=truck-calibration (default), ?mode=cinematic, ?mode=diagnostic
  const [viewMode, setViewMode] = useState<'truck-calibration' | 'cinematic' | 'diagnostic'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'cinematic') return 'cinematic';
      if (mode === 'diagnostic') return 'diagnostic';
      if (mode === 'truck-calibration') return 'truck-calibration';
    }
    // Default to the Truck Assembly Calibration Studio as requested
    return 'truck-calibration';
  });

  return (
    <ErrorBoundary fallbackTitle="MERIDIANO 3D Scene Runtime Error">
      <main className="w-full min-h-screen bg-[#d1d5db] text-slate-900">
        {viewMode === 'truck-calibration' && (
          <TruckAssemblyCalibrationStudio />
        )}
        {viewMode === 'cinematic' && (
          <CinematicScrollExperience onSwitchToDiagnostic={() => setViewMode('truck-calibration')} />
        )}
        {viewMode === 'diagnostic' && (
          <ForkliftDiagnosticViewer onSwitchToCinematic={() => setViewMode('truck-calibration')} />
        )}
      </main>
    </ErrorBoundary>
  );
}
