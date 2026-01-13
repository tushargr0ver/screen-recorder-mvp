'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { useRecording } from '../contexts/RecordingContext';

interface VideoTrimmerProps {
    onComplete: () => void;
    onBack: () => void;
}

export default function VideoTrimmer({ onComplete, onBack }: VideoTrimmerProps) {
    const { recordedBlob, setTrimmedBlob } = useRecording();
    const videoRef = useRef<HTMLVideoElement>(null);
    const ffmpegRef = useRef<FFmpeg | null>(null);

    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isTrimming, setIsTrimming] = useState(false);
    const [progress, setProgress] = useState(0);
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

    // Load ffmpeg
    useEffect(() => {
        const loadFfmpeg = async () => {
            try {
                const ffmpeg = new FFmpeg();
                ffmpegRef.current = ffmpeg;

                ffmpeg.on('progress', ({ progress }) => {
                    setProgress(Math.round(progress * 100));
                });

                // Use direct fetch instead of toBlobURL to avoid Turbopack issues
                const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

                const coreResponse = await fetch(`${baseURL}/ffmpeg-core.js`);
                const coreBlob = await coreResponse.blob();
                const coreURL = URL.createObjectURL(new Blob([coreBlob], { type: 'text/javascript' }));

                const wasmResponse = await fetch(`${baseURL}/ffmpeg-core.wasm`);
                const wasmBlob = await wasmResponse.blob();
                const wasmURL = URL.createObjectURL(new Blob([wasmBlob], { type: 'application/wasm' }));

                await ffmpeg.load({
                    coreURL,
                    wasmURL,
                });

                setFfmpegLoaded(true);
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to load ffmpeg:', error);
                setIsLoading(false);
            }
        };

        loadFfmpeg();
    }, []);

    // Create video URL
    useEffect(() => {
        if (recordedBlob) {
            const url = URL.createObjectURL(recordedBlob);
            setVideoUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [recordedBlob]);

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const video = videoRef.current;

            // Handle webm infinity duration bug
            if (video.duration === Infinity) {
                video.currentTime = 1e101;
                video.ontimeupdate = () => {
                    video.ontimeupdate = null;
                    video.currentTime = 0;
                    const dur = video.duration;
                    setDuration(dur);
                    setEndTime(dur);
                };
            } else {
                setDuration(video.duration);
                setEndTime(video.duration);
            }
        }
    };

    const handleStartChange = (value: number) => {
        const newStart = Math.min(value, endTime - 0.5);
        setStartTime(Math.max(0, newStart));
        if (videoRef.current) {
            videoRef.current.currentTime = newStart;
        }
    };

    const handleEndChange = (value: number) => {
        const newEnd = Math.max(value, startTime + 0.5);
        setEndTime(Math.min(duration, newEnd));
    };

    const previewTrim = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.currentTime = startTime;
            videoRef.current.play();

            const checkTime = () => {
                if (videoRef.current && videoRef.current.currentTime >= endTime) {
                    videoRef.current.pause();
                    videoRef.current.currentTime = startTime;
                } else if (videoRef.current && !videoRef.current.paused) {
                    requestAnimationFrame(checkTime);
                }
            };
            requestAnimationFrame(checkTime);
        }
    }, [startTime, endTime]);

    const handleTrim = async () => {
        if (!ffmpegRef.current || !recordedBlob || !ffmpegLoaded) return;

        setIsTrimming(true);
        setProgress(0);

        try {
            const ffmpeg = ffmpegRef.current;

            // Write input file
            await ffmpeg.writeFile('input.webm', await fetchFile(recordedBlob));

            // Trim video
            const trimDuration = endTime - startTime;
            await ffmpeg.exec([
                '-i', 'input.webm',
                '-ss', startTime.toString(),
                '-t', trimDuration.toString(),
                '-c', 'copy',
                'output.webm'
            ]);

            // Read output
            const data = await ffmpeg.readFile('output.webm');
            const uint8Array = data as Uint8Array;
            // Create a new Uint8Array copy to ensure proper ArrayBuffer typing
            const copiedArray = new Uint8Array(uint8Array);
            const trimmedBlob = new Blob([copiedArray], { type: 'video/webm' });

            setTrimmedBlob(trimmedBlob);
            onComplete();
        } catch (error) {
            console.error('Trimming failed:', error);
            alert('Failed to trim video. Please try again.');
        } finally {
            setIsTrimming(false);
        }
    };

    const formatTime = (seconds: number) => {
        if (!isFinite(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!recordedBlob) return null;

    return (
        <div className="trimmer-container">
            <h2>Trim Your Video</h2>

            {isLoading ? (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading video editor...</p>
                </div>
            ) : (
                <>
                    <div className="video-wrapper">
                        <video
                            ref={videoRef}
                            src={videoUrl || undefined}
                            onLoadedMetadata={handleLoadedMetadata}
                        />
                    </div>

                    <div className="trim-controls">
                        <div className="time-display">
                            <span>{formatTime(startTime)}</span>
                            <span className="duration">
                                Selected: {formatTime(endTime - startTime)}
                            </span>
                            <span>{formatTime(endTime)}</span>
                        </div>

                        <div className="range-container">
                            <div
                                className="range-track"
                                style={{
                                    '--start': `${(startTime / duration) * 100}%`,
                                    '--end': `${(endTime / duration) * 100}%`
                                } as React.CSSProperties}
                            >
                                <div className="range-selected"></div>
                            </div>

                            <input
                                type="range"
                                min={0}
                                max={duration}
                                step={0.1}
                                value={startTime}
                                onChange={(e) => handleStartChange(parseFloat(e.target.value))}
                                className="range-input start"
                            />

                            <input
                                type="range"
                                min={0}
                                max={duration}
                                step={0.1}
                                value={endTime}
                                onChange={(e) => handleEndChange(parseFloat(e.target.value))}
                                className="range-input end"
                            />
                        </div>
                    </div>

                    <div className="actions">
                        <button onClick={onBack} className="btn btn-ghost" disabled={isTrimming}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                <line x1="19" y1="12" x2="5" y2="12" />
                                <polyline points="12 19 5 12 12 5" />
                            </svg>
                            Back
                        </button>

                        <button onClick={previewTrim} className="btn btn-secondary" disabled={isTrimming}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <polygon points="5,3 19,12 5,21" />
                            </svg>
                            Preview Trim
                        </button>

                        <button onClick={handleTrim} className="btn btn-primary" disabled={isTrimming || !ffmpegLoaded}>
                            {isTrimming ? (
                                <>
                                    <div className="spinner-small"></div>
                                    Trimming... {progress}%
                                </>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                        <circle cx="6" cy="6" r="3" />
                                        <circle cx="6" cy="18" r="3" />
                                        <line x1="20" y1="4" x2="8.12" y2="15.88" />
                                        <line x1="14.47" y1="14.48" x2="20" y2="20" />
                                        <line x1="8.12" y1="8.12" x2="12" y2="12" />
                                    </svg>
                                    Apply Trim
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
