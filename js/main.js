'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION STATE
// ─────────────────────────────────────────────────────────────────────────────
const Sim = {
    running:            false,
    idx:                0,
    depthF:             DEPTH_MIN,
    speed:              1,           // 1×, 2×, 5×, 10×
    lastTime:           0,
    FT_PER_SEC:         0.8,         // 0.8 ft/s (~1.25s per foot)
    actualMudWeight:    18.50,       // Persistent single source of truth
    persistentActualMW: null         // Set when Kill Mud Weight is applied by user
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO SYNTHESIZER (Web Audio API)
// Distinct programmatic alert sounds for:
// 1. KICK_WARNING: Short repeating warning beep (Beep ... pause ... Beep ... pause)
// 2. KICK_SUSPECTED: Faster warning pattern (Beep-Beep ... pause ... Beep-Beep)
// 3. KICK_CONFIRMED: Distinct emergency alarm (3 stronger pulses followed by pause)
// 4. FRACTURE_RISK: Distinct descending dual-tone pattern (580 Hz -> 420 Hz)
// 5. WELL_STABILIZED: One short confirmation chime (C5 -> E5 -> G5)
// ─────────────────────────────────────────────────────────────────────────────
const SoundManager = {
    ctx: null,
    mode: 'NONE', // 'NONE' | 'KICK_WARNING' | 'KICK_SUSPECTED' | 'KICK_CONFIRMED' | 'FRACTURE_RISK'
    muted: false,
    timer: null,

    ensureCtx() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    setMode(newMode) {
        if (this.mode === newMode) return;
        this.stopCurrent();
        this.mode = newMode;
        if (!this.muted && this.mode !== 'NONE' && Sim.running) {
            this.startPattern(this.mode);
        }
    },

    stopCurrent() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },

    toggleMute() {
        this.muted = !this.muted;
        const btn = document.getElementById('btnMute');
        if (btn) {
            if (this.muted) {
                this.stopCurrent();
                btn.textContent = '🔇 MUTED';
                btn.classList.add('muted');
            } else {
                btn.textContent = '🔊 SOUND ON';
                btn.classList.remove('muted');
                if (this.mode !== 'NONE' && Sim.running) {
                    this.startPattern(this.mode);
                }
            }
        }
    },

    // 1. KICK_WARNING: Short repeating warning beep (Beep ... pause ... Beep ... pause)
    playWarningBeep() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(740, t);
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.08, t + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.20);
        } catch (e) {}
    },

    // 2. KICK_SUSPECTED: Faster warning pattern (Beep-Beep ... pause ... Beep-Beep)
    playSuspectedPattern() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            [0, 0.13].forEach(delay => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, t + delay);
                gain.gain.setValueAtTime(0.0001, t + delay);
                gain.gain.exponentialRampToValueAtTime(0.09, t + delay + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.09);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t + delay);
                osc.stop(t + delay + 0.11);
            });
        } catch (e) {}
    },

    // 3. KICK_CONFIRMED: Distinct emergency alarm (3 stronger pulses ramping frequency, then pause)
    playConfirmedAlarm() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            [0, 0.15, 0.30].forEach((delay, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                const f0 = 920 + idx * 40;
                osc.frequency.setValueAtTime(f0, t + delay);
                osc.frequency.linearRampToValueAtTime(1180, t + delay + 0.10);
                gain.gain.setValueAtTime(0.0001, t + delay);
                gain.gain.exponentialRampToValueAtTime(0.10, t + delay + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.11);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t + delay);
                osc.stop(t + delay + 0.12);
            });
        } catch (e) {}
    },

    // 4. FRACTURE_RISK: Distinct warning tone/pattern (descending chime/tone: 580 Hz -> 420 Hz)
    playFractureTone() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            // Tone 1: 580 Hz
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(580, t);
            gain1.gain.setValueAtTime(0.0001, t);
            gain1.gain.exponentialRampToValueAtTime(0.10, t + 0.03);
            gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
            osc1.connect(gain1);
            gain1.connect(this.ctx.destination);
            osc1.start(t);
            osc1.stop(t + 0.24);

            // Tone 2: 420 Hz (descending)
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(420, t + 0.25);
            gain2.gain.setValueAtTime(0.0001, t + 0.25);
            gain2.gain.exponentialRampToValueAtTime(0.11, t + 0.28);
            gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.50);
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start(t + 0.25);
            osc2.stop(t + 0.52);
        } catch (e) {}
    },

    // 5. WELL_STABILIZED: One short confirmation chime (C5 -> E5 -> G5)
    playStabilizedChime() {
        if (!this.ctx || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            const chord = [523.25, 659.25, 783.99]; // C5, E5, G5
            chord.forEach((freq, idx) => {
                const delay = idx * 0.10;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t + delay);
                gain.gain.setValueAtTime(0.0001, t + delay);
                gain.gain.exponentialRampToValueAtTime(0.08, t + delay + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + delay + 0.70);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t + delay);
                osc.stop(t + delay + 0.75);
            });
        } catch (e) {}
    },

    startPattern(mode) {
        this.stopCurrent();
        if (mode === 'KICK_WARNING') {
            this.playWarningBeep();
            this.timer = setInterval(() => this.playWarningBeep(), 950);
        } else if (mode === 'KICK_SUSPECTED') {
            this.playSuspectedPattern();
            this.timer = setInterval(() => this.playSuspectedPattern(), 850);
        } else if (mode === 'KICK_CONFIRMED') {
            this.playConfirmedAlarm();
            this.timer = setInterval(() => this.playConfirmedAlarm(), 1100);
        } else if (mode === 'FRACTURE_RISK') {
            this.playFractureTone();
            this.timer = setInterval(() => this.playFractureTone(), 1350);
        }
    },

    stopAll() {
        this.stopCurrent();
        this.mode = 'NONE';
    }
};

function toggleMute() {
    SoundManager.ensureCtx();
    SoundManager.toggleMute();
}

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH & ANIMATION LOOP
// ─────────────────────────────────────────────────────────────────────────────
let prevState = null;

function refreshUI(idx) {
    const state = SimData.states[idx];
    updateDepthDisplay(Sim.depthF);
    updateTopBar(idx);
    updateStatus(state);
    updateWellControlUI(WellControl, Sim.depthF);
    updateAllCharts(idx);
    highlightEventColumn(Sim.depthF);

    // Audio trigger based on condition
    if (state.soundMode) {
        if (state.soundMode === 'NONE' && prevState?.soundMode && prevState.soundMode !== 'NONE') {
            SoundManager.stopAll();
            SoundManager.playStabilizedChime();
        } else {
            SoundManager.setMode(state.soundMode);
        }
    } else if (state.siren && !prevState?.siren) {
        SoundManager.setMode(state.type === 'fracture' ? 'FRACTURE_RISK' : 'KICK_WARNING');
    } else if (!state.siren && prevState?.siren) {
        SoundManager.stopAll();
        SoundManager.playStabilizedChime();
    }
    prevState = state;
}

function updateChartCursors() {
    gCursorDepth = Sim.depthF;
    if (pressureChart) pressureChart.update('none');
    if (flowChart)     flowChart.update('none');
    if (mwChart)       mwChart.update('none');
    if (ropChart)      ropChart.update('none');
    if (pitChart)      pitChart.update('none');
    highlightEventColumn(Sim.depthF);
}

function loop(ts) {
    if (!Sim.running) return;

    const elapsed = Math.min(ts - Sim.lastTime, 150);
    Sim.lastTime  = ts;
    const dt = (elapsed / 1000) * Sim.speed;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. ACTIVE WELL CONTROL SEQUENCE (DEPTH PAUSED)
    // ─────────────────────────────────────────────────────────────────────────
    if (WellControl.active) {
        const wcRes = WellControl.tick(dt, Sim.depthF);

        if (wcRes) {
            // Sound trigger on stage transition
            if (WellControl.justStabilized) {
                SoundManager.stopAll();
                SoundManager.playStabilizedChime();
            } else if (wcRes.soundMode) {
                SoundManager.setMode(wcRes.soundMode);
            }

            updateTopBar(Sim.idx, wcRes);
            updateStatus(wcRes);
            updateWellControlUI(WellControl, Sim.depthF, wcRes);

            // Reflect kill mud weight and rising BHP continuously on charts at paused depth
            SimData.bhp[Sim.idx]      = wcRes.bhp;
            SimData.liveBhp[Sim.idx]  = wcRes.bhp;
            SimData.aMW[Sim.idx]      = wcRes.aMW;
            if (wcRes.rop !== undefined)     SimData.rop[Sim.idx]     = wcRes.rop;
            if (wcRes.torque !== undefined)  SimData.torque[Sim.idx]  = wcRes.torque;
            if (wcRes.flowOut !== undefined) SimData.flowOut[Sim.idx] = wcRes.flowOut;

            updateAllCharts(Sim.idx);
            updateChartCursors();
        }

        requestAnimationFrame(loop);
        return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. NORMAL PROGRESSION & WELL CONTROL TRIGGER
    // ─────────────────────────────────────────────────────────────────────────
    const prevDepth = Sim.depthF;
    Sim.depthF += (Sim.speed * Sim.FT_PER_SEC * elapsed) / 1000;

    // Kick 1 indication (1310 - 1340 ft)
    if (Sim.depthF >= 1310 && Sim.depthF < 1340 && !WellControl.completedKicks[1]) {
        if (WellControl.mode === 'NORMAL') {
            WellControl.startKickIndication(1);
            SoundManager.setMode('KICK_WARNING');
        }
    }

    // Kick 1 limit (1340 ft): if user has not clicked TURN OFF DRILLING yet, hold depth at 1340 ft
    if (Sim.depthF >= 1340 && !WellControl.completedKicks[1]) {
        Sim.depthF = 1340;
        Sim.idx = 1340 - DEPTH_MIN;
        if (WellControl.mode === 'NORMAL') {
            WellControl.startKickIndication(1);
            SoundManager.setMode('KICK_WARNING');
        }
        refreshUI(Sim.idx);
        updateChartCursors();
        requestAnimationFrame(loop);
        return;
    }

    // Kick 2 indication (1370 - 1390 ft)
    if (Sim.depthF >= 1370 && Sim.depthF < 1390 && !WellControl.completedKicks[2]) {
        if (WellControl.mode === 'NORMAL') {
            WellControl.startKickIndication(2);
            SoundManager.setMode('KICK_WARNING');
        }
    }

    // Kick 2 limit (1390 ft): if user has not clicked TURN OFF DRILLING yet, hold depth at 1390 ft
    if (Sim.depthF >= 1390 && !WellControl.completedKicks[2]) {
        Sim.depthF = 1390;
        Sim.idx = 1390 - DEPTH_MIN;
        if (WellControl.mode === 'NORMAL') {
            WellControl.startKickIndication(2);
            SoundManager.setMode('KICK_WARNING');
        }
        refreshUI(Sim.idx);
        updateChartCursors();
        requestAnimationFrame(loop);
        return;
    }

    // Completion at DEPTH_MAX (1650 ft)
    if (Sim.depthF >= DEPTH_MAX) {
        Sim.depthF   = DEPTH_MAX;
        Sim.idx      = TOTAL_POINTS - 1;
        Sim.running  = false;
        refreshUI(Sim.idx);
        updateChartCursors();
        SoundManager.stopAll();
        setBadge('COMPLETE');
        return;
    }

    const newIdx = Math.min(Math.floor(Sim.depthF - DEPTH_MIN), TOTAL_POINTS - 1);
    updateChartCursors();

    if (newIdx > Sim.idx) {
        // Guarantee that if a manual KMW has been applied, all forward depths strictly maintain it
        if (Sim.persistentActualMW) {
            for (let i = Sim.idx + 1; i <= newIdx; i++) {
                const d = SimData.depths[i];
                if (d >= 1440 && d <= 1460) {
                    Sim.persistentActualMW = lerp(ACTUAL_MW_KP, d);
                } else if (d > 1460 && d <= 1520) {
                    Sim.persistentActualMW = 35.50;
                } else if (d > 1520 && d <= 1540) {
                    Sim.persistentActualMW = lerp(ACTUAL_MW_KP, d);
                } else if (d > 1540) {
                    Sim.persistentActualMW = lerp(ACTUAL_MW_KP, d);
                }

                Sim.actualMudWeight = +(Sim.persistentActualMW).toFixed(2);
                SimData.aMW[i]      = Sim.actualMudWeight;
                SimData.bhp[i]      = Math.round(0.052 * Sim.actualMudWeight * d + sensorNoiseBhp(d) * 0.35);
                SimData.liveBhp[i]  = Math.round(0.052 * Sim.actualMudWeight * d + sensorNoiseBhp(d));
            }
        }
        Sim.idx = newIdx;
        refreshUI(Sim.idx);
    } else {
        updateDepthDisplay(Sim.depthF);
    }

    requestAnimationFrame(loop);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLS
// ─────────────────────────────────────────────────────────────────────────────
function startSim() {
    SoundManager.ensureCtx();
    if (Sim.depthF >= DEPTH_MAX) resetSim();
    if (!prevState) prevState = SimData.states[0];
    Sim.running  = true;
    Sim.lastTime = performance.now();
    setBadge('RUNNING');
    if (SoundManager.mode !== 'NONE') {
        SoundManager.startPattern(SoundManager.mode);
    }
    requestAnimationFrame(loop);
}

function pauseSim() {
    Sim.running = false;
    SoundManager.stopCurrent();
    setBadge('PAUSED');
}

function resetSim() {
    Sim.running            = false;
    Sim.idx                = 0;
    Sim.depthF             = DEPTH_MIN;
    Sim.actualMudWeight    = 18.50;
    Sim.persistentActualMW = null;
    prevState              = null;
    gCursorDepth           = DEPTH_MIN;
    SoundManager.stopAll();
    WellControl.reset();
    resetCharts();
    refreshUI(0);
    updateChartCursors();
    setBadge('STANDBY');
}

function setBadge(status) {
    const el = document.getElementById('simBadge');
    if (el) {
        el.textContent = '● ' + status;
        el.className   = 'sim-badge badge-' + status.toLowerCase();
    }
}

function advanceTo(targetDepth) {
    WellControl.reset();
    if (targetDepth >= 1340) {
        WellControl.completedKicks[1] = true;
        Sim.persistentActualMW = 22.00;
        Sim.actualMudWeight = 22.00;
        applyKillMudWeight(1, 1340);
    }
    if (targetDepth >= 1390) {
        WellControl.completedKicks[2] = true;
        Sim.persistentActualMW = 40.26;
        Sim.actualMudWeight = 40.26;
        applyKillMudWeight(2, 1390);
    }

    const endIdx = Math.min(Math.floor(targetDepth - DEPTH_MIN), TOTAL_POINTS - 1);
    for (let i = 0; i <= endIdx; i++) {
        Sim.idx = i;
        Sim.depthF = SimData.depths[i];
        gCursorDepth = Sim.depthF;
        refreshUI(i);
    }
    updateChartCursors();
}

window.Sim = Sim;
window.SoundManager = SoundManager;
window.advanceTo = advanceTo;
window.startSim = startSim;
window.pauseSim = pauseSim;
window.resetSim = resetSim;

// ─────────────────────────────────────────────────────────────────────────────
// EVENT LISTENERS & ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initCharts();
    refreshUI(0);
    updateChartCursors();
    setBadge('STANDBY');

    document.getElementById('btnStart')?.addEventListener('click', startSim);
    document.getElementById('btnPause')?.addEventListener('click', pauseSim);
    document.getElementById('btnReset')?.addEventListener('click', resetSim);
    document.getElementById('btnMute')?.addEventListener('click', toggleMute);

    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            Sim.speed = parseFloat(btn.dataset.speed);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // WELL CONTROL USER ACTION BUTTON LISTENERS
    // ─────────────────────────────────────────────────────────────────────────
    document.getElementById('btnStopDrilling')?.addEventListener('click', () => {
        SoundManager.ensureCtx();
        if (WellControl.mode === 'KICK_INDICATION') {
            WellControl.userStopDrilling();
            SoundManager.setMode('KICK_SUSPECTED');
            updateWellControlUI(WellControl, Sim.depthF);
            if (!Sim.running) startSim();
        }
    });

    document.getElementById('btnStopPump')?.addEventListener('click', () => {
        SoundManager.ensureCtx();
        if (WellControl.mode === 'DRILLING_STOPPED') {
            WellControl.userStopPump();
            SoundManager.setMode('KICK_CONFIRMED');
            updateWellControlUI(WellControl, Sim.depthF);
            if (!Sim.running) startSim();
        }
    });

    document.getElementById('btnShutIn')?.addEventListener('click', () => {
        SoundManager.ensureCtx();
        if (WellControl.mode === 'FLOW_CHECK') {
            WellControl.userShutIn();
            SoundManager.setMode('KICK_CONFIRMED');
            updateWellControlUI(WellControl, Sim.depthF);
            if (!Sim.running) startSim();
        }
    });

    document.getElementById('btnCalcKmw')?.addEventListener('click', () => {
        SoundManager.ensureCtx();
        if (WellControl.mode === 'SHUT_IN') {
            WellControl.userCalculateKmw(Sim.depthF);
            updateWellControlUI(WellControl, Sim.depthF);
            if (!Sim.running) startSim();
        }
    });

    document.getElementById('btnApplyKmw')?.addEventListener('click', () => {
        SoundManager.ensureCtx();
        if (WellControl.mode === 'KMW_CALCULATED') {
            WellControl.userApplyKmw(Sim.depthF);
            SoundManager.setMode('KICK_CONFIRMED');
            updateWellControlUI(WellControl, Sim.depthF);
            if (!Sim.running) startSim();
        }
    });

    document.getElementById('btnResumeDrilling')?.addEventListener('click', () => {
        SoundManager.ensureCtx();
        if (WellControl.mode === 'WELL_STABILIZED') {
            WellControl.userResumeDrilling();
            SoundManager.stopAll();
            updateWellControlUI(WellControl, Sim.depthF);
            if (!Sim.running) startSim();
        }
    });

    const params = new URLSearchParams(window.location.search);
    if (params.has('depth')) {
        const d = parseFloat(params.get('depth'));
        advanceTo(d);
        setBadge('PAUSED');
    } else if (params.get('autostart') === 'true') {
        startSim();
    }
});
