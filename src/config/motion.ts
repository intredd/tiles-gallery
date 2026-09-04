import type { CSSProperties } from 'react';

export const motion = {
    gapMs: 400,
    gapEase: 'ease-out',
    radiusMs: 400,
    radiusEase: 'ease-out',
    flipMs: 700,
    flipEase: 'ease-in-out',
    staggerMs: 120,
    lookOffMs: 800,
    lookOffEase: 'ease-out',
    perspectivePx: 1000,
    look: {
        z: 400,
        strength: 0.25,
        // atan(offset/z) * halfSize * shift → ~2–4px on a gallery cell
        shift: 0.02,
        k: 0.03,
        kReturn: 0.1,
        eps: 0.001,
        fps: 60,
    },
} as const;

export function motionStyle(): CSSProperties {
    return {
        '--t-gap': `${motion.gapMs}ms`,
        '--e-gap': motion.gapEase,
        '--t-radius': `${motion.radiusMs}ms`,
        '--e-radius': motion.radiusEase,
        '--t-flip': `${motion.flipMs}ms`,
        '--e-flip': motion.flipEase,
        '--t-stagger': `${motion.staggerMs}ms`,
        '--t-look-off': `${motion.lookOffMs}ms`,
        '--e-look-off': motion.lookOffEase,
        '--perspective': `${motion.perspectivePx}px`,
    } as CSSProperties;
}
