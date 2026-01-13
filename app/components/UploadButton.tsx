'use client';

import { useState } from 'react';
import { useRecording } from '../contexts/RecordingContext';

interface UploadButtonProps {
    onUploadComplete: (shareUrl: string) => void;
}

export default function UploadButton({ onUploadComplete }: UploadButtonProps) {
    const { trimmedBlob, recordedBlob } = useRecording();
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const videoBlob = trimmedBlob || recordedBlob;

    const handleUpload = async () => {
        if (!videoBlob) return;

        setIsUploading(true);
        setProgress(0);

        try {
            const formData = new FormData();
            formData.append('video', videoBlob, `video-${Date.now()}.webm`);

            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setProgress(100);

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            onUploadComplete(data.shareUrl);
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload video. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownload = () => {
        if (!videoBlob) return;

        const url = URL.createObjectURL(videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="upload-section">
            <h2>Ready to Share</h2>
            <p>Your video is ready. Upload it to get a shareable link.</p>

            <div className="video-stats">
                <span>Size: {videoBlob ? (videoBlob.size / (1024 * 1024)).toFixed(2) : 0} MB</span>
                <span>Format: WebM</span>
            </div>

            <div className="actions">
                <button onClick={handleDownload} className="btn btn-secondary" disabled={isUploading}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                </button>

                <button onClick={handleUpload} className="btn btn-primary btn-large" disabled={isUploading}>
                    {isUploading ? (
                        <>
                            <div className="spinner-small"></div>
                            Uploading... {progress}%
                        </>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            Upload & Get Link
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
