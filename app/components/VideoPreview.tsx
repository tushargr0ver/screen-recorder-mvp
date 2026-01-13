'use client';

import { useEffect, useRef, useState } from 'react';
import { useRecording } from '../contexts/RecordingContext';

interface VideoPreviewProps {
    onProceedToTrim: () => void;
}

export default function VideoPreview({ onProceedToTrim }: VideoPreviewProps) {
    const { recordedBlob, reset } = useRecording();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoDuration, setVideoDuration] = useState(0);

    useEffect(() => {
        if (recordedBlob) {
            const url = URL.createObjectURL(recordedBlob);
            setVideoUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [recordedBlob]);

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            // Handle infinity duration issue with webm
            if (videoRef.current.duration === Infinity) {
                videoRef.current.currentTime = 1e101;
                videoRef.current.ontimeupdate = () => {
                    if (videoRef.current) {
                        videoRef.current.ontimeupdate = null;
                        videoRef.current.currentTime = 0;
                        setVideoDuration(videoRef.current.duration);
                    }
                };
            } else {
                setVideoDuration(videoRef.current.duration);
            }
        }
    };

    const handleDownload = () => {
        if (recordedBlob) {
            const url = URL.createObjectURL(recordedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recording-${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const formatDuration = (seconds: number) => {
        if (!isFinite(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!recordedBlob) return null;

    return (
        <div className="preview-container">
            <h2>Recording Complete</h2>

            <div className="video-wrapper">
                <video
                    ref={videoRef}
                    src={videoUrl || undefined}
                    controls
                    onLoadedMetadata={handleLoadedMetadata}
                />
            </div>

            <div className="video-info">
                <span>Duration: {formatDuration(videoDuration)}</span>
                <span>Size: {(recordedBlob.size / (1024 * 1024)).toFixed(2)} MB</span>
            </div>

            <div className="actions">
                <button onClick={handleDownload} className="btn btn-secondary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Original
                </button>

                <button onClick={onProceedToTrim} className="btn btn-primary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <polygon points="19 20 9 12 19 4 19 20" />
                        <line x1="5" y1="19" x2="5" y2="5" />
                    </svg>
                    Trim Video
                </button>

                <button onClick={reset} className="btn btn-ghost">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Record Again
                </button>
            </div>
        </div>
    );
}
