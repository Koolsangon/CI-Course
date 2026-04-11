/**
 * 사운드 이펙트
 */

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function getAudioCtx() { if (!audioCtx) audioCtx = new AudioCtx(); return audioCtx; }

export function playTone(freq, duration, type = 'sine') {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch(e) {}
}

export function playSubmitSound() { playTone(880, 0.15); setTimeout(() => playTone(1100, 0.2), 100); }
export function playSurpriseSound() { playTone(200, 0.3, 'sawtooth'); setTimeout(() => playTone(150, 0.4, 'sawtooth'), 200); }
export function playTickSound() { playTone(1000, 0.05, 'square'); }
export function playWinSound() { [0, 150, 300, 450].forEach((d, i) => setTimeout(() => playTone([523, 659, 784, 1047][i], 0.3), d)); }
