import { useEffect, useRef, type RefObject } from 'react';
import { motion } from '../../config/motion.ts';
import type { Mode } from './types.ts';

type LookRefs = {
    gridRef: RefObject<HTMLDivElement | null>;
    galleryRef: RefObject<HTMLDivElement | null>;
    modeRef: RefObject<Mode>;
    lookingRef: RefObject<boolean>;
    lookLockRef: RefObject<boolean>;
};

type TileLook = {
    el: HTMLElement;
    lookEl: HTMLElement | null;
    cx: number;
    cy: number;
    lx: number;
    ly: number;
    wx: number;
    wy: number;
};

type LookApi = {
    markLayoutDirty: () => void;
    setFlipAxes: (x: number, y: number) => void;
    resetLook: () => void;
    releaseToCss: () => void;
};

const LOOK_TICK_MS = 1000 / motion.look.fps;
const LOOK_WRITE_STEP = 0.05;

function quantize(v: number) {
    return Math.round(v / LOOK_WRITE_STEP) * LOOK_WRITE_STEP;
}

function writeLook(t: TileLook, x: number, y: number) {
    const qx = quantize(x);
    const qy = quantize(y);
    if (qx === t.wx && qy === t.wy) return;
    t.wx = qx;
    t.wy = qy;
    if (t.lookEl) t.lookEl.style.transform = `rotateX(${qx}deg) rotateY(${qy}deg)`;
}

function clearLookStyle(t: TileLook) {
    t.wx = 0;
    t.wy = 0;
    if (t.lookEl) t.lookEl.style.transform = '';
}

export function useTileLook({
    gridRef,
    galleryRef,
    modeRef,
    lookingRef,
    lookLockRef,
}: LookRefs) {
    const implRef = useRef<LookApi>({
        markLayoutDirty() {},
        setFlipAxes() {},
        resetLook() {},
        releaseToCss() {},
    });

    const apiRef = useRef<LookApi>({
        markLayoutDirty() {
            implRef.current.markLayoutDirty();
        },
        setFlipAxes(x, y) {
            implRef.current.setFlipAxes(x, y);
        },
        resetLook() {
            implRef.current.resetLook();
        },
        releaseToCss() {
            implRef.current.releaseToCss();
        },
    });

    useEffect(() => {
        const { z, strength, k, kReturn, eps, fps } = motion.look;
        const rad2deg = 180 / Math.PI;
        const lambda = -Math.log(1 - k) * fps;
        const lambdaReturn = -Math.log(1 - kReturn) * fps;

        const target = { x: innerWidth / 2, y: innerHeight / 2 };
        let tiles: TileLook[] = [];
        let dirty = true;
        let raf = 0;
        let running = false;
        let lastLookTs = 0;

        const syncTiles = () => {
            const grid = gridRef.current;
            if (!grid) {
                tiles = [];
                return;
            }

            const kids = grid.children;
            const n = kids.length;
            if (n === tiles.length) {
                let same = true;
                for (let i = 0; i < n; i++) {
                    if (tiles[i].el !== kids[i]) {
                        same = false;
                        break;
                    }
                }
                if (same) return;
            }

            const prev = tiles;
            const next: TileLook[] = [];
            for (let i = 0; i < n; i++) {
                const node = kids[i];
                if (!(node instanceof HTMLElement)) continue;
                const old = prev[i]?.el === node ? prev[i] : undefined;
                next.push({
                    el: node,
                    lookEl: node.firstElementChild instanceof HTMLElement ? node.firstElementChild : null,
                    cx: old?.cx ?? 0,
                    cy: old?.cy ?? 0,
                    lx: old?.lx ?? 0,
                    ly: old?.ly ?? 0,
                    wx: old?.wx ?? NaN,
                    wy: old?.wy ?? NaN,
                });
            }
            tiles = next;
            dirty = true;
        };

        const cacheCenters = () => {
            for (const t of tiles) {
                const r = t.el.getBoundingClientRect();
                t.cx = r.left + r.width / 2;
                t.cy = r.top + r.height / 2;
            }
            dirty = false;
        };

        implRef.current = {
            markLayoutDirty() {
                dirty = true;
            },
            setFlipAxes(x, y) {
                syncTiles();
                for (const t of tiles) {
                    const r = t.el.getBoundingClientRect();
                    const dx = x - (r.left + r.width / 2);
                    const dy = y - (r.top + r.height / 2);
                    const len = Math.hypot(dx, dy);
                    t.el.style.setProperty('--flip-ax', len < 1 ? '1' : String(dy / len));
                    t.el.style.setProperty('--flip-ay', len < 1 ? '0' : String(-dx / len));
                }
            },
            resetLook() {
                syncTiles();
                for (const t of tiles) {
                    t.lx = 0;
                    t.ly = 0;
                    clearLookStyle(t);
                }
            },
            releaseToCss() {
                for (const t of tiles) {
                    t.lx = 0;
                    t.ly = 0;
                    clearLookStyle(t);
                }
            },
        };

        const tick = (ts: number) => {
            running = false;
            if (lookLockRef.current) return;

            syncTiles();
            if (!tiles.length) return;
            if (dirty) cacheCenters();

            if (lastLookTs !== 0 && ts - lastLookTs < LOOK_TICK_MS) {
                running = true;
                raf = requestAnimationFrame(tick);
                return;
            }

            const dt = lastLookTs === 0 ? LOOK_TICK_MS / 1000 : Math.min((ts - lastLookTs) / 1000, 0.05);
            lastLookTs = ts;

            const looking = lookingRef.current;
            const step = 1 - Math.exp(-(looking ? lambda : lambdaReturn) * dt);
            let moving = false;

            for (const t of tiles) {
                const tx = looking ? -Math.atan((target.y - t.cy) / z) * rad2deg * strength : 0;
                const ty = looking ? Math.atan((target.x - t.cx) / z) * rad2deg * strength : 0;

                let nx = t.lx + (tx - t.lx) * step;
                let ny = t.ly + (ty - t.ly) * step;

                if (Math.abs(tx - nx) < eps) nx = tx;
                if (Math.abs(ty - ny) < eps) ny = ty;
                if (nx !== tx || ny !== ty) moving = true;

                t.lx = nx;
                t.ly = ny;
                writeLook(t, nx, ny);
            }

            if (moving) {
                running = true;
                raf = requestAnimationFrame(tick);
            } else {
                lastLookTs = 0;
            }
        };

        const kick = () => {
            if (running || lookLockRef.current) return;
            running = true;
            raf = requestAnimationFrame(tick);
        };

        const onMove = (e: PointerEvent) => {
            const node = e.target as Node;
            const inside =
                modeRef.current === 'fullscreen'
                    ? node instanceof Element && !!node.closest('.gallery__controls')
                    : !!galleryRef.current?.contains(node);
            if (lookLockRef.current) {
                lookingRef.current = false;
                return;
            }
            lookingRef.current = inside;
            if (inside) {
                target.x = e.clientX;
                target.y = e.clientY;
                if (modeRef.current === 'fullscreen') dirty = true;
            }
            kick();
        };

        const onLeave = () => {
            lookingRef.current = false;
            kick();
        };

        const onResize = () => {
            dirty = true;
            kick();
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('resize', onResize);
        document.documentElement.addEventListener('pointerleave', onLeave);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('resize', onResize);
            document.documentElement.removeEventListener('pointerleave', onLeave);
            cancelAnimationFrame(raf);
        };
    }, [galleryRef, gridRef, lookLockRef, lookingRef, modeRef]);

    return apiRef.current;
}
