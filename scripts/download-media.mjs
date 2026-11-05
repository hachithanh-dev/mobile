// Run once when refreshing demo media; assets are kept in the repository.
import { mkdir, writeFile } from 'node:fs/promises';
const dir = 'server/media';
await mkdir(dir, { recursive: true });
const photos = [
  'photo-1472396961693-142e6e269027',
  'photo-1442512595331-e89e73853f31',
  'photo-1519608487953-e999c86e7455',
  'photo-1518837695005-2083093ee35b',
  'photo-1460661419201-fd4cecdf8a8b',
  'photo-1441974231531-c6227db76b6e',
  'photo-1476480862126-209bfaa8edc8',
  'photo-1490645935967-10de6ba17061',
  'photo-1464822759023-fed622ff2c3b',
];
const downloads = [
  ...photos.map((p, i) => [
    `cover-${i + 1}.jpg`,
    `https://images.unsplash.com/${p}?auto=format&fit=crop&w=1000&q=85`,
  ]),
  ...['47', '44', '12', '49', '33'].map((id) => [
    `avatar-${id}.jpg`,
    `https://i.pravatar.cc/150?img=${id}`,
  ]),
  ['sample.mp4', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'],
];
for (const [name, url] of downloads) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(`${dir}/${name}`, bytes);
  console.log(`${name}: ${bytes.length} bytes`);
}
