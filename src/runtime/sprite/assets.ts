import arrowUrl from './assets/arrow.svg?url';
import ballUrl from './assets/ball.svg?url';
import bgGridUrl from './assets/bg-grid.svg?url';
import bgPlainUrl from './assets/bg-plain.svg?url';
import bgSkyUrl from './assets/bg-sky.svg?url';
import bgSunsetUrl from './assets/bg-sunset.svg?url';
import bugUrl from './assets/bug.svg?url';
import catUrl from './assets/cat.svg?url';
import circleUrl from './assets/circle.svg?url';
import heartUrl from './assets/heart.svg?url';
import squareUrl from './assets/square.svg?url';
import starUrl from './assets/star.svg?url';
import triangleUrl from './assets/triangle.svg?url';

export type BuiltinAsset = {
  id: string;
  kind: 'costume' | 'backdrop';
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
];

export const BUILTIN_BACKDROPS: readonly BuiltinAsset[] = [
  { id: 'builtin:bg-plain', kind: 'backdrop', name: 'Putih', url: bgPlainUrl },
  { id: 'builtin:bg-sky', kind: 'backdrop', name: 'Langit', url: bgSkyUrl },
  { id: 'builtin:bg-grid', kind: 'backdrop', name: 'Kotak-kotak', url: bgGridUrl },
  { id: 'builtin:bg-sunset', kind: 'backdrop', name: 'Senja', url: bgSunsetUrl },
];

export const BUILTIN_BY_ID: ReadonlyMap<string, BuiltinAsset> = new Map(
  [...BUILTIN_COSTUMES, ...BUILTIN_BACKDROPS].map((asset) => [asset.id, asset]),
);

export function isBuiltinAssetId(id: string): boolean {
  return id.startsWith('builtin:');
}

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

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

export function resolveAssetUrl(
  assetId: string,
  projectAssets: Record<string, { ref: string }>,
): string | null {
  if (isBuiltinAssetId(assetId)) return BUILTIN_BY_ID.get(assetId)?.url ?? null;
  return projectAssets[assetId]?.ref ?? null;
}
