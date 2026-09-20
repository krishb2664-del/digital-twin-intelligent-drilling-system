'use strict';

const DEPTH_MIN = 1200;
const DEPTH_MAX = 1650;
const TOTAL_POINTS = DEPTH_MAX - DEPTH_MIN + 1; // 451

// ─────────────────────────────────────────────────────────────────────────────
// EVENT INTERVALS FOR DEPTH-WISE TABLE AND MARKERS (11 scenario intervals)
// ─────────────────────────────────────────────────────────────────────────────
const EVENT_COLUMNS = [
    { id: 'col-1200-1310', min: 1200, max: 1309.9, depth: '1200–1310', event: 'Formation 1 Stable',           behavior: 'Normal stable drilling, Safe Window, Siren OFF' },
    { id: 'col-1310-1340', min: 1310, max: 1339.9, depth: '1310–1340', event: 'Formation 2 Kick Indication',  behavior: 'BHP < FP, Flow Out ↑, Kick active, Siren ON' },
    { id: 'col-1340-1360', min: 1340, max: 1359.9, depth: '1340–1360', event: 'Driller Response (MW ↑)',      behavior: 'MW increases, BHP enters Safe Window, Siren OFF' },
    { id: 'col-1360-1370', min: 1360, max: 1369.9, depth: '1360–1370', event: 'Formation 2 Stable',           behavior: 'Stable drilling after kick 1, Safe Window, Siren OFF' },
    { id: 'col-1370-1390', min: 1370, max: 1389.9, depth: '1370–1390', event: 'Abnormal Drilling / Kick',    behavior: 'Flow Out ↑, ROP ↑, Kick Risk ↑, Siren ON' },
    { id: 'col-1390-1440', min: 1390, max: 1439.9, depth: '1390–1440', event: 'MW ↑ toward 40.26 ppg',        behavior: 'Rec. MW 40.26, MW ↑, Params normalize, Siren OFF' },
    { id: 'col-1440-1460', min: 1440, max: 1459.9, depth: '1440–1460', event: 'MW ↓ toward 35.50 ppg',        behavior: 'Rec. MW 35.50, Flow Out ↓, ROP ↓, Safe Window' },
    { id: 'col-1460-1490', min: 1460, max: 1489.9, depth: '1460–1490', event: 'Formation 2 Stable',           behavior: 'Normal drilling, MW ~35.50 ppg, Siren OFF' },
    { id: 'col-1490-1520', min: 1490, max: 1519.9, depth: '1490–1520', event: 'Formation 3 Fracture Risk',    behavior: 'BHP > Frac, Fracture Risk, Flow loss, Siren ON' },
    { id: 'col-1520-1540', min: 1520, max: 1539.9, depth: '1520–1540', event: 'Driller Response (MW ↓)',      behavior: 'MW decreases, BHP enters Safe Window, Siren OFF' },
    { id: 'col-1540-1650', min: 1540, max: 1650.0, depth: '1540–1650', event: 'Formation 3 Stable',           behavior: 'Stable drilling to 1650 ft, Siren OFF' }
];

// ─────────────────────────────────────────────────────────────────────────────
// PRESSURE KEYPOINTS [depth_ft, pressure_psi]
//
// Continuous engineering reference curves for Formation Pressure and Fracture
// Pressure. Formation 2 maintains a smooth, continuous, unchanged profile across
// 1310–1490 ft (including 1370–1440 ft, where reference lines do not jump).
// ─────────────────────────────────────────────────────────────────────────────

// Formation Pressure (Red dashed reference curve)
const FP_KP = [
    [1200, 1000],
    [1309, 1120],
    [1310, 1420],  // Formation 2 starts: FP increases to 1420 psi (> BHP 1260 psi -> Kick 1)
    [1340, 1450],
    [1360, 1475],
    [1440, 1565],  // Smooth, unchanged Formation 2 reference curve throughout 1370-1440 ft
    [1490, 1620],
    [1540, 1860],  // Formation 3 begins
    [1650, 1950]
];

// Fracture Pressure (White/gray dashed reference curve)
const FRAC_KP = [
    [1200, 2100],
    [1309, 2250],
    [1310, 2400],  // Formation 2 begins
    [1370, 2700],
    [1440, 3250],  // Smooth, unchanged Formation 2 reference curve throughout 1370-1440 ft
    [1489, 3350],  // Formation 2 continuous
    [1490, 2680],  // Formation 3 lower fracture gradient (< BHP 2750 psi -> Frac Risk)
    [1520, 2700],
    [1540, 2720],
    [1650, 2950]
];

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONAL PARAMETER KEYPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// Actual Mud Weight (ppg) — smooth gradual transitions, delayed responses
const ACTUAL_MW_KP = [
    [1200, 18.50],
    [1310, 18.50],  // 1200-1310 Formation 1 Stable, no jump at 1310
    [1340, 18.50],  // 1310-1340 No response yet, MW unchanged
    [1345, 19.30],  // 1340-1360 Driller responds: gradual increase
    [1350, 20.30],
    [1355, 21.30],
    [1360, 22.00],  // 1360-1370 First kick controlled, stable
    [1369, 22.00],
    [1370, 22.00],  // 1370-1390 Abnormal condition, MW initially unchanged
    [1390, 22.00],  // 1390 Driller starts gradual increase toward 40.26 ppg
    [1395, 23.00],
    [1400, 24.80],
    [1405, 27.20],
    [1410, 30.50],
    [1415, 33.80],
    [1420, 36.50],
    [1430, 39.00],
    [1440, 40.26],  // EXACTLY 40.26 ppg reached
    [1445, 39.50],  // 1440-1460 Controlled reduction toward 35.50 ppg
    [1450, 38.00],
    [1455, 36.50],
    [1460, 35.50],  // EXACTLY 35.50 ppg reached
    [1490, 35.50],  // Formation 3 begins, MW initially unchanged
    [1520, 35.50],  // 1490-1520 No response yet
    [1525, 34.00],  // 1520-1540 Driller reduces MW toward 28.50 ppg
    [1530, 32.00],
    [1535, 30.00],
    [1540, 28.50],  // Safe operating MW reached
    [1650, 29.00]   // Stable drilling to TD
];

// Recommended Mud Weight (ppg) — reference target
const REC_MW_KP = [
    [1200, 18.50], [1309, 18.50],
    [1310, 22.00], [1360, 22.00],
    [1369, 22.00],
    [1370, 40.26], [1440, 40.26],
    [1441, 35.50], [1489, 35.50],
    [1490, 28.50], [1540, 28.50],
    [1650, 29.00]
];

// Flow In (gpm) — circulation baseline
const FLOW_IN_KP = [[1200, 490], [1650, 490]];

// Flow Out (gpm) — influx surge, recovery, lower trend at 1440, and lost circulation
const FLOW_OUT_KP = [
    [1200, 490], [1309, 490],
    [1310, 520], [1320, 550], [1340, 545],     // Kick 1 influx (Flow Out > Flow In)
    [1350, 515], [1360, 490],                 // Driller weighting up -> recovered
    [1369, 490],
    [1370, 495], [1374, 525], [1380, 555], [1390, 568], // Kick 2: Flow Out gradually increases abnormally
    [1400, 545], [1410, 520], [1418, 502], [1430, 492], [1440, 490], // Driller weighting up -> recovered
    [1445, 480], [1455, 485], [1460, 490],     // 1440 ft Flow Out lower trend then stabilizes
    [1489, 490],
    [1490, 460], [1500, 440], [1510, 438], [1520, 442], // Formation 3 fracture: lost circulation
    [1530, 472], [1540, 490],                 // Driller reduces MW -> circulation restored
    [1650, 490]
];

// ROP (ft/s) — drilling progression rates
const ROP_KP = [
    [1200, 0.0135], [1309, 0.0135],
    [1315, 0.0170], [1330, 0.0160], [1340, 0.0150], // Underbalanced kick drilling surge
    [1350, 0.0142], [1360, 0.0135],
    [1369, 0.0135],
    [1370, 0.0140], [1374, 0.0158], [1380, 0.0178], [1390, 0.0185], // Kick 2: ROP gradually increases abnormally
    [1400, 0.0168], [1410, 0.0150], [1418, 0.0138], [1430, 0.0135], [1440, 0.0135], // Returns to normal
    [1445, 0.0110], [1455, 0.0125], [1460, 0.0135], // 1440 ft ROP lower trend then stabilizes
    [1489, 0.0135],
    [1490, 0.0110], [1505, 0.0095], [1520, 0.0095], // Fracture throttled ROP
    [1530, 0.0118], [1540, 0.0135],
    [1650, 0.0135]
];

// Torque (kN·m)
const TORQUE_KP = [
    [1200, 10.2], [1309, 10.2],
    [1315, 11.2], [1340, 11.5],
    [1350, 10.8], [1360, 10.3],
    [1369, 10.3],
    [1375, 10.8], [1380, 11.4], [1390, 11.6],
    [1405, 11.2], [1420, 10.7], [1440, 10.4],
    [1445, 10.2], [1460, 10.3],
    [1489, 10.3],
    [1490,  9.6], [1510,  9.3], [1520,  9.3],
    [1530,  9.8], [1540, 10.2],
    [1650, 10.3]
];

// Pit Volume / Gain-Loss (bbl)
// Positive = Pit Gain, Negative = Pit Loss
const PIT_VOL_KP = [
    [1200,  0.0], [1309,  0.0],
    [1310,  2.5], [1325, 12.0], [1340, 14.5],  // Kick 1 pit gain
    [1350,  7.0], [1360,  0.0],                 // Kick 1 resolved
    [1369,  0.0],
    [1370,  1.0], [1374,  4.5], [1380, 11.5], [1390, 18.0], // Kick 2 pit gain accumulation
    [1400, 14.0], [1410,  8.0], [1418,  2.5], [1430,  0.5], [1440, 0.0], // Kick 2 resolved
    [1489,  0.0],
    [1490, -2.5], [1500,-10.0], [1510,-14.0], [1520,-14.0], // Formation 3 pit loss
    [1530, -5.0], [1540,  0.0],                 // Loss resolved
    [1650,  0.0]
];

// RPM
const RPM_KP = [
    [1200, 122], [1309, 122],
    [1315, 124], [1340, 122],
    [1360, 120], [1369, 120],
    [1375, 118], [1390, 116],
    [1440, 122],
    [1445, 120], [1460, 122],
    [1490, 108], [1520, 108],
    [1540, 122],
    [1650, 123]
];

// ─────────────────────────────────────────────────────────────────────────────
// INTERPOLATION
// ─────────────────────────────────────────────────────────────────────────────
function lerp(kp, d) {
    if (d <= kp[0][0]) return kp[0][1];
    const last = kp[kp.length - 1];
    if (d >= last[0]) return last[1];
    for (let i = 0; i < kp.length - 1; i++) {
        if (d >= kp[i][0] && d < kp[i + 1][0]) {
            const t = (d - kp[i][0]) / (kp[i + 1][0] - kp[i][0]);
            return kp[i][1] + t * (kp[i + 1][1] - kp[i][1]);
        }
    }
    return last[1];
}

// ─────────────────────────────────────────────────────────────────────────────
// SENSOR FLUCTUATIONS
// ─────────────────────────────────────────────────────────────────────────────
function sensorNoiseBhp(d)    { return Math.sin(d * 0.35) * 2.2 + Math.sin(d * 0.88 + 1.7) * 1.2; }
function sensorNoiseMw(d)     { return Math.sin(d * 0.25) * 0.02 + Math.sin(d * 0.70 + 0.5) * 0.01; }
function sensorNoiseFlow(d)   { return Math.sin(d * 0.40) * 1.8 + Math.sin(d * 1.10) * 0.9; }
function sensorNoiseRpm(d)    { return Math.round(Math.sin(d * 0.50) * 1.2 + Math.cos(d * 1.20) * 0.8); }
function sensorNoiseRop(d)    { return Math.sin(d * 0.45) * 0.0002 + Math.sin(d * 1.30) * 0.0001; }
function sensorNoiseTorque(d) { return Math.sin(d * 0.38) * 0.18 + Math.cos(d * 0.95) * 0.10; }
function sensorNoisePit(d)    { return Math.sin(d * 0.42) * 0.20; }

// ─────────────────────────────────────────────────────────────────────────────
// FORMATION CONTEXT & DYNAMIC SAFE WINDOW EVALUATION
// ─────────────────────────────────────────────────────────────────────────────
function getFormationContext(d) {
    if (d < 1310) {
        return {
            zone: 'Formation 1',
            zoneRange: '1200–1310 ft',
            zoneType: 'Normal',
            desc: 'Formation 1 (1200–1310 ft) Normal Stable Drilling',
            action: 'Continue drilling. All parameters are within the safe operating window.'
        };
    }
    if (d < 1490) {
        let desc = 'Formation 2 (1310–1490 ft) Stable Drilling';
        let action = 'Normal drilling in Formation 2. Safe operating window.';
        if (d >= 1310 && d < 1340) {
            desc = 'Formation 2 (1310–1490 ft) Kick Indication';
            action = 'WARNING: Flow Out anomaly detected. Existing BHP insufficient for Formation 2.';
        } else if (d >= 1340 && d < 1360) {
            desc = 'Formation 2 (1310–1490 ft) Driller Responding';
            action = 'Driller responding: Increasing Mud Weight to control initial kick.';
        } else if (d >= 1360 && d < 1370) {
            desc = 'Formation 2 (1310–1490 ft) First Kick Controlled';
            action = 'Stable drilling. First kick successfully controlled.';
        } else if (d >= 1370 && d < 1390) {
            desc = 'Formation 2 (1310–1490 ft) Abnormal Drilling / Kick Indication';
            action = 'WARNING: Abnormal parameter trends detected (Flow Out ↑, ROP ↑). Kick indication active.';
        } else if (d >= 1390 && d < 1440) {
            desc = 'Formation 2 (1310–1490 ft) Driller Weighting Up';
            action = 'Driller responding: Increasing Mud Weight toward 40.26 ppg to normalize parameters.';
        } else if (d >= 1440 && d < 1460) {
            desc = 'Formation 2 (1310–1490 ft) Controlled MW Reduction';
            action = 'Driller responding: Reducing Mud Weight toward 35.50 ppg within safe window.';
        } else if (d >= 1460) {
            desc = 'Formation 2 (1310–1490 ft) Stable Drilling';
            action = 'Normal stable drilling resumes at 35.50 ppg. Safe operating window.';
        }
        return {
            zone: 'Formation 2',
            zoneRange: '1310–1490 ft',
            zoneType: (d >= 1310 && d < 1360) || (d >= 1370 && d < 1440) ? 'Abnormal Pressure Zone' : 'Normal',
            desc,
            action
        };
    }
    return {
        zone: 'Formation 3',
        zoneRange: '1490–1650 ft',
        zoneType: d < 1540 ? 'Fracture Risk Scenario' : 'Normal',
        desc: d < 1520 ? 'Formation 3 (1490–1650 ft) Fracture Risk Indication' : d < 1540 ? 'Formation 3 (1490–1650 ft) Driller Reducing Mud Weight' : 'Formation 3 (1490–1650 ft) Stable Drilling',
        action: d < 1520 ? 'Fracture risk detected (BHP exceeds fracture limit). Flow loss observed.' : d < 1540 ? 'Driller responding: Reducing Mud Weight toward 28.50 ppg.' : 'Continue drilling. Formation 3 stable.'
    };
}

function evaluateSafeWindow(d, fp, frac, baseBhp, flowOut, flowIn, rop) {
    const isUnderbalanced = baseBhp < fp;
    const isFracture      = baseBhp >= frac;

    // Abnormal parameter condition check in 1370-1440 ft zone:
    // From 1370-1390 ft, kick is indicated primarily via abnormal live parameters (Flow Out ↑, ROP ↑).
    // From 1390-1440 ft, siren remains ON until BOTH:
    // 1) Abnormal drilling parameters have returned to controlled/stable range (Flow Out and ROP normalize)
    // AND
    // 2) BHP is inside the Safe Window (fp < BHP < frac)
    let isAbnormalKick = false;
    if (d >= 1370 && d < 1440) {
        const flowAbnormal = (flowOut > flowIn + 15);
        const ropAbnormal  = (rop > 0.0142);
        if (d < 1390) {
            isAbnormalKick = true;
        } else if (flowAbnormal || ropAbnormal || isUnderbalanced) {
            isAbnormalKick = true;
        }
    }

    const isKick = isUnderbalanced || isAbnormalKick;
    const isSafe = !isKick && !isFracture;

    let siren        = !isSafe;
    let soundMode    = 'NONE';
    let kickRisk     = 'LOW';
    let fractureRisk = 'LOW';
    let kickVal      = 0.05;
    let fracVal      = 0.05;
    let statusType   = 'stable';
    let statusIcon   = '✓';
    let statusText   = 'STABLE';

    if (isKick) {
        statusType = 'danger';
        statusIcon = '⚠';
        siren = true;
        soundMode = 'KICK_WARNING';
        kickRisk = 'HIGH';
        if (d >= 1310 && d < 1340) {
            statusText = 'KICK INDICATION – NO RESPONSE YET';
            kickVal = 0.90;
        } else if (d >= 1340 && d < 1360) {
            statusText = 'DRILLER RESPONDING – WEIGHTING UP';
            kickVal = Math.max(0.40, Math.min(0.85, (fp - baseBhp) / 250));
        } else if (d >= 1370 && d < 1390) {
            statusText = 'ABNORMAL DRILLING / KICK INDICATION';
            // Kick risk progressively increases from NORMAL/LOW to WARNING/HIGH
            kickVal = 0.40 + (d - 1370) * 0.028;
            kickRisk = kickVal > 0.65 ? 'HIGH' : 'WARNING';
        } else if (d >= 1390 && d < 1440) {
            statusText = 'DRILLER RESPONDING – PARAMETERS NORMALIZING';
            kickVal = Math.max(0.20, 0.95 - (d - 1390) * 0.030);
            kickRisk = kickVal > 0.45 ? 'WARNING' : 'LOW';
        } else {
            statusText = 'KICK RISK DETECTED';
            kickVal = 0.85;
        }
    } else if (isFracture) {
        statusType = 'fracture';
        statusIcon = '⚠';
        siren = true;
        soundMode = 'FRACTURE_RISK';
        fractureRisk = 'HIGH';
        if (d >= 1490 && d < 1520) {
            statusText = 'FRACTURE RISK – NO IMMEDIATE RESPONSE';
            fracVal = 0.95;
        } else {
            statusText = 'DRILLER RESPONDING – REDUCING MUD WEIGHT';
            fracVal = Math.max(0.40, Math.min(0.90, (baseBhp - frac) / 200 + 0.5));
        }
    } else {
        // Safe Window reached & parameters controlled: Siren = OFF
        siren = false;
        soundMode = 'NONE';
        kickRisk = 'LOW';
        fractureRisk = 'LOW';
        statusType = 'stable';
        statusIcon = '✓';
        if (d >= 1340 && d < 1370) {
            statusText = 'STABLE – FIRST KICK CONTROLLED';
        } else if (d >= 1390 && d < 1440) {
            statusText = 'STABLE – ABNORMAL CONDITION CONTROLLED';
        } else if (d >= 1440 && d < 1460) {
            statusText = 'CONTROLLED MW REDUCTION (SAFE)';
        } else if (d >= 1460 && d < 1490) {
            statusText = 'FORMATION 2 STABLE';
        } else if (d >= 1520 && d < 1540) {
            statusText = 'STABLE – SAFE WINDOW RESTORED';
        } else {
            statusText = 'STABLE';
        }
    }

    return { type: statusType, icon: statusIcon, text: statusText, kickRisk, fractureRisk, kickVal, fracVal, siren, soundMode };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRECOMPUTE ALL SCENARIO DATA
// ─────────────────────────────────────────────────────────────────────────────
const SimData = {
    depths: [],
    fp: [],        // Clean engineering curve (Formation Pressure)
    frac: [],      // Clean engineering curve (Fracture Pressure)
    bhp: [],       // Hydrostatic / BHP curve: strictly 0.052 * Actual MW * Depth
    liveBhp: [],   // Instantaneous reading with subtle sensor noise
    aMW: [],       // Actual Mud Weight
    rMW: [],       // Recommended Mud Weight
    flowIn: [],    // Flow In (gpm)
    flowOut: [],   // Flow Out (gpm)
    pitVol: [],    // Pit Gain / Loss (bbl)
    rpm: [],       // RPM
    rop: [],       // ROP (ft/s)
    torque: [],    // Torque (kN·m)
    states: []     // Dynamic states
};

function precompute() {
    SimData.depths = [];
    SimData.fp = [];
    SimData.frac = [];
    SimData.bhp = [];
    SimData.liveBhp = [];
    SimData.aMW = [];
    SimData.rMW = [];
    SimData.flowIn = [];
    SimData.flowOut = [];
    SimData.pitVol = [];
    SimData.rpm = [];
    SimData.rop = [];
    SimData.torque = [];
    SimData.states = [];

    for (let d = DEPTH_MIN; d <= DEPTH_MAX; d++) {
        const fp      = Math.round(lerp(FP_KP,   d));
        const frac    = Math.round(lerp(FRAC_KP, d));

        const baseAmw = lerp(ACTUAL_MW_KP, d);
        const mNoise  = sensorNoiseMw(d);
        let finalAmw = +(baseAmw + mNoise).toFixed(2);
        if (d === 1440) finalAmw = 40.26;
        if (d === 1460) finalAmw = 35.50;

        // BHP calculated strictly using: BHP = 0.052 * Actual Mud Weight * Current Depth
        const baseBhp = Math.round(0.052 * baseAmw * d);
        const bNoise  = sensorNoiseBhp(d);
        const finalBhp = Math.round(0.052 * finalAmw * d + bNoise * 0.35);
        const liveBhp  = Math.round(0.052 * finalAmw * d + bNoise);

        const finalRmw = +lerp(REC_MW_KP, d).toFixed(2);

        const fNoise   = sensorNoiseFlow(d);
        const baseFlowIn = lerp(FLOW_IN_KP, d);
        const baseFlowOut = lerp(FLOW_OUT_KP, d);
        const baseRop = lerp(ROP_KP, d);

        const finalFlowIn  = Math.round(baseFlowIn + fNoise);
        const finalFlowOut = Math.round(baseFlowOut + fNoise * 1.15);

        const pitNoise = sensorNoisePit(d);
        const finalPitVol  = +(lerp(PIT_VOL_KP, d) + pitNoise).toFixed(1);

        const rNoise   = sensorNoiseRpm(d);
        const finalRpm = Math.round(lerp(RPM_KP, d) + rNoise);

        const ropNoise = sensorNoiseRop(d);
        const finalRop = +(baseRop + ropNoise).toFixed(4);

        const tNoise   = sensorNoiseTorque(d);
        const finalTorque = +(lerp(TORQUE_KP, d) + tNoise).toFixed(1);

        const safety  = evaluateSafeWindow(d, fp, frac, baseBhp, baseFlowOut, baseFlowIn, baseRop);
        const context = getFormationContext(d);

        SimData.depths.push(d);
        SimData.fp.push(fp);
        SimData.frac.push(frac);
        SimData.bhp.push(finalBhp);
        SimData.liveBhp.push(liveBhp);
        SimData.aMW.push(finalAmw);
        SimData.rMW.push(finalRmw);
        SimData.flowIn.push(finalFlowIn);
        SimData.flowOut.push(finalFlowOut);
        SimData.pitVol.push(finalPitVol);
        SimData.rpm.push(finalRpm);
        SimData.rop.push(finalRop);
        SimData.torque.push(finalTorque);
        SimData.states.push({ ...safety, ...context });
    }
}

// Initial precomputation
precompute();

// ─────────────────────────────────────────────────────────────────────────────
// POST-KILL MUD WEIGHT PROPAGATION
// ─────────────────────────────────────────────────────────────────────────────
function applyKillMudWeight(kickId, startDepth) {
    if (kickId === 1) {
        // Kick 1 killed with 22.00 ppg kill mud.
        // Update from startDepth (default 1340) up to 1370 ft (Formation 2 abnormal zone entry)
        const dStart = (startDepth !== undefined && startDepth !== null) ? Math.min(1340, Math.max(1310, Math.round(startDepth))) : 1340;
        for (let d = dStart; d <= 1370; d++) {
            const idx = d - DEPTH_MIN;
            SimData.aMW[idx] = 22.00;
            const bNoise = sensorNoiseBhp(d);
            const bhpVal = Math.round(0.052 * 22.00 * d + bNoise * 0.35);
            SimData.bhp[idx] = bhpVal;
            SimData.liveBhp[idx] = Math.round(0.052 * 22.00 * d + bNoise);
            SimData.flowOut[idx] = 490;
            SimData.rop[idx] = 0.0135;
            SimData.torque[idx] = 10.3;
            if (SimData.states[idx] && d < 1370) {
                SimData.states[idx].type = 'stable';
                SimData.states[idx].icon = '✓';
                SimData.states[idx].text = 'STABLE – FIRST KICK CONTROLLED';
                SimData.states[idx].siren = false;
                SimData.states[idx].soundMode = 'NONE';
                SimData.states[idx].kickRisk = 'LOW';
            }
        }
    } else if (kickId === 2) {
        // Kick 2 killed with 40.26 ppg kill mud.
        // Update from startDepth (default 1390) up to 1440 ft (start of planned controlled reduction)
        const dStart = (startDepth !== undefined && startDepth !== null) ? Math.min(1390, Math.max(1370, Math.round(startDepth))) : 1390;
        for (let d = dStart; d <= 1440; d++) {
            const idx = d - DEPTH_MIN;
            SimData.aMW[idx] = 40.26;
            const bNoise = sensorNoiseBhp(d);
            const bhpVal = Math.round(0.052 * 40.26 * d + bNoise * 0.35);
            SimData.bhp[idx] = bhpVal;
            SimData.liveBhp[idx] = Math.round(0.052 * 40.26 * d + bNoise);
            SimData.flowOut[idx] = 490;
            SimData.rop[idx] = 0.0135;
            SimData.torque[idx] = 10.4;
            if (SimData.states[idx] && d < 1440) {
                SimData.states[idx].type = 'stable';
                SimData.states[idx].icon = '✓';
                SimData.states[idx].text = 'STABLE – ABNORMAL CONDITION CONTROLLED';
                SimData.states[idx].siren = false;
                SimData.states[idx].soundMode = 'NONE';
                SimData.states[idx].kickRisk = 'LOW';
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// USER-CONTROLLED WELL CONTROL STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────
const WellControl = {
    active: false,
    mode: 'NORMAL', // 'NORMAL' | 'KICK_INDICATION' | 'STOPPING_DRILL' | 'DRILLING_STOPPED' | 'FLOW_CHECK' | 'SHUTTING_IN' | 'SHUT_IN' | 'KMW_CALCULATED' | 'KILL_OPERATION' | 'WELL_STABILIZED' | 'RESUMING_DRILL'
    kickId: 0,      // 1 for 1340 ft kick, 2 for 1390 ft kick
    drillOn: true,
    pumpOn: true,
    sidpp: null,
    sicp: null,
    kmw: null,
    transitionTimer: 0,
    completedKicks: { 1: false, 2: false },
    justStabilized: false,
    killStartDepth: null,
    startKillMw: null,
    targetKillMw: null,

    reset() {
        this.active = false;
        this.mode = 'NORMAL';
        this.kickId = 0;
        this.drillOn = true;
        this.pumpOn = true;
        this.sidpp = null;
        this.sicp = null;
        this.kmw = null;
        this.transitionTimer = 0;
        this.completedKicks = { 1: false, 2: false };
        this.justStabilized = false;
        this.killStartDepth = null;
        this.startKillMw = null;
        this.targetKillMw = null;
        precompute();
    },

    getActiveButtons() {
        return {
            stopDrilling:   this.mode === 'KICK_INDICATION',
            stopPump:       this.mode === 'DRILLING_STOPPED',
            shutIn:         this.mode === 'FLOW_CHECK',
            calcKmw:        this.mode === 'SHUT_IN',
            applyKmw:       this.mode === 'KMW_CALCULATED',
            resumeDrilling: this.mode === 'WELL_STABILIZED'
        };
    },

    // Triggered when abnormal parameters begin (at 1310 ft or 1370 ft)
    startKickIndication(kickId) {
        if (this.completedKicks[kickId]) return;
        this.kickId = kickId;
        this.mode = 'KICK_INDICATION';
        // Note: depth still progresses until user clicks STOP DRILLING or until pause depth (1340 / 1390)
    },

    // USER ACTION 1: Turn off drilling
    userStopDrilling() {
        if (this.mode !== 'KICK_INDICATION') return;
        this.active = true; // Pin depth progression!
        this.mode = 'STOPPING_DRILL';
        this.drillOn = false;
        this.pumpOn = true;
        this.transitionTimer = 0;
    },

    // USER ACTION 2: Turn off pump
    userStopPump() {
        if (this.mode !== 'DRILLING_STOPPED') return;
        this.mode = 'FLOW_CHECK';
        this.drillOn = false;
        this.pumpOn = false;
        this.transitionTimer = 0;
    },

    // USER ACTION 3: Shut in well
    userShutIn() {
        if (this.mode !== 'FLOW_CHECK') return;
        this.mode = 'SHUTTING_IN';
        this.drillOn = false;
        this.pumpOn = false;
        this.transitionTimer = 0;
    },

    // USER ACTION 4: Calculate kill mud weight
    userCalculateKmw(currentDepth) {
        if (this.mode !== 'SHUT_IN') return;
        const isKick1 = (this.kickId === 1);
        const targetKmw = isKick1 ? 22.00 : 40.26;

        this.kmw = targetKmw;
        this.mode = 'KMW_CALCULATED';
    },

    // USER ACTION 5: Apply kill mud weight (kill operation)
    userApplyKmw(currentDepth) {
        if (this.mode !== 'KMW_CALCULATED') return;
        this.mode = 'KILL_OPERATION';
        this.drillOn = false;
        this.pumpOn = true; // Displacement pumping
        this.transitionTimer = 0;
        const d = Math.round(currentDepth || window.Sim?.depthF || (this.kickId === 1 ? 1340 : 1390));
        this.killStartDepth = d;
        const isKick1 = (this.kickId === 1);
        const curMw = (window.Sim?.persistentActualMW || window.Sim?.actualMudWeight || (isKick1 ? 18.50 : 22.00));
        this.startKillMw = curMw;
        this.targetKillMw = this.kmw || (isKick1 ? 22.00 : 40.26);
    },

    // USER ACTION 6: Turn on drilling (resume simulation)
    userResumeDrilling() {
        if (this.mode !== 'WELL_STABILIZED') return;
        this.mode = 'RESUMING_DRILL';
        this.drillOn = true;
        this.pumpOn = true;
        this.transitionTimer = 0;
    },

    // Real-time animation step (60 FPS)
    tick(dt, currentDepth) {
        const isKick1 = (this.kickId === 1);
        const targetSidpp = isKick1 ? 160 : 1320;
        const targetSicp  = isKick1 ? 235 : 1460;
        const baseMw      = isKick1 ? 18.50 : 22.00;
        const targetKmw   = isKick1 ? 22.00 : 40.26;
        const baseRop     = isKick1 ? 0.0150 : 0.0185;
        const baseTorque  = isKick1 ? 11.5 : 11.6;

        let res = {
            rop: 0,
            torque: 0,
            rpm: 0,
            flowIn: 490,
            flowOut: 490,
            aMW: baseMw,
            bhp: Math.round(0.052 * baseMw * currentDepth),
            drillOn: this.drillOn,
            pumpOn: this.pumpOn,
            sidpp: this.sidpp,
            sicp: this.sicp,
            kmw: this.kmw,
            statusText: '',
            statusIcon: '✓',
            statusType: 'stable',
            soundMode: 'NONE',
            siren: false,
            bannerTitle: 'STAGE 1 — NORMAL DRILLING',
            bannerSubtitle: 'All parameters within normal safe boundaries. No kick indication.',
            bannerIcon: '⚡',
            bannerClass: 'st-wc-normal',
            reqText: 'Normal Drilling — No Action Required'
        };

        this.justStabilized = false;

        // 1. KICK INDICATION (Drilling ON, Pump ON, waiting for user to click STOP DRILLING)
        if (this.mode === 'KICK_INDICATION') {
            res.drillOn = true;
            res.pumpOn = true;
            res.soundMode = 'KICK_WARNING';
            res.siren = true;
            res.bannerTitle = '⚠️ KICK INDICATION DETECTED';
            res.bannerSubtitle = 'Flow Out is abnormal. Possible influx / kick risk detected.';
            res.bannerIcon = '⚠️';
            res.bannerClass = 'st-wc-warning';
            res.reqText = '🔴 TURN OFF DRILLING IMMEDIATELY';
            res.statusText = 'KICK RISK DETECTED';
            res.statusIcon = '⚠';
            res.statusType = 'danger';
            return res;
        }

        // 2. STOPPING DRILL (Smooth deceleration over 1.5s after user clicks)
        if (this.mode === 'STOPPING_DRILL') {
            this.transitionTimer += dt;
            const p = Math.min(1, this.transitionTimer / 1.5);
            res.drillOn = false;
            res.pumpOn = true;
            res.rop = +(baseRop * (1 - p)).toFixed(4);
            res.torque = +(baseTorque * (1 - p)).toFixed(1);
            res.rpm = Math.round(122 * (1 - p));
            res.flowIn = 490;
            res.flowOut = isKick1 ? 545 : 568;
            res.soundMode = 'KICK_SUSPECTED';
            res.siren = true;
            res.bannerTitle = '🛑 STOPPING DRILLING...';
            res.bannerSubtitle = 'Decelerating rotary drill bit. ROP and torque decreasing to zero.';
            res.bannerIcon = '🛑';
            res.bannerClass = 'st-wc-warning';
            res.reqText = 'DRILLING DECELERATING TO ZERO...';
            res.statusText = 'STOPPING DRILLING';
            res.statusIcon = '⚠';
            res.statusType = 'warning';

            if (p >= 1) {
                this.mode = 'DRILLING_STOPPED';
            }
            return res;
        }

        // 3. DRILLING STOPPED (Drill OFF, Pump ON, waiting for user to click STOP PUMP)
        if (this.mode === 'DRILLING_STOPPED') {
            res.drillOn = false;
            res.pumpOn = true;
            res.rop = 0;
            res.torque = 0;
            res.rpm = 0;
            res.flowIn = 490;
            res.flowOut = isKick1 ? 545 : 568;
            res.soundMode = 'KICK_SUSPECTED';
            res.siren = true;
            res.bannerTitle = '🟠 DRILLING STOPPED';
            res.bannerSubtitle = 'Drilling paused. Mud pump running. Flow check preparation required.';
            res.bannerIcon = '🟠';
            res.bannerClass = 'st-wc-warning';
            res.reqText = '🟠 TURN OFF PUMP FOR FLOW CHECK';
            res.statusText = 'DRILLING STOPPED — FLOW CHECK REQUIRED';
            res.statusIcon = '⚠';
            res.statusType = 'warning';
            return res;
        }

        // 4. FLOW CHECK (Drill OFF, Pump OFF, observing influx, waiting for user to click SHUT IN)
        if (this.mode === 'FLOW_CHECK') {
            this.transitionTimer += dt;
            res.drillOn = false;
            res.pumpOn = false;
            res.rop = 0;
            res.torque = 0;
            res.rpm = 0;
            res.flowIn = 0;
            // Flow check: Pumps are OFF, but formation fluid influx continues!
            const influxFlow = isKick1 ? Math.round(34 + Math.sin(this.transitionTimer * 4) * 2) : Math.round(42 + Math.sin(this.transitionTimer * 4) * 3);
            res.flowOut = influxFlow;
            res.soundMode = 'KICK_CONFIRMED';
            res.siren = true;
            res.bannerTitle = '🚨 KICK CONFIRMED';
            res.bannerSubtitle = 'FLOW CONTINUES WITH PUMP OFF. Formation fluid entering wellbore!';
            res.bannerIcon = '🚨';
            res.bannerClass = 'st-wc-danger';
            res.reqText = '🚨 SHUT IN WELL (ACTUATE BOP)';
            res.statusText = '⚠ FLOW CONTINUES — KICK CONFIRMED';
            res.statusIcon = '🚨';
            res.statusType = 'danger';
            return res;
        }

        // 5. SHUTTING IN (BOP sealing, pressures building up over 2.0s)
        if (this.mode === 'SHUTTING_IN') {
            this.transitionTimer += dt;
            const p = Math.min(1, this.transitionTimer / 2.0);
            res.drillOn = false;
            res.pumpOn = false;
            res.rop = 0;
            res.torque = 0;
            res.rpm = 0;
            res.flowIn = 0;
            res.flowOut = 0;

            const r = 1 - Math.exp(-p * 3.5);
            this.sidpp = Math.round(targetSidpp * r);
            this.sicp  = Math.round(targetSicp * r);
            res.sidpp = this.sidpp;
            res.sicp = this.sicp;
            res.soundMode = 'KICK_CONFIRMED';
            res.siren = true;
            res.bannerTitle = '🔒 SHUTTING IN WELL...';
            res.bannerSubtitle = 'Closing BOP annular preventer. Flow sealed. Recording shut-in pressures.';
            res.bannerIcon = '🔒';
            res.bannerClass = 'st-wc-danger';
            res.reqText = 'RECORDING & STABILIZING PRESSURES...';
            res.statusText = 'RECORDING SHUT-IN PRESSURES';
            res.statusIcon = '🚨';
            res.statusType = 'danger';

            if (p >= 1) {
                this.sidpp = targetSidpp;
                this.sicp = targetSicp;
                this.mode = 'SHUT_IN';
            }
            return res;
        }

        // 6. SHUT IN (Pressures stabilized, waiting for user to click CALCULATE KMW)
        if (this.mode === 'SHUT_IN') {
            res.drillOn = false;
            res.pumpOn = false;
            res.rop = 0;
            res.torque = 0;
            res.rpm = 0;
            res.flowIn = 0;
            res.flowOut = 0;
            this.sidpp = targetSidpp;
            this.sicp = targetSicp;
            res.sidpp = targetSidpp;
            res.sicp = targetSicp;
            res.soundMode = 'KICK_CONFIRMED';
            res.siren = true;
            res.bannerTitle = '🔴 WELL SHUT IN';
            res.bannerSubtitle = `Well safely isolated. SIDPP: ${targetSidpp} psi | SICP: ${targetSicp} psi recorded.`;
            res.bannerIcon = '🔴';
            res.bannerClass = 'st-wc-danger';
            res.reqText = '🧮 CALCULATE KILL MUD WEIGHT';
            res.statusText = `WELL SHUT IN (SIDPP: ${targetSidpp} psi | SICP: ${targetSicp} psi)`;
            res.statusIcon = '🚨';
            res.statusType = 'danger';
            return res;
        }

        // 7. KMW CALCULATED (KMW displayed, waiting for user to click APPLY KMW)
        if (this.mode === 'KMW_CALCULATED') {
            res.drillOn = false;
            res.pumpOn = false;
            res.rop = 0;
            res.torque = 0;
            res.rpm = 0;
            res.flowIn = 0;
            res.flowOut = 0;
            res.sidpp = targetSidpp;
            res.sicp = targetSicp;
            res.kmw = targetKmw;
            res.soundMode = 'KICK_CONFIRMED';
            res.siren = true;
            res.bannerTitle = '🧮 KILL MUD WEIGHT CALCULATED';
            res.bannerSubtitle = `Formula: ${baseMw.toFixed(2)} + ${targetSidpp} / (0.052 × ${Math.round(currentDepth)}) = ${targetKmw.toFixed(2)} ppg.`;
            res.bannerIcon = '🧮';
            res.bannerClass = 'st-wc-warning';
            res.reqText = '🔵 APPLY KILL MUD WEIGHT (START KILL OPERATION)';
            res.statusText = `KMW: ${targetKmw.toFixed(2)} ppg — READY FOR KILL OPERATION`;
            res.statusIcon = '🎯';
            res.statusType = 'warning';
            return res;
        }

        // 8. KILL OPERATION (Displacing KMW over 4.0s)
        if (this.mode === 'KILL_OPERATION') {
            this.transitionTimer += dt;
            const p = Math.min(1, this.transitionTimer / 4.0);
            res.drillOn = false;
            res.pumpOn = true;
            res.rop = 0;
            res.torque = 0;
            res.rpm = 0;
            res.flowIn = isKick1 ? 250 : 260;
            res.flowOut = isKick1 ? 250 : 260;

            const startMw = this.startKillMw || baseMw;
            const targetMw = this.targetKillMw || targetKmw;
            const curMw = +(startMw + (targetMw - startMw) * p).toFixed(2);
            const liveBhp = Math.round(0.052 * curMw * currentDepth + sensorNoiseBhp(currentDepth));
            this.sidpp = Math.round(targetSidpp * (1 - p));
            this.sicp  = Math.round(targetSicp * (1 - p));
            this.kmw   = targetMw;

            res.sidpp = this.sidpp;
            res.sicp = this.sicp;
            res.kmw = targetMw;
            res.aMW = curMw;
            res.bhp = liveBhp;

            if (window.Sim) {
                window.Sim.actualMudWeight = curMw;
            }

            res.soundMode = 'KICK_CONFIRMED';
            res.siren = true;
            res.bannerTitle = '🟡 KILL OPERATION IN PROGRESS';
            res.bannerSubtitle = `Pumping Kill Mud Weight (${curMw.toFixed(2)} ppg). Raising BHP (${liveBhp} psi) and displacing influx.`;
            res.bannerIcon = '🔄';
            res.bannerClass = 'st-wc-kill';
            res.reqText = 'KILL OPERATION IN PROGRESS — OBSERVING PRESSURE STABILIZATION';
            res.statusText = 'KILL OPERATION IN PROGRESS';
            res.statusIcon = '🔄';
            res.statusType = 'warning';

            if (p >= 1) {
                this.mode = 'WELL_STABILIZED';
                this.justStabilized = true;
                this.sidpp = null;
                this.sicp = null;
                this.kmw = null;
                if (window.Sim) {
                    window.Sim.persistentActualMW = targetMw;
                    window.Sim.actualMudWeight = targetMw;
                }
                applyKillMudWeight(this.kickId, this.killStartDepth || currentDepth);
            }
            return res;
        }

        // 9. WELL STABILIZED (Waiting for user to click TURN ON DRILLING)
        if (this.mode === 'WELL_STABILIZED') {
            res.drillOn = false;
            res.pumpOn = true;
            res.rop = 0;
            res.torque = 0;
            res.rpm = 0;
            res.flowIn = 490;
            res.flowOut = 490;
            const finalMw = this.targetKillMw || targetKmw;
            res.aMW = finalMw;
            res.bhp = Math.round(0.052 * finalMw * currentDepth);
            if (window.Sim) {
                window.Sim.persistentActualMW = finalMw;
                window.Sim.actualMudWeight = finalMw;
            }
            res.sidpp = null;
            res.sicp = null;
            res.kmw = null;
            res.soundMode = 'NONE';
            res.siren = false;
            res.bannerTitle = '🟢 WELL STABILIZED — KICK CONTROLLED';
            res.bannerSubtitle = 'Hydrostatic head balances formation pressure. All sirens OFF. Ready to drill ahead.';
            res.bannerIcon = '🟢';
            res.bannerClass = 'st-wc-normal';
            res.reqText = '🟢 TURN ON DRILLING TO RESUME SIMULATION';
            res.statusText = '✅ WELL STABILIZED — RESUME DRILLING';
            res.statusIcon = '✓';
            res.statusType = 'stable';
            return res;
        }

        // 10. RESUMING DRILL (Smooth acceleration over 1.5s after user clicks)
        if (this.mode === 'RESUMING_DRILL') {
            this.transitionTimer += dt;
            const p = Math.min(1, this.transitionTimer / 1.5);
            res.drillOn = true;
            res.pumpOn = true;
            res.rop = +(0.0135 * p).toFixed(4);
            res.torque = +(10.3 * p).toFixed(1);
            res.rpm = Math.round(120 * p);
            res.flowIn = 490;
            res.flowOut = 490;
            const finalMw = this.targetKillMw || targetKmw;
            res.aMW = finalMw;
            res.bhp = Math.round(0.052 * finalMw * currentDepth);
            if (window.Sim) {
                window.Sim.persistentActualMW = finalMw;
                window.Sim.actualMudWeight = finalMw;
            }
            res.sidpp = null;
            res.sicp = null;
            res.kmw = null;
            res.soundMode = 'NONE';
            res.siren = false;
            res.bannerTitle = '🟢 RESUMING DRILLING...';
            res.bannerSubtitle = 'Spinning up rotary and circulating mud. Returning to live drilling.';
            res.bannerIcon = '⚡';
            res.bannerClass = 'st-wc-normal';
            res.reqText = 'DRILLING ACCELERATING TO OPERATING SPEED...';
            res.statusText = 'RESUMING DRILLING';
            res.statusIcon = '✓';
            res.statusType = 'stable';

            if (p >= 1) {
                this.completedKicks[this.kickId] = true;
                this.active = false; // Unpause depth progression!
                this.mode = 'NORMAL';
                if (window.Sim) {
                    window.Sim.persistentActualMW = finalMw;
                    window.Sim.actualMudWeight = finalMw;
                }
                applyKillMudWeight(this.kickId, this.killStartDepth || currentDepth);
            }
            return res;
        }

        return res;
    }
};

window.WellControl = WellControl;
window.applyKillMudWeight = applyKillMudWeight;
window.precompute = precompute;


