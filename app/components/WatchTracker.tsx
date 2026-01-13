'use client';

import { useEffect, useRef, useState } from 'react';

interface WatchTrackerProps {
    videoId: string;
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function WatchTracker({ videoId, videoRef }: WatchTrackerProps) {
    const [hasTrackedView, setHasTrackedView] = useState(false);
    const lastReportedPercentage = useRef(0);
    const watchStartTime = useRef(Date.now());

    // Track initial view
    useEffect(() => {
        if (!hasTrackedView) {
            fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'view', videoId }),
            }).catch(console.error);
            setHasTrackedView(true);
        }
    }, [videoId, hasTrackedView]);

    // Track watch progress
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            if (!video.duration) return;

            const currentPercentage = (video.currentTime / video.duration) * 100;

            // Report every 25% progress
            if (currentPercentage >= lastReportedPercentage.current + 25) {
                lastReportedPercentage.current = Math.floor(currentPercentage / 25) * 25;

                fetch('/api/analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'watch',
                        videoId,
                        watchPercentage: currentPercentage,
                        watchDuration: (Date.now() - watchStartTime.current) / 1000,
                        completed: false,
                    }),
                }).catch(console.error);
            }
        };

        const handleEnded = () => {
            fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'watch',
                    videoId,
                    watchPercentage: 100,
                    watchDuration: (Date.now() - watchStartTime.current) / 1000,
                    completed: true,
                }),
            }).catch(console.error);
        };

        const handlePlay = () => {
            watchStartTime.current = Date.now();
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('play', handlePlay);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('play', handlePlay);
        };
    }, [videoId, videoRef]);

    return null;
}
