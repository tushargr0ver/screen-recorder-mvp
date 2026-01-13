import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'videos.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT,
    size INTEGER,
    views INTEGER DEFAULT 0,
    total_watch_time REAL DEFAULT 0,
    completions INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS watch_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    watch_percentage REAL,
    watch_duration REAL,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id)
  );
`);

export interface Video {
    id: string;
    filename: string;
    original_name: string | null;
    size: number;
    views: number;
    total_watch_time: number;
    completions: number;
    created_at: string;
}

export interface WatchEvent {
    id: number;
    video_id: string;
    watch_percentage: number;
    watch_duration: number;
    completed: number;
    created_at: string;
}

export function createVideo(id: string, filename: string, originalName: string, size: number): Video {
    const stmt = db.prepare(`
    INSERT INTO videos (id, filename, original_name, size)
    VALUES (?, ?, ?, ?)
  `);
    stmt.run(id, filename, originalName, size);
    return getVideo(id)!;
}

export function getVideo(id: string): Video | null {
    const stmt = db.prepare('SELECT * FROM videos WHERE id = ?');
    return stmt.get(id) as Video | null;
}

export function incrementViews(id: string): void {
    const stmt = db.prepare('UPDATE videos SET views = views + 1 WHERE id = ?');
    stmt.run(id);
}

export function recordWatchEvent(
    videoId: string,
    watchPercentage: number,
    watchDuration: number,
    completed: boolean
): void {
    const stmt = db.prepare(`
    INSERT INTO watch_events (video_id, watch_percentage, watch_duration, completed)
    VALUES (?, ?, ?, ?)
  `);
    stmt.run(videoId, watchPercentage, watchDuration, completed ? 1 : 0);

    // Update video stats
    const updateStmt = db.prepare(`
    UPDATE videos 
    SET total_watch_time = total_watch_time + ?,
        completions = completions + ?
    WHERE id = ?
  `);
    updateStmt.run(watchDuration, completed ? 1 : 0, videoId);
}

export function getVideoStats(id: string): {
    views: number;
    completions: number;
    avgWatchPercentage: number;
    totalWatchTime: number;
} | null {
    const video = getVideo(id);
    if (!video) return null;

    const avgStmt = db.prepare(`
    SELECT AVG(watch_percentage) as avg_percentage
    FROM watch_events
    WHERE video_id = ?
  `);
    const avgResult = avgStmt.get(id) as { avg_percentage: number | null };

    return {
        views: video.views,
        completions: video.completions,
        avgWatchPercentage: avgResult.avg_percentage || 0,
        totalWatchTime: video.total_watch_time,
    };
}

export default db;
