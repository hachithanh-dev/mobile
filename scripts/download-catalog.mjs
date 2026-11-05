import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { DEMO_VIDEOS } from '../server/catalog.mjs';

await mkdir('server/media/clips', { recursive: true });
const manifestPath = 'server/media/catalog-manifest.json';
const previous = await readFile(manifestPath, 'utf8')
  .then(JSON.parse)
  .catch(() => []);
const manifest = [];
const preferHD = new Set(['v21', 'v22', 'v28']);
let writes = Promise.resolve();
const persist = () => {
  const json = JSON.stringify(
    manifest.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1))),
    null,
    2,
  );
  writes = writes.then(() => writeFile(manifestPath, json));
  return writes;
};

async function chooseSource(video) {
  const filename = (w, h, rate, quality) => `${video.sourceId}-${quality}_${w}_${h}_${rate}fps.mp4`;
  const aspect = video.width / video.height;
  const sizes =
    aspect > 1
      ? [
          [960, Math.round(960 / aspect / 2) * 2],
          [640, Math.round(640 / aspect / 2) * 2],
          [960, 540],
          [640, 360],
        ]
      : [
          [Math.round((960 * aspect) / 2) * 2, 960],
          [Math.round((640 * aspect) / 2) * 2, 640],
          [540, 960],
          [360, 640],
        ];
  const fps = [...new Set([video.fps, 25, 30, 24, 60, 50])];
  if (preferHD.has(video.id)) {
    const sizesHD =
      aspect > 1
        ? [
            [1280, Math.round(1280 / aspect / 2) * 2],
            [1920, Math.round(1920 / aspect / 2) * 2],
          ]
        : [
            [Math.round((1280 * aspect) / 2) * 2, 1280],
            [Math.round((1920 * aspect) / 2) * 2, 1920],
          ];
    for (const [w, h] of sizesHD)
      for (const rate of fps) {
        const url = `https://videos.pexels.com/video-files/${video.sourceId}/${filename(w, h, rate, 'hd')}`;
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
        if (response.ok) return url;
      }
  }
  for (const [w, h] of sizes) {
    for (const rate of fps) {
      const url = `https://videos.pexels.com/video-files/${video.sourceId}/${filename(w, h, rate, 'sd')}`;
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
      if (response.ok) return url;
      if (response.status !== 404) throw new Error(`${video.id}: HTTP ${response.status}`);
    }
  }
  const hd =
    aspect > 1
      ? [
          [1280, Math.round(1280 / aspect / 2) * 2],
          [1280, 720],
        ]
      : [
          [Math.round((1280 * aspect) / 2) * 2, 1280],
          [720, 1280],
        ];
  for (const [w, h] of hd)
    for (const rate of fps) {
      const url = `https://videos.pexels.com/video-files/${video.sourceId}/${filename(w, h, rate, 'hd')}`;
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
      if (response.ok) return url;
      if (response.status !== 404) throw new Error(`${video.id}: HTTP ${response.status}`);
    }
  throw new Error(`${video.id}: no supported download variant`);
}

// Two independent downloads at a time keep the source and local disk load modest.
let next = 0;
async function worker() {
  while (next < DEMO_VIDEOS.length) {
    const video = DEMO_VIDEOS[next++];
    const path = `server${video.url}`;
    const cached = previous.find((v) => v.id === video.id && v.sourceId === video.sourceId);
    if (
      cached &&
      (!preferHD.has(video.id) || cached.downloadUrl.includes('-hd_')) &&
      (await stat(path)
        .then((s) => s.size === cached.bytes)
        .catch(() => false))
    ) {
      manifest.push(cached);
      console.log(`${video.id}: cached`);
      continue;
    }
    try {
      const downloadUrl = await chooseSource(video);
      const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = Buffer.from(await response.arrayBuffer());
      if (data.length < 10000 || !data.subarray(0, 40).includes(Buffer.from('ftyp')))
        throw new Error('Invalid MP4 response');
      await writeFile(path, data);
      manifest.push({
        id: video.id,
        sourceId: video.sourceId,
        sourceUrl: video.sourceUrl,
        author: video.sourceAuthor,
        licenseUrl: video.licenseUrl,
        downloadUrl,
        bytes: data.length,
        sha256: createHash('sha256').update(data).digest('hex'),
      });
      await persist();
      console.log(`${video.id}: ${(data.length / 1024 / 1024).toFixed(2)} MB · ${video.title}`);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
await Promise.all([worker(), worker()]);
await writeFile(
  manifestPath,
  JSON.stringify(
    manifest.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1))),
    null,
    2,
  ),
);
console.log(`Downloaded ${manifest.length}/${DEMO_VIDEOS.length} unique clips`);
