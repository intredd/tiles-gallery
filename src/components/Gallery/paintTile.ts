import { photos } from '../../data/images.ts';
import type { FaceKind, FacePaint } from './types.ts';

export const wrap = (i: number, n: number) => ((i % n) + n) % n;

export function paintTile(
    kind: FaceKind,
    tileIndex: number,
    currentIndex: number,
    size: number,
): FacePaint {
    const n = photos.length;
    if (kind === 'mosaic') {
        return { src: photos[wrap(currentIndex, n)].src, kind };
    }
    const cells = size * size;
    const pageStart = Math.floor(currentIndex / cells) * cells;
    return {
        src: photos[wrap(pageStart + tileIndex, n)].src,
        kind,
    };
}

export function paintsFor(kind: FaceKind, currentIndex: number, size: number): FacePaint[] {
    const cells = size * size;
    return Array.from({ length: cells }, (_, i) => paintTile(kind, i, currentIndex, size));
}
