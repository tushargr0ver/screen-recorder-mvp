'use client';

import { useRecording } from '../contexts/RecordingContext';

export default function ScreenRecorder() {
    const {
        state,
        duration,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording
    } = useRecording();

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStart = async () => {
        try {
            await startRecording();
        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Failed to start recording. Please make sure you grant screen sharing permissions.');
        }
    };

    return (
        <div className="recorder-container">
            {state === 'idle' && (
                <div className="start-section">
                    <div className="icon-container">
                        <svg className="record-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="4" fill="currentColor" />
                        </svg>
                    </div>
                    <h2>Ready to Record</h2>
                    <p>Capture your screen with audio</p>
                    <button onClick={handleStart} className="btn btn-primary btn-large">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <circle cx="12" cy="12" r="8" />
                        </svg>
                        Start Recording
                    </button>
                </div>
            )}

            {(state === 'recording' || state === 'paused') && (
                <div className="recording-section">
                    <div className={`recording-indicator ${state === 'paused' ? 'paused' : ''}`}>
                        <span className="pulse"></span>
                        <span className="status-text">
                            {state === 'recording' ? 'Recording' : 'Paused'}
                        </span>
                    </div>

                    <div className="timer">{formatDuration(duration)}</div>

                    <div className="controls">
                        {state === 'recording' ? (
                            <button onClick={pauseRecording} className="btn btn-secondary">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                    <rect x="6" y="4" width="4" height="16" />
                                    <rect x="14" y="4" width="4" height="16" />
                                </svg>
                                Pause
                            </button>
                        ) : (
                            <button onClick={resumeRecording} className="btn btn-secondary">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                    <polygon points="5,3 19,12 5,21" />
                                </svg>
                                Resume
                            </button>
                        )}

                        <button onClick={stopRecording} className="btn btn-danger">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <rect x="4" y="4" width="16" height="16" rx="2" />
                            </svg>
                            Stop Recording
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
