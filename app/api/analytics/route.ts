import { NextRequest, NextResponse } from 'next/server';
import { incrementViews, recordWatchEvent, getVideoStats, getVideo } from '@/app/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, videoId, watchPercentage, watchDuration, completed } = body;

        if (!videoId) {
            return NextResponse.json(
                { error: 'Video ID is required' },
                { status: 400 }
            );
        }

        const video = getVideo(videoId);
        if (!video) {
            return NextResponse.json(
                { error: 'Video not found' },
                { status: 404 }
            );
        }

        switch (action) {
            case 'view':
                incrementViews(videoId);
                return NextResponse.json({ success: true });

            case 'watch':
                recordWatchEvent(
                    videoId,
                    watchPercentage || 0,
                    watchDuration || 0,
                    completed || false
                );
                return NextResponse.json({ success: true });

            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json(
            { error: 'Failed to record analytics' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const videoId = searchParams.get('videoId');

        if (!videoId) {
            return NextResponse.json(
                { error: 'Video ID is required' },
                { status: 400 }
            );
        }

        const stats = getVideoStats(videoId);
        if (!stats) {
            return NextResponse.json(
                { error: 'Video not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Analytics fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}
