'use client';

import { useState } from 'react';
import { RecordingProvider, useRecording } from './contexts/RecordingContext';
import ScreenRecorder from './components/ScreenRecorder';
import VideoPreview from './components/VideoPreview';
import VideoTrimmer from './components/VideoTrimmer';
import UploadButton from './components/UploadButton';
import ShareLink from './components/ShareLink';

type AppStep = 'record' | 'preview' | 'trim' | 'upload' | 'share';

function AppContent() {
  const { state, recordedBlob, trimmedBlob, reset } = useRecording();
  const [step, setStep] = useState<AppStep>('record');
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Determine current step based on state
  const currentStep = (() => {
    if (shareUrl && step === 'share') return 'share';
    if (step === 'upload' && (trimmedBlob || recordedBlob)) return 'upload';
    if (step === 'trim' && recordedBlob) return 'trim';
    if (state === 'stopped' && recordedBlob) return 'preview';
    return 'record';
  })();

  const handleRecordAnother = () => {
    reset();
    setStep('record');
    setShareUrl(null);
  };

  return (
    <main className="app-container">
      <header className="app-header">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" fill="currentColor" />
          </svg>
          <h1>Screen Recorder</h1>
        </div>
        <p className="tagline">Record, trim, and share your screen</p>
      </header>

      <div className="steps-indicator">
        {['record', 'preview', 'trim', 'upload', 'share'].map((s, i) => (
          <div
            key={s}
            className={`step ${currentStep === s ? 'active' : ''} ${['record', 'preview', 'trim', 'upload', 'share'].indexOf(currentStep) > i ? 'completed' : ''
              }`}
          >
            <span className="step-number">{i + 1}</span>
            <span className="step-label">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
          </div>
        ))}
      </div>

      <div className="content-area">
        {currentStep === 'record' && <ScreenRecorder />}

        {currentStep === 'preview' && (
          <VideoPreview onProceedToTrim={() => setStep('trim')} />
        )}

        {currentStep === 'trim' && (
          <VideoTrimmer
            onComplete={() => setStep('upload')}
            onBack={() => setStep('preview')}
          />
        )}

        {currentStep === 'upload' && (
          <UploadButton
            onUploadComplete={(url) => {
              setShareUrl(url);
              setStep('share');
            }}
          />
        )}

        {currentStep === 'share' && shareUrl && (
          <ShareLink
            shareUrl={shareUrl}
            onRecordAnother={handleRecordAnother}
          />
        )}
      </div>

      <footer className="app-footer">
        <p>Built with Next.js, TypeScript, and ffmpeg.wasm</p>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <RecordingProvider>
      <AppContent />
    </RecordingProvider>
  );
}
