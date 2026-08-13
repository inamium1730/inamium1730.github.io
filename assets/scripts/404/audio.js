import { state } from './state.js';

let audioCtx = null;
let isMuted = false;

export const toggleMute = (muteBtn, iconUnmute, iconMute) => {
    isMuted = !isMuted;
    if (isMuted) {
        iconUnmute.classList.add('hidden');
        iconMute.classList.remove('hidden');
    } else {
        iconUnmute.classList.remove('hidden');
        iconMute.classList.add('hidden');
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }
};

export const playBeep = (freq, type = 'square', duration = 0.05) => {
    if (isMuted) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
};
