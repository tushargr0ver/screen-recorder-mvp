'use client';

import { useRef, useState, useEffect } from 'react';
import WatchTracker from '@/app/components/WatchTracker';
import type { Video } from '@/app/lib/db';

interface WatchPageClientProps {
    video: Video;
}

export default function WatchPageClient({ video }: WatchPageClientProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stats, setStats] = useState<{
        views: number;
        completions: number;
        avgWatchPercentage: number;
    } | null>(null);

    useEffect(() => {
        fetch(`/api/analytics?videoId=${video.id}`)
            .then(res => res.json())
            .then(setStats)
            .catch(console.error);
    }, [video.id]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatSize = (bytes: number) => {
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    return (
        <div className="watch-page">
            <div className="watch-container">
                <div className="video-player">
                    <video
                        ref={videoRef}
                        src={`/uploads/${video.filename}`}
                        controls
                        autoPlay={false}
                        playsInline
                    />
                </div>

                <WatchTracker videoId={video.id} videoRef={videoRef} />

                <div className="video-details">
                    <h1>Screen Recording</h1>
                    <p className="video-meta">
                        Uploaded {formatDate(video.created_at)} • {formatSize(video.size)}
                    </p>

                    {stats && (
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-value">{stats.views}</div>
                                <div className="stat-label">Views</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{stats.completions}</div>
                                <div className="stat-label">Completions</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{Math.round(stats.avgWatchPercentage)}%</div>
                                <div className="stat-label">Avg Watch</div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="back-link">
                    <a href="/" className="btn btn-secondary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="4" fill="currentColor" />
                        </svg>
                        Record Your Own
                    </a>
                </div>
            </div>
        </div>
    );
}
