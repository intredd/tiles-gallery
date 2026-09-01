export type Mode = 'fullscreen' | 'gallery';

export type FaceKind = 'mosaic' | 'full';

export type FacePaint = {
    src: string;
    kind: FaceKind;
};

export type Spin = 'x' | 'next' | 'prev';

export type Pending =
    | { type: 'go'; delta: 1 | -1 }
    | { type: 'toggle' }
    | { type: 'open'; tileIndex: number };
