import arrowUrl from './asset-library/arrow.svg?url';
import appleUrl from './asset-library/apple.svg?url';
import ballUrl from './asset-library/ball.svg?url';
import bugUrl from './asset-library/bug.svg?url';
import catUrl from './asset-library/cat.svg?url';
import circleUrl from './asset-library/circle.svg?url';
import cloudUrl from './asset-library/cloud.svg?url';
import fishUrl from './asset-library/fish.svg?url';
import flowerUrl from './asset-library/flower.svg?url';
import heartUrl from './asset-library/heart.svg?url';
import robotUrl from './asset-library/robot.svg?url';
import rocketUrl from './asset-library/rocket.svg?url';
import squareUrl from './asset-library/square.svg?url';
import starUrl from './asset-library/star.svg?url';
import triangleUrl from './asset-library/triangle.svg?url';

export type BuiltinAsset = { id: string; name: string; url: string };

export const BUILTIN_IMAGES: readonly BuiltinAsset[] = [
  { id: 'builtin:cat', name: 'Kucing', url: catUrl },
  { id: 'builtin:ball', name: 'Bola', url: ballUrl },
  { id: 'builtin:arrow', name: 'Panah', url: arrowUrl },
  { id: 'builtin:square', name: 'Kotak', url: squareUrl },
  { id: 'builtin:star', name: 'Bintang', url: starUrl },
  { id: 'builtin:circle', name: 'Lingkaran', url: circleUrl },
  { id: 'builtin:triangle', name: 'Segitiga', url: triangleUrl },
  { id: 'builtin:bug', name: 'Kumbang', url: bugUrl },
  { id: 'builtin:heart', name: 'Hati', url: heartUrl },
  { id: 'builtin:robot', name: 'Robot', url: robotUrl },
  { id: 'builtin:cloud', name: 'Awan', url: cloudUrl },
  { id: 'builtin:flower', name: 'Bunga', url: flowerUrl },
  { id: 'builtin:fish', name: 'Ikan', url: fishUrl },
  { id: 'builtin:rocket', name: 'Roket', url: rocketUrl },
  { id: 'builtin:apple', name: 'Apel', url: appleUrl },
];

export const BUILTIN_BY_ID: ReadonlyMap<string, BuiltinAsset> = new Map(
  BUILTIN_IMAGES.map((asset) => [asset.id, asset]),
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
