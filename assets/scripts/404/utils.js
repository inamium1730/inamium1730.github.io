import { CANVAS_WIDTH } from './constants/maps.js';
import { state } from './state.js';

export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);

export const rectIntersect = (r1, r2) => {
    return !(r2.x > r1.x + r1.w ||
        r2.x + r2.w < r1.x ||
        r2.y > r1.y + r1.h ||
        r2.y + r2.h < r1.y);
};

export const getAutoAimVelocity = (startX, startY, normalVx, normalVy, currentBaseSpeed) => {
    const activeBlocks = state.blocks.filter(bl => bl.active);
    let bestDist = Infinity;
    let bestTarget = null;

    if (activeBlocks.length > 0) {
        let unfoldedBlocks = [];
        activeBlocks.forEach(bl => {
            let cx = bl.x + bl.w / 2;
            let cy = bl.y + bl.h / 2;
            unfoldedBlocks.push({ x: cx, y: cy });
            unfoldedBlocks.push({ x: CANVAS_WIDTH + (CANVAS_WIDTH - cx), y: cy });
            unfoldedBlocks.push({ x: -cx, y: cy });
        });

        for (let target of unfoldedBlocks) {
            let V = { x: target.x - startX, y: target.y - startY };
            let dot = V.x * normalVx + V.y * normalVy;
            if (dot > 0) {
                let dist = Math.abs(V.x * normalVy - V.y * normalVx) / currentBaseSpeed;
                if (dist < bestDist) {
                    bestDist = dist;
                    bestTarget = target;
                }
            }
        }
    }

    if (bestTarget) {
        let dx = bestTarget.x - startX;
        let dy = bestTarget.y - startY;
        let dist = Math.sqrt(dx * dx + dy * dy);
        return {
            vx: (dx / dist) * currentBaseSpeed,
            vy: (dy / dist) * currentBaseSpeed
        };
    } else {
        return { vx: normalVx, vy: normalVy };
    }
};

export const getNeededHealChar = () => {
    const target = ['4', '0', '4'];
    if (state.reserve.length < 3) {
        return target[state.reserve.length];
    }
    return null;
};

export const transferItem = (type) => {
    let available = state.blocks.filter(b => b.active && !b.itemType);
    if (available.length > 0) {
        let randBlock = available[Math.floor(Math.random() * available.length)];
        randBlock.itemType = type;
    }
};
