import { CSSProperties, useEffect, useRef, useState } from 'react';
import Tile from '../Tile/Tile.tsx';
import { photos } from '../../data/images.ts';
import { motion, motionStyle } from '../../config/motion.ts';
import { paintsFor, wrap } from './paintTile.ts';
import type { FacePaint, Mode, Pending, Spin } from './types.ts';
import { useTileLook } from './useTileLook.ts';
import './Gallery.scss';

function Gallery({ size }: { size: number }) {
    const cells = size * size;
    const pageCount = Math.ceil(photos.length / cells) || 1;

    const [mode, setMode] = useState<Mode>('gallery');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [pageOffset, setPageOffset] = useState<number[]>(() =>
        Array.from({ length: pageCount }, () => 0),
    );
    const [spin, setSpin] = useState<Spin>('x');
    const [spinY, setSpinY] = useState(0);
    const [flipped, setFlipped] = useState(true);
    const [snap, setSnap] = useState(false);
    const [holdGaps, setHoldGaps] = useState(false);
    const [lookOff, setLookOff] = useState(false);
    const [turn, setTurn] = useState(false);

    const pending = useRef<Pending | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const galleryRef = useRef<HTMLDivElement>(null);
    const modeRef = useRef(mode);
    const lookingRef = useRef(false);
    const lookLockRef = useRef(false);

    modeRef.current = mode;

    const look = useTileLook({
        gridRef,
        galleryRef,
        modeRef,
        lookingRef,
        lookLockRef,
    });

    const [frontPaints, setFrontPaints] = useState<FacePaint[]>(() =>
        paintsFor('mosaic', 0, size),
    );
    const [backPaints, setBackPaints] = useState<FacePaint[]>(() =>
        paintsFor('full', 0, size),
    );

    function commitFlip(nextPaints: FacePaint[]) {
        if (flipped) {
            setFrontPaints(nextPaints);
        } else {
            setBackPaints(nextPaints);
        }
        setFlipped((v) => !v);
    }

    function applyOpenFromTile(tileIndex: number) {
        const pageStart = Math.floor(currentIndex / cells) * cells;
        const nextIndex = wrap(pageStart + tileIndex, photos.length);

        setCurrentIndex(nextIndex);
        setPageOffset((prev) => {
            const next = [...prev];
            next[Math.floor(nextIndex / cells)] = nextIndex % cells;
            return next;
        });

        commitFlip(paintsFor('mosaic', nextIndex, size));
        setMode('fullscreen');
    }

    function openFromTile(tileIndex: number, e: React.MouseEvent) {
        if (mode !== 'gallery') return;

        lookLockRef.current = true;
        lookingRef.current = false;
        look.setFlipAxes(e.clientX, e.clientY);
        setHoldGaps(true);
        setTurn(true);

        if (spin !== 'x') {
            setSpin('x');
            setFlipped(Math.abs(spinY) % 2 === 1);
        }

        pending.current = { type: 'open', tileIndex };
        setSnap(true);
    }

    function applyGo(delta: 1 | -1) {
        const nextKind = mode === 'fullscreen' ? 'mosaic' : 'full';
        let nextIndex: number;

        if (mode === 'fullscreen') {
            nextIndex = wrap(currentIndex + delta, photos.length);
            const page = Math.floor(nextIndex / cells);
            setPageOffset((prev) => {
                const next = [...prev];
                next[page] = nextIndex % cells;
                return next;
            });
        } else {
            const page = Math.floor(currentIndex / cells);
            const nextPage = wrap(page + delta, pageCount);
            nextIndex = nextPage * cells + pageOffset[nextPage];
        }

        setSpin(delta === 1 ? 'next' : 'prev');
        setSpinY((y) => y + delta);
        commitFlip(paintsFor(nextKind, nextIndex, size));
        setCurrentIndex(nextIndex);
    }

    function applyToggle() {
        const nextMode: Mode = mode === 'fullscreen' ? 'gallery' : 'fullscreen';
        const nextKind = nextMode === 'gallery' ? 'full' : 'mosaic';
        setSpin('x');
        commitFlip(paintsFor(nextKind, currentIndex, size));
        setMode(nextMode);
    }

    function go(delta: 1 | -1) {
        if (spin === 'x') {
            pending.current = { type: 'go', delta };
            setSpin(delta === 1 ? 'next' : 'prev');
            setSpinY(flipped ? 1 : 0);
            setSnap(true);
            return;
        }
        applyGo(delta);
    }

    function toggleMode() {
        if (spin !== 'x') {
            pending.current = { type: 'toggle' };
            setSpin('x');
            setFlipped(Math.abs(spinY) % 2 === 1);
            setSnap(true);
            return;
        }
        applyToggle();
    }

    // Snap is a one-frame "transition: none" paint so the next flip can change axis
    // without interpolating from the previous rotateX/rotateY. apply* read state from
    // this commit on purpose — do not add them to the dep array.
    useEffect(() => {
        if (!snap) return;

        const job = pending.current;
        pending.current = null;

        if (job) {
            setSnap(false);
            if (job.type === 'go') applyGo(job.delta);
            if (job.type === 'toggle') applyToggle();
            if (job.type === 'open') applyOpenFromTile(job.tileIndex);
            return;
        }

        const id = requestAnimationFrame(() => {
            requestAnimationFrame(() => setSnap(false));
        });
        return () => cancelAnimationFrame(id);
    }, [snap]);

    useEffect(() => {
        look.markLayoutDirty();
    }, [holdGaps, mode, look]);

    useEffect(() => {
        if (!holdGaps) {
            if (!lookLockRef.current) {
                setLookOff(false);
                return;
            }

            const gapsStay =
                modeRef.current === 'fullscreen' &&
                !!galleryRef.current?.querySelector('.gallery__controls:hover');
            if (gapsStay) {
                setLookOff(false);
                lookLockRef.current = false;
                lookingRef.current = true;
                return;
            }

            const onEnd = (e: TransitionEvent) => {
                if (e.propertyName !== 'transform') return;
                if (!(e.target instanceof HTMLElement) || !e.target.classList.contains('tile')) return;
                gridRef.current?.removeEventListener('transitionend', onEnd);
                setLookOff(false);
                lookLockRef.current = false;
            };
            gridRef.current?.addEventListener('transitionend', onEnd);
            return () => gridRef.current?.removeEventListener('transitionend', onEnd);
        }

        let lookTimer = 0;
        const arm = window.requestAnimationFrame(() => {
            setLookOff(true);
            lookTimer = window.setTimeout(() => {
                look.resetLook();
                setTurn(false);
                setSnap(true);
                setHoldGaps(false);
            }, motion.lookOffMs);
        });

        return () => {
            window.cancelAnimationFrame(arm);
            window.clearTimeout(lookTimer);
        };
    }, [holdGaps, look]);

    return (
        <div
            className="gallery"
            ref={galleryRef}
            data-mode={mode}
            data-hold-gaps={holdGaps || undefined}
            data-look-off={lookOff || undefined}
            data-turn={turn || undefined}
            style={{ ...motionStyle(), '--size': `${size}` } as CSSProperties}
        >
            <button
                className="gallery__controls gallery__controls--view"
                type="button"
                onClick={toggleMode}
            >
                {mode === 'fullscreen' ? 'gallery' : 'fullscreen'}
            </button>
            <button
                className="gallery__controls gallery__controls--prev"
                type="button"
                aria-label="Previous"
                onClick={() => go(-1)}
            />
            <div className="gallery__grid" ref={gridRef}>
                {Array.from({ length: cells }, (_, index) => (
                    <Tile
                        key={index}
                        size={size}
                        index={index}
                        front={frontPaints[index]}
                        back={backPaints[index]}
                        spin={spin}
                        spinY={spinY}
                        flipped={flipped}
                        snap={snap}
                        onSelect={openFromTile}
                    />
                ))}
            </div>
            <button
                className="gallery__controls gallery__controls--next"
                type="button"
                aria-label="Next"
                onClick={() => go(1)}
            />
        </div>
    );
}

export default Gallery;
