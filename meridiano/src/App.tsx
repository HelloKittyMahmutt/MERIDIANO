import React, { useState } from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ContinuousLogisticsJourney } from './components/cinematic/ContinuousLogisticsJourney';
import { OpeningSequenceExperience } from './components/cinematic/OpeningSequenceExperience';
import { CinematicScrollExperience } from './components/cinematic/CinematicScrollExperience';
import { CinematicStoryboardStudio } from './components/storyboard/CinematicStoryboardStudio';
import { AircraftCalibrationStudio } from './components/aircraft-calibration/AircraftCalibrationStudio';
import { TruckAssemblyCalibrationStudio } from './components/truck-calibration/TruckAssemblyCalibrationStudio';
import { ForkliftDiagnosticViewer } from './components/diagnostic/ForkliftDiagnosticViewer';
import { LoadingOperationStudio } from './components/cinematic/LoadingOperationStudio';

export default function App() {
  // Support URL param ?mode=journey (default), ?mode=loading, ?mode=opening, ?mode=cinematic, ?mode=storyboard, ?mode=aircraft-calibration, ?mode=truck-calibration, ?mode=diagnostic
  const [viewMode, setViewMode] = useState<
    'journey' | 'loading' | 'opening' | 'cinematic' | 'storyboard' | 'aircraft-calibration' | 'truck-calibration' | 'diagnostic'
  >(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'loading') return 'loading';
      if (mode === 'journey') return 'journey';
      if (mode === 'opening') return 'opening';
      if (mode === 'cinematic') return 'cinematic';
      if (mode === 'storyboard') return 'storyboard';
      if (mode === 'diagnostic') return 'diagnostic';
      if (mode === 'truck-calibration') return 'truck-calibration';
      if (mode === 'aircraft-calibration' || mode === 'aircraft') return 'aircraft-calibration';
    }
    // Default to the complete continuous cinematic logistics operation
    return 'journey';
  });

  return (
    <ErrorBoundary fallbackTitle="MERIDIANO 3D Scene Runtime Error">
      <main className="w-full min-h-screen bg-[#080d16] text-slate-100">
        {viewMode === 'journey' && (
          <ContinuousLogisticsJourney
            onSwitchToOpening={() => setViewMode('opening')}
            onSwitchToDiagnostic={() => setViewMode('aircraft-calibration')}
            onSwitchToLoading={() => setViewMode('loading')}
          />
        )}
        {viewMode === 'loading' && (
          <LoadingOperationStudio onBackToJourney={() => setViewMode('journey')} />
        )}
        {viewMode === 'opening' && (
          <div className="relative">
            <div className="fixed top-4 right-20 z-50">
              <button
                onClick={() => setViewMode('journey')}
                className="px-3 py-1.5 rounded-full bg-[#0d121c]/90 border border-blue-500/50 text-blue-300 hover:bg-blue-500/20 text-xs font-mono tracking-wider shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-all"
              >
                <span>← FULL JOURNEY</span>
              </button>
            </div>
            <OpeningSequenceExperience
              onExploreFullJourney={() => setViewMode('journey')}
            />
          </div>
        )}
        {viewMode === 'cinematic' && (
          <div className="relative">
            <div className="fixed top-4 right-20 z-50">
              <button
                onClick={() => setViewMode('journey')}
                className="px-3 py-1.5 rounded-full bg-[#0d121c]/90 border border-blue-500/50 text-blue-300 hover:bg-blue-500/20 text-xs font-mono tracking-wider shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-all"
              >
                <span>← FULL JOURNEY</span>
              </button>
            </div>
            <CinematicScrollExperience onSwitchToDiagnostic={() => setViewMode('aircraft-calibration')} />
          </div>
        )}
        {viewMode === 'storyboard' && (
          <CinematicStoryboardStudio
            onSwitchToCinematic={() => setViewMode('journey')}
            onSwitchToAircraftCalibration={() => setViewMode('aircraft-calibration')}
            onSwitchToTruckCalibration={() => setViewMode('truck-calibration')}
          />
        )}
        {viewMode === 'aircraft-calibration' && (
          <AircraftCalibrationStudio
            onSwitchToCinematic={() => setViewMode('journey')}
            onSwitchToTruck={() => setViewMode('truck-calibration')}
          />
        )}
        {viewMode === 'truck-calibration' && (
          <TruckAssemblyCalibrationStudio />
        )}
        {viewMode === 'diagnostic' && (
          <ForkliftDiagnosticViewer onSwitchToCinematic={() => setViewMode('journey')} />
        )}
      </main>
    </ErrorBoundary>
  );
}
