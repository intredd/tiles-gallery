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
    cx: number;
    cy: number;
    lx: number;
    ly: number;
};

function collectTiles(grid: HTMLDivElement | null): HTMLElement[] {
    if (!grid) return [];
    return Array.from(grid.children).filter((n): n is HTMLElement => n instanceof HTMLElement);
}

export function useTileLook({
    gridRef,
    galleryRef,
    modeRef,
    lookingRef,
    lookLockRef,
}: LookRefs) {
    const implRef = useRef({
        markLayoutDirty() {},
        setFlipAxes(_x: number, _y: number) {},
        resetLook() {},
    });

    const apiRef = useRef({
        markLayoutDirty() {
            implRef.current.markLayoutDirty();
        },
        setFlipAxes(x: number, y: number) {
            implRef.current.setFlipAxes(x, y);
        },
        resetLook() {
            implRef.current.resetLook();
        },
    });

    useEffect(() => {
        const { z, strength, k, kReturn, eps } = motion.look;
        const rad2deg = 180 / Math.PI;

        const target = { x: innerWidth / 2, y: innerHeight / 2 };
        let tiles: TileLook[] = [];
        let dirty = true;
        let raf = 0;
        let running = false;

        const syncTiles = () => {
            const els = collectTiles(gridRef.current);
            const same =
                els.length === tiles.length && els.every((el, i) => el === tiles[i].el);
            if (same) return;
            tiles = els.map((el, i) => ({
                el,
                cx: 0,
                cy: 0,
                lx: tiles[i]?.lx ?? 0,
                ly: tiles[i]?.ly ?? 0,
            }));
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
                    t.el.style.setProperty('--look-x', '0deg');
                    t.el.style.setProperty('--look-y', '0deg');
                }
            },
        };

        const tick = () => {
            running = false;
            if (lookLockRef.current) return;

            syncTiles();
            if (!tiles.length) return;
            if (dirty) cacheCenters();

            const looking = lookingRef.current;
            const step = looking ? k : kReturn;
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
                t.el.style.setProperty('--look-x', `${nx}deg`);
                t.el.style.setProperty('--look-y', `${ny}deg`);
            }

            if (moving) {
                running = true;
                raf = requestAnimationFrame(tick);
            }
        };

        const kick = () => {
            if (running || lookLockRef.current) return;
            running = true;
            raf = requestAnimationFrame(tick);
        };

        const onMove = (e: PointerEvent) => {
            const t = e.target as Node;
            const inside =
                modeRef.current === 'fullscreen'
                    ? t instanceof Element && !!t.closest('.gallery__controls')
                    : !!galleryRef.current?.contains(t);
            if (lookLockRef.current) {
                lookingRef.current = false;
                return;
            }
            lookingRef.current = inside;
            if (inside) {
                target.x = e.clientX;
                target.y = e.clientY;
                // fullscreen + controls hover animates tile gaps — centers must refresh
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
