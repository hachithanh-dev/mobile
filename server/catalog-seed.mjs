import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CATALOG_VERSION, DEMO_VIDEOS } from './catalog.mjs';

/** Apply once to both existing and fresh demo databases; preserve user-created content. */
export function installDemoCatalog(db) {
  db.exec(
    'CREATE TABLE IF NOT EXISTS seed_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  );
  if (db.prepare('SELECT version FROM seed_migrations WHERE version=?').get(CATALOG_VERSION))
    return;
  const manifest = JSON.parse(
    readFileSync(new URL('./media/catalog-manifest.json', import.meta.url), 'utf8'),
  );
  for (const video of DEMO_VIDEOS) {
    const asset = manifest.find((item) => item.id === video.id && item.sourceId === video.sourceId);
    if (
      !asset?.duration ||
      !existsSync(fileURLToPath(new URL(`.${video.url}`, import.meta.url))) ||
      !existsSync(fileURLToPath(new URL(`.${video.poster}`, import.meta.url)))
    ) {
      throw new Error(
        `Missing prepared media for ${video.id}. Run npm run media:download and npm run media:prepare.`,
      );
    }
  }
  const insert = db.prepare(
    'INSERT OR IGNORE INTO videos (id,user_id,title,description,topic,poster,url,music,views,created_at,source_url,source_author,duration_seconds) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
  );
  const updateLegacy = db.prepare(
    "UPDATE videos SET title=?,description=?,topic=?,poster=?,url=?,music=?,created_at=?,source_url=?,source_author=?,duration_seconds=? WHERE id=? AND user_id=? AND url='/media/sample.mp4'",
  );
  const base = Date.now() - 4 * 3600000;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const [index, video] of DEMO_VIDEOS.entries()) {
      const asset = manifest.find((item) => item.id === video.id);
      const date = new Date(base - index * 90 * 60000).toISOString().replace('T', ' ').slice(0, 19);
      // Only the old shared-clip rows are replaced. Likes, comments and view counts stay attached.
      const updated = updateLegacy.run(
        video.title,
        video.description,
        video.topic,
        video.poster,
        video.url,
        'Âm thanh gốc',
        date,
        video.sourceUrl,
        video.sourceAuthor,
        asset.duration,
        video.id,
        video.userId,
      );
      if (updated.changes) db.prepare('DELETE FROM watch_history WHERE video_id=?').run(video.id);
      insert.run(
        video.id,
        video.userId,
        video.title,
        video.description,
        video.topic,
        video.poster,
        video.url,
        'Âm thanh gốc',
        video.views,
        date,
        video.sourceUrl,
        video.sourceAuthor,
        asset.duration,
      );
    }
    db.prepare('INSERT INTO seed_migrations(version) VALUES(?)').run(CATALOG_VERSION);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
