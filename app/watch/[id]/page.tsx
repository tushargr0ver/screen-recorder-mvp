import { notFound } from 'next/navigation';
import { getVideo } from '@/app/lib/db';
import WatchPageClient from './WatchPageClient';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function WatchPage({ params }: PageProps) {
    const { id } = await params;
    const video = getVideo(id);

    if (!video) {
        notFound();
    }

    return <WatchPageClient video={video} />;
}

export async function generateMetadata({ params }: PageProps) {
    const { id } = await params;
    const video = getVideo(id);

    if (!video) {
        return { title: 'Video Not Found' };
    }

    return {
        title: `Watch Recording - Screen Recorder`,
        description: 'Watch this screen recording shared via Screen Recorder MVP',
    };
}
