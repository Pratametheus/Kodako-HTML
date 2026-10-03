import arrowSvg from './asset-library/arrow.svg?raw';
import appleSvg from './asset-library/apple.svg?raw';
import ballSvg from './asset-library/ball.svg?raw';
import bookSvg from './asset-library/book.svg?raw';
import bugSvg from './asset-library/bug.svg?raw';
import cakeSvg from './asset-library/cake.svg?raw';
import catSvg from './asset-library/cat.svg?raw';
import circleSvg from './asset-library/circle.svg?raw';
import cloudSvg from './asset-library/cloud.svg?raw';
import computerSvg from './asset-library/computer.svg?raw';
import fishSvg from './asset-library/fish.svg?raw';
import flowerSvg from './asset-library/flower.svg?raw';
import heartSvg from './asset-library/heart.svg?raw';
import pencilSvg from './asset-library/pencil.svg?raw';
import robotSvg from './asset-library/robot.svg?raw';
import rocketSvg from './asset-library/rocket.svg?raw';
import squareSvg from './asset-library/square.svg?raw';
import starSvg from './asset-library/star.svg?raw';
import sunSvg from './asset-library/sun.svg?raw';
import triangleSvg from './asset-library/triangle.svg?raw';

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

export type BuiltinAsset = { id: string; name: string; url: string };

export const BUILTIN_IMAGES: readonly BuiltinAsset[] = [
  { id: 'builtin:cat', name: 'Kucing', url: svgToDataUrl(catSvg) },
  { id: 'builtin:ball', name: 'Bola', url: svgToDataUrl(ballSvg) },
  { id: 'builtin:arrow', name: 'Panah', url: svgToDataUrl(arrowSvg) },
  { id: 'builtin:square', name: 'Kotak', url: svgToDataUrl(squareSvg) },
  { id: 'builtin:star', name: 'Bintang', url: svgToDataUrl(starSvg) },
  { id: 'builtin:circle', name: 'Lingkaran', url: svgToDataUrl(circleSvg) },
  { id: 'builtin:triangle', name: 'Segitiga', url: svgToDataUrl(triangleSvg) },
  { id: 'builtin:bug', name: 'Kumbang', url: svgToDataUrl(bugSvg) },
  { id: 'builtin:heart', name: 'Hati', url: svgToDataUrl(heartSvg) },
  { id: 'builtin:robot', name: 'Robot', url: svgToDataUrl(robotSvg) },
  { id: 'builtin:cloud', name: 'Awan', url: svgToDataUrl(cloudSvg) },
  { id: 'builtin:flower', name: 'Bunga', url: svgToDataUrl(flowerSvg) },
  { id: 'builtin:fish', name: 'Ikan', url: svgToDataUrl(fishSvg) },
  { id: 'builtin:rocket', name: 'Roket', url: svgToDataUrl(rocketSvg) },
  { id: 'builtin:apple', name: 'Apel', url: svgToDataUrl(appleSvg) },
  { id: 'builtin:book', name: 'Buku', url: svgToDataUrl(bookSvg) },
  { id: 'builtin:pencil', name: 'Pensil', url: svgToDataUrl(pencilSvg) },
  { id: 'builtin:cake', name: 'Kue', url: svgToDataUrl(cakeSvg) },
  { id: 'builtin:computer', name: 'Komputer', url: svgToDataUrl(computerSvg) },
  { id: 'builtin:sun', name: 'Matahari', url: svgToDataUrl(sunSvg) },
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
