import React, { useState } from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AircraftCalibrationStudio } from './components/aircraft-calibration/AircraftCalibrationStudio';
import { TruckAssemblyCalibrationStudio } from './components/truck-calibration/TruckAssemblyCalibrationStudio';
import { ForkliftDiagnosticViewer } from './components/diagnostic/ForkliftDiagnosticViewer';
import { CinematicScrollExperience } from './components/cinematic/CinematicScrollExperience';

export default function App() {
  // Support URL param ?mode=aircraft-calibration (default), ?mode=cinematic, ?mode=truck-calibration, ?mode=diagnostic
  const [viewMode, setViewMode] = useState<'aircraft-calibration' | 'truck-calibration' | 'cinematic' | 'diagnostic'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'cinematic') return 'cinematic';
      if (mode === 'diagnostic') return 'diagnostic';
      if (mode === 'truck-calibration') return 'truck-calibration';
      if (mode === 'aircraft-calibration' || mode === 'aircraft') return 'aircraft-calibration';
    }
    // Default to the main cinematic experience containing the calibrated 3D journey
    return 'cinematic';
  });

  return (
    <ErrorBoundary fallbackTitle="MERIDIANO 3D Scene Runtime Error">
      <main className="w-full min-h-screen bg-[#090d16] text-slate-100">
        {viewMode === 'aircraft-calibration' && (
          <AircraftCalibrationStudio
            onSwitchToCinematic={() => setViewMode('cinematic')}
            onSwitchToTruck={() => setViewMode('truck-calibration')}
          />
        )}
        {viewMode === 'truck-calibration' && (
          <TruckAssemblyCalibrationStudio />
        )}
        {viewMode === 'cinematic' && (
          <CinematicScrollExperience onSwitchToDiagnostic={() => setViewMode('aircraft-calibration')} />
        )}
        {viewMode === 'diagnostic' && (
          <ForkliftDiagnosticViewer onSwitchToCinematic={() => setViewMode('cinematic')} />
        )}
      </main>
    </ErrorBoundary>
  );
}
