'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

interface RecordingContextType {
    state: RecordingState;
    recordedBlob: Blob | null;
    trimmedBlob: Blob | null;
    duration: number;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    pauseRecording: () => void;
    resumeRecording: () => void;
    setRecordedBlob: (blob: Blob | null) => void;
    setTrimmedBlob: (blob: Blob | null) => void;
    reset: () => void;
}

const RecordingContext = createContext<RecordingContextType | null>(null);

export function useRecording() {
    const context = useContext(RecordingContext);
    if (!context) {
        throw new Error('useRecording must be used within a RecordingProvider');
    }
    return context;
}

export function RecordingProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<RecordingState>('idle');
    const [recordedBlob, setRecordedBlobState] = useState<Blob | null>(null);
    const [trimmedBlob, setTrimmedBlobState] = useState<Blob | null>(null);
    const [duration, setDuration] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const startTimeRef = useRef<number>(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startRecording = useCallback(async () => {
        try {
            // Get screen stream
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: true
            });

            // Try to get microphone audio
            let audioStream: MediaStream | null = null;
            try {
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch {
                console.log('Microphone not available, recording without mic');
            }

            // Combine streams
            const tracks = [
                ...screenStream.getVideoTracks(),
                ...screenStream.getAudioTracks(),
            ];

            if (audioStream) {
                tracks.push(...audioStream.getAudioTracks());
            }

            const combinedStream = new MediaStream(tracks);
            streamRef.current = combinedStream;

            // Detect supported codec with fallbacks
            const getSupportedMimeType = () => {
                const mimeTypes = [
                    'video/webm;codecs=vp9,opus',
                    'video/webm;codecs=vp8,opus',
                    'video/webm;codecs=vp9',
                    'video/webm;codecs=vp8',
                    'video/webm',
                    'video/mp4',
                ];
                for (const mimeType of mimeTypes) {
                    if (MediaRecorder.isTypeSupported(mimeType)) {
                        return mimeType;
                    }
                }
                return 'video/webm'; // Fallback
            };

            const mimeType = getSupportedMimeType();
            console.log('Using mimeType:', mimeType);

            // Setup MediaRecorder
            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                setRecordedBlobState(blob);
                setState('stopped');

                // Cleanup
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
            };

            // Handle when user stops sharing from browser UI
            screenStream.getVideoTracks()[0].onended = () => {
                if (mediaRecorderRef.current?.state === 'recording') {
                    stopRecording();
                }
            };

            mediaRecorder.start(1000); // Collect data every second
            startTimeRef.current = Date.now();
            setState('recording');

            // Update duration
            timerRef.current = setInterval(() => {
                setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);

        } catch (error) {
            console.error('Error starting recording:', error);
            throw error;
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        // Stop all tracks
        streamRef.current?.getTracks().forEach(track => track.stop());

        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    }, []);

    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.pause();
            setState('paused');
        }
    }, []);

    const resumeRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'paused') {
            mediaRecorderRef.current.resume();
            setState('recording');
        }
    }, []);

    const setRecordedBlob = useCallback((blob: Blob | null) => {
        setRecordedBlobState(blob);
    }, []);

    const setTrimmedBlob = useCallback((blob: Blob | null) => {
        setTrimmedBlobState(blob);
    }, []);

    const reset = useCallback(() => {
        setState('idle');
        setRecordedBlobState(null);
        setTrimmedBlobState(null);
        setDuration(0);
        chunksRef.current = [];
    }, []);

    return (
        <RecordingContext.Provider
            value={{
                state,
                recordedBlob,
                trimmedBlob,
                duration,
                startRecording,
                stopRecording,
                pauseRecording,
                resumeRecording,
                setRecordedBlob,
                setTrimmedBlob,
                reset,
            }}
        >
            {children}
        </RecordingContext.Provider>
    );
}
