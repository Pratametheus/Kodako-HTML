import arrowUrl from './assets/arrow.svg?url';
import appleUrl from './assets/apple.svg?url';
import ballUrl from './assets/ball.svg?url';
import bgGridUrl from './assets/bg-grid.svg?url';
import bgPlainUrl from './assets/bg-plain.svg?url';
import bgRoomUrl from './assets/bg-room.svg?url';
import bgSkyUrl from './assets/bg-sky.svg?url';
import bgSpaceUrl from './assets/bg-space.svg?url';
import bgSunsetUrl from './assets/bg-sunset.svg?url';
import bugUrl from './assets/bug.svg?url';
import catUrl from './assets/cat.svg?url';
import circleUrl from './assets/circle.svg?url';
import cloudUrl from './assets/cloud.svg?url';
import fishUrl from './assets/fish.svg?url';
import flowerUrl from './assets/flower.svg?url';
import heartUrl from './assets/heart.svg?url';
import robotUrl from './assets/robot.svg?url';
import rocketUrl from './assets/rocket.svg?url';
import squareUrl from './assets/square.svg?url';
import starUrl from './assets/star.svg?url';
import triangleUrl from './assets/triangle.svg?url';
import beepSoundUrl from './assets/sounds/beep.wav?url';
import boingSoundUrl from './assets/sounds/boing.wav?url';
import chimeSoundUrl from './assets/sounds/chime.wav?url';
import drumSoundUrl from './assets/sounds/drum.wav?url';
import koinSoundUrl from './assets/sounds/koin.wav?url';
import meongSoundUrl from './assets/sounds/meong.wav?url';
import popSoundUrl from './assets/sounds/pop.wav?url';
import whooshSoundUrl from './assets/sounds/whoosh.wav?url';

export type BuiltinAsset = {
  id: string;
  kind: 'costume' | 'backdrop' | 'sound';
  name: string;
  url: string;
};

export const BUILTIN_COSTUMES: readonly BuiltinAsset[] = [
  { id: 'builtin:cat', kind: 'costume', name: 'Kucing', url: catUrl },
  { id: 'builtin:ball', kind: 'costume', name: 'Bola', url: ballUrl },
  { id: 'builtin:arrow', kind: 'costume', name: 'Panah', url: arrowUrl },
  { id: 'builtin:square', kind: 'costume', name: 'Kotak', url: squareUrl },
  { id: 'builtin:star', kind: 'costume', name: 'Bintang', url: starUrl },
  { id: 'builtin:circle', kind: 'costume', name: 'Lingkaran', url: circleUrl },
  { id: 'builtin:triangle', kind: 'costume', name: 'Segitiga', url: triangleUrl },
  { id: 'builtin:bug', kind: 'costume', name: 'Kumbang', url: bugUrl },
  { id: 'builtin:heart', kind: 'costume', name: 'Hati', url: heartUrl },
  { id: 'builtin:robot', kind: 'costume', name: 'Robot', url: robotUrl },
  { id: 'builtin:cloud', kind: 'costume', name: 'Awan', url: cloudUrl },
  { id: 'builtin:flower', kind: 'costume', name: 'Bunga', url: flowerUrl },
  { id: 'builtin:fish', kind: 'costume', name: 'Ikan', url: fishUrl },
  { id: 'builtin:rocket', kind: 'costume', name: 'Roket', url: rocketUrl },
  { id: 'builtin:apple', kind: 'costume', name: 'Apel', url: appleUrl },
];

export const BUILTIN_BACKDROPS: readonly BuiltinAsset[] = [
  { id: 'builtin:bg-plain', kind: 'backdrop', name: 'Putih', url: bgPlainUrl },
  { id: 'builtin:bg-sky', kind: 'backdrop', name: 'Langit', url: bgSkyUrl },
  { id: 'builtin:bg-grid', kind: 'backdrop', name: 'Kotak-kotak', url: bgGridUrl },
  { id: 'builtin:bg-sunset', kind: 'backdrop', name: 'Senja', url: bgSunsetUrl },
  { id: 'builtin:bg-room', kind: 'backdrop', name: 'Ruangan', url: bgRoomUrl },
  { id: 'builtin:bg-space', kind: 'backdrop', name: 'Antariksa', url: bgSpaceUrl },
];

export const BUILTIN_SOUNDS: readonly BuiltinAsset[] = [
  { id: 'builtin:snd-pop', kind: 'sound', name: 'Pop', url: popSoundUrl },
  { id: 'builtin:snd-beep', kind: 'sound', name: 'Bip', url: beepSoundUrl },
  { id: 'builtin:snd-boing', kind: 'sound', name: 'Boing', url: boingSoundUrl },
  { id: 'builtin:snd-meong', kind: 'sound', name: 'Meong', url: meongSoundUrl },
  { id: 'builtin:snd-drum', kind: 'sound', name: 'Drum', url: drumSoundUrl },
  { id: 'builtin:snd-chime', kind: 'sound', name: 'Lonceng', url: chimeSoundUrl },
  { id: 'builtin:snd-whoosh', kind: 'sound', name: 'Wus', url: whooshSoundUrl },
  { id: 'builtin:snd-koin', kind: 'sound', name: 'Koin', url: koinSoundUrl },
];

export const BUILTIN_BY_ID: ReadonlyMap<string, BuiltinAsset> = new Map(
  [...BUILTIN_COSTUMES, ...BUILTIN_BACKDROPS, ...BUILTIN_SOUNDS].map((asset) => [asset.id, asset]),
);

export function isBuiltinAssetId(id: string): boolean {
  return id.startsWith('builtin:');
}

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const MAX_SOUND_UPLOAD_BYTES = 2 * 1024 * 1024;

export function loadUploadedImage(file: File): Promise<{ dataUrl: string; name: string }> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return Promise.reject(new Error('Gambar terlalu besar (maks 2 MB).'));
  }
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('File itu bukan gambar.'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve({ dataUrl: reader.result, name: file.name });
      else reject(new Error('Gambar tidak dapat dibaca.'));
    };
    reader.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
    reader.readAsDataURL(file);
  });
}

export function loadUploadedSound(file: File): Promise<{ dataUrl: string; name: string }> {
  if (file.size > MAX_SOUND_UPLOAD_BYTES) {
    return Promise.reject(new Error('Suara terlalu besar (maks 2 MB).'));
  }
  if (!file.type.startsWith('audio/')) {
    return Promise.reject(new Error('File itu bukan suara.'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve({ dataUrl: reader.result, name: file.name });
      else reject(new Error('Suara tidak dapat dibaca.'));
    };
    reader.onerror = () => reject(new Error('Suara tidak dapat dibaca.'));
    reader.readAsDataURL(file);
  });
}

export function resolveAssetUrl(
  assetId: string,
  projectAssets: Record<string, { ref: string }>,
): string | null {
  if (isBuiltinAssetId(assetId)) return BUILTIN_BY_ID.get(assetId)?.url ?? null;
  return projectAssets[assetId]?.ref ?? null;
}
