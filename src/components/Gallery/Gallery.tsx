import { CSSProperties, useEffect, useRef, useState } from 'react';
import Tile from '../Tile/Tile.tsx'
import { photos } from '../../data/images.ts'
import { motion, motionStyle } from '../../config/motion.ts'
import './Gallery.scss';

type Mode = 'fullscreen' | 'gallery';

type FaceKind = 'mosaic' | 'full';

type FacePaint = {
    src: string;
    kind: FaceKind;
};

type Spin = 'x' | 'next' | 'prev';

const wrap = (i: number, n: number) => ((i % n) + n) % n;


function paintTile(kind: FaceKind, tileIndex: number, currentIndex: number, size: number): FacePaint {
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


function Gallery({size}: {size: number}) {
    const cells = size * size;
    const pageCount = photos.length / cells;

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


    const pending = useRef<null
        | { type: 'go'; delta: 1 | -1 }
        | { type: 'toggle' }
        | { type: 'open'; tileIndex: number }
    >(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const modeRef = useRef(mode);
    const lookingRef = useRef(false);
    const lookLockRef = useRef(false);
    const galleryRef = useRef<HTMLDivElement>(null);

    modeRef.current = mode;

    const [frontPaints, setFrontPaints] = useState<FacePaint[]>(() =>
        Array.from({ length: cells }, (_, i) => paintTile('mosaic', i, 0, size)),
    );
    const [backPaints, setBackPaints] = useState<FacePaint[]>(() =>
        Array.from({ length: cells }, (_, i) => paintTile('full', i, 0, size)),
    );

    function commitFlip(nextPaints: FacePaint[]) {
        if (flipped) {
            setFrontPaints(nextPaints);
        } else {
            setBackPaints(nextPaints);
        }
        setFlipped((v) => !v);
    }

    function setFlipAxes(x: number, y: number) {
        gridRef.current?.querySelectorAll<HTMLElement>('.tile').forEach((el) => {
            const r = el.getBoundingClientRect();
            const dx = x - (r.left + r.width / 2);
            const dy = y - (r.top + r.height / 2);
            const len = Math.hypot(dx, dy);
            el.style.setProperty('--flip-ax', len < 1 ? '1' : String(dy / len));
            el.style.setProperty('--flip-ay', len < 1 ? '0' : String(-dx / len));
        });
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

        commitFlip(
            Array.from({ length: cells }, (_, i) =>
            paintTile('mosaic', i, nextIndex, size),
            ),
        );
        setMode('fullscreen');
    }

    function openFromTile(tileIndex: number, e: React.MouseEvent) {
        if (mode !== 'gallery') return;

        lookLockRef.current = true;
        lookingRef.current = false;
        setFlipAxes(e.clientX, e.clientY);
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
        const nextKind: FaceKind = mode === 'fullscreen' ? 'mosaic' : 'full';
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
        commitFlip(
            Array.from({ length: cells }, (_, i) =>
                paintTile(nextKind, i, nextIndex, size),
            ),
        );
        setCurrentIndex(nextIndex);
    }

    function applyToggle() {
        const nextMode = mode === 'fullscreen' ? 'gallery' : 'fullscreen';
        const nextKind: FaceKind = nextMode === 'gallery' ? 'full' : 'mosaic';
        setSpin('x');
        commitFlip(
            Array.from({ length: cells }, (_, i) =>
                paintTile(nextKind, i, currentIndex, size),
            ),
        );
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
        const { z, strength, k, kReturn, eps } = motion.look;
        const rad2deg = 180 / Math.PI;

        const target = { x: innerWidth / 2, y: innerHeight / 2 };
        let raf = 0;
        let running = false;

        const tick = () => {
            running = false;
            const tiles = gridRef.current?.querySelectorAll<HTMLElement>('.tile');
            if (!tiles || lookLockRef.current) return;

            let moving = false;
            tiles.forEach((el) => {
                const r = el.getBoundingClientRect();
                const dx = target.x - (r.left + r.width / 2);
                const dy = target.y - (r.top + r.height / 2);
                const looking = lookingRef.current;

                const tx = looking ? -Math.atan(dy / z) * rad2deg * strength : 0;
                const ty = looking ?  Math.atan(dx / z) * rad2deg * strength : 0;

                const cx = Number(el.dataset.lx ?? 0);
                const cy = Number(el.dataset.ly ?? 0);
                const step = looking ? k : kReturn;

                let nx = cx + (tx - cx) * step;
                let ny = cy + (ty - cy) * step;

                if (Math.abs(tx - nx) < eps) nx = tx;
                if (Math.abs(ty - ny) < eps) ny = ty;
                if (nx !== tx || ny !== ty) moving = true;

                el.dataset.lx = String(nx);
                el.dataset.ly = String(ny);
                el.style.setProperty('--look-x', `${nx}deg`);
                el.style.setProperty('--look-y', `${ny}deg`);
            });

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
            }
            kick();
        };

        const onLeave = () => {
            lookingRef.current = false;
            kick();
        };
        window.addEventListener('pointermove', onMove);
        document.documentElement.addEventListener('pointerleave', onLeave);
        return () => {
            window.removeEventListener('pointermove', onMove);
            document.documentElement.removeEventListener('pointerleave', onLeave);
            cancelAnimationFrame(raf);
        };
    }, []);

    useEffect(() => {
        if (!holdGaps) {
            if (!lookLockRef.current) {
                setLookOff(false);
                return;
            }

            const gapsStay = modeRef.current === 'fullscreen' && !!galleryRef.current?.querySelector('.gallery__controls:hover');
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
                gridRef.current?.querySelectorAll<HTMLElement>('.tile').forEach((el) => {
                    el.dataset.lx = '0';
                    el.dataset.ly = '0';
                    el.style.setProperty('--look-x', '0deg');
                    el.style.setProperty('--look-y', '0deg');
                });
                setTurn(false);
                setSnap(true);
                setHoldGaps(false);
            }, motion.lookOffMs);
        });
    
        return () => {
            window.cancelAnimationFrame(arm);
            window.clearTimeout(lookTimer);
        };
    }, [holdGaps]);

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
            <button className='gallery__controls gallery__controls--view' id='view' onClick={toggleMode}>{mode == 'fullscreen' ? 'gallery' : 'fullscreen' }</button>
            <button
                className="gallery__controls gallery__controls--prev"
                id="nav-prev"
                type="button"
                aria-label="Previous"
                onClick={() => go(-1)}
            />
            <div className="gallery__grid" ref={gridRef}>
                {Array.from({ length: size * size }, (_, index) => (
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
                id="nav-next"
                type="button"
                aria-label="Next"
                onClick={() => go(1)}
            />
        </div>
    )
}

export default Gallery