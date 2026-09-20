'use strict';

let gCursorDepth = DEPTH_MIN;

// Milestone event marker depths
const EVENT_MARKERS = [
    { depth: 1200, label: '1200 Form 1' },
    { depth: 1310, label: '1310 Form 2 / Kick 1' },
    { depth: 1340, label: '1340 Driller Resp' },
    { depth: 1360, label: '1360 Kick 1 Safe' },
    { depth: 1370, label: '1370 Kick 2 / Abnormal' },
    { depth: 1390, label: '1390 Driller Resp (MW ↑)' },
    { depth: 1440, label: '1440 Rec MW 35.50' },
    { depth: 1460, label: '1460 Form 2 Safe' },
    { depth: 1490, label: '1490 Form 3 / Frac' },
    { depth: 1520, label: '1520 Driller Resp (MW ↓)' },
    { depth: 1540, label: '1540 Form 3 Safe' },
    { depth: 1650, label: '1650 TD' }
];

// Formation background zones
const FORMATION_ZONES = [
    { min: 1200, max: 1310, color: 'rgba(16, 185, 129, 0.08)',  border: 'rgba(16, 185, 129, 0.3)',  name: 'Formation 1 (1200–1310 ft)', tag: 'Normal' },
    { min: 1310, max: 1490, color: 'rgba(239, 68, 68, 0.09)',   border: 'rgba(239, 68, 68, 0.35)',  name: 'Formation 2 (1310–1490 ft)', tag: 'Abnormal Pressure Zone' },
    { min: 1490, max: 1650, color: 'rgba(59, 130, 246, 0.09)',  border: 'rgba(59, 130, 246, 0.35)',  name: 'Formation 3 (1490–1650 ft)', tag: 'Fracture Risk at Start' }
];

// ─────────────────────────────────────────────────────────────────────────────
// PLUGIN: FORMATION ZONES & VERTICAL EVENT MARKERS
// Progressive reveal: Never expose future formations, future markers, or future events.
// ─────────────────────────────────────────────────────────────────────────────
const formationBandsPlugin = {
    id: 'formationBands',
    beforeDraw(chart) {
        const ctx = chart.ctx, xs = chart.scales.x, ys = chart.scales.y;
        if (!xs || !ys) return;
        ctx.save();

        const isPressure = (chart.canvas.id === 'pressureChart');

        // 1. Draw Formation background zone bands
        // Only draw for depths that have already been drilled (<= gCursorDepth)
        FORMATION_ZONES.forEach(z => {
            if (z.min >= gCursorDepth) return; // Future formation: NOT YET DISCOVERED!
            const x1 = Math.max(xs.left, xs.getPixelForValue(z.min));
            const x2 = Math.min(xs.right, xs.getPixelForValue(Math.min(z.max, gCursorDepth)));
            if (x2 > x1) {
                ctx.fillStyle = z.color;
                ctx.fillRect(x1, ys.top, x2 - x1, ys.bottom - ys.top);
            }
        });

        // 2. Draw vertical dashed milestone lines
        // Only draw milestone lines for events that have ALREADY occurred (<= gCursorDepth)
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        EVENT_MARKERS.forEach(m => {
            if (m.depth > gCursorDepth) return; // Future event: NOT YET OCCURRED!
            const x = xs.getPixelForValue(m.depth);
            if (x >= xs.left && x <= xs.right) {
                ctx.beginPath();
                ctx.moveTo(x, ys.top);
                ctx.lineTo(x, ys.bottom);
                ctx.stroke();
            }
        });
        ctx.setLineDash([]);

        // 3. On the main pressure chart: draw revealed zone headers & milestone labels
        if (isPressure) {
            // Zone Header Labels (only for formations that have been entered)
            FORMATION_ZONES.forEach(z => {
                if (z.min >= gCursorDepth) return; // Not yet reached
                const x1 = Math.max(xs.left, xs.getPixelForValue(z.min));
                const x2 = Math.min(xs.right, xs.getPixelForValue(Math.min(z.max, gCursorDepth)));
                if (x2 - x1 > 45) {
                    const cx = (x1 + x2) / 2;
                    ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
                    ctx.font = "bold 9px 'Segoe UI', sans-serif";
                    ctx.textAlign = 'center';
                    ctx.fillText(`${z.name} [${z.tag}]`, cx, ys.top - 8);
                }
            });

            // Milestone Labels (only for reached events)
            ctx.font = "8px 'Courier New', monospace";
            EVENT_MARKERS.forEach((m, idx) => {
                if (m.depth > gCursorDepth) return; // Future event: hidden
                const x = xs.getPixelForValue(m.depth);
                if (x >= xs.left && x <= xs.right) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
                    ctx.textAlign = (idx === 0) ? 'left' : (m.depth >= gCursorDepth - 5) ? 'right' : 'center';
                    ctx.fillText(m.label, x, ys.top + 10);
                }
            });
        }

        ctx.restore();
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PLUGIN: CURRENT DEPTH MARKER & FUTURE REGION OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
const depthCursorPlugin = {
    id: 'depthCursor',
    afterDraw(chart) {
        const ctx = chart.ctx, xs = chart.scales.x, ys = chart.scales.y;
        if (!xs || !ys) return;
        const x = xs.getPixelForValue(gCursorDepth);
        if (x < xs.left || x > xs.right) return;

        const isPressure = (chart.canvas.id === 'pressureChart');

        // 1. Future Region Overlay on Pressure Chart (Undrilled / No Live Data)
        if (isPressure && gCursorDepth < DEPTH_MAX) {
            const xFutureStart = x;
            const xFutureEnd   = xs.right;
            if (xFutureEnd > xFutureStart + 2) {
                ctx.save();
                // Subtle dark overlay to clearly distinguish undrilled region
                ctx.fillStyle = 'rgba(4, 7, 15, 0.86)';
                ctx.fillRect(xFutureStart, ys.top, xFutureEnd - xFutureStart, ys.bottom - ys.top);

                // Subtle undrilled boundary line
                ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(xFutureStart, ys.top);
                ctx.lineTo(xFutureStart, ys.bottom);
                ctx.stroke();

                // Centered subtle watermark in future region
                if (xFutureEnd - xFutureStart > 120) {
                    const cx = (xFutureStart + xFutureEnd) / 2;
                    const cy = (ys.top + ys.bottom) / 2;
                    ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
                    ctx.font = "bold 9.5px 'Courier New', monospace";
                    ctx.textAlign = 'center';
                    ctx.fillText('░░░ UNDRILLED / NO LIVE DATA ░░░', cx, cy);
                }
                ctx.restore();
            }
        }

        // 2. Highly Visible Glowing Vertical Line at Current Depth
        ctx.save();
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2.0;
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(x, ys.top);
        ctx.lineTo(x, ys.bottom);
        ctx.stroke();

        // 3. Current Depth Marker Badge on Pressure vs Depth Chart
        if (isPressure) {
            ctx.shadowBlur = 0;
            const bw = 90, bh = 42;
            let bx = x - bw / 2;
            if (bx < xs.left + 2) bx = xs.left + 2;
            if (bx + bw > xs.right - 2) bx = xs.right - bw - 2;
            const by = ys.top + 4;

            // Box background with cyan border
            ctx.fillStyle = '#060b18';
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 1.4;
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeRect(bx, by, bw, bh);

            // "CURRENT DEPTH"
            ctx.fillStyle = '#00d4ff';
            ctx.font = "bold 8px 'Courier New', monospace";
            ctx.textAlign = 'center';
            ctx.fillText('CURRENT DEPTH', bx + bw / 2, by + 12);

            // Divider line
            ctx.strokeStyle = 'rgba(0, 212, 255, 0.45)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bx + 6, by + 16);
            ctx.lineTo(bx + bw - 6, by + 16);
            ctx.stroke();

            // Down arrow
            ctx.fillStyle = '#00d4ff';
            ctx.font = "bold 8px 'Courier New', monospace";
            ctx.fillText('▼', bx + bw / 2, by + 26);

            // Live depth readout (e.g. "1342 ft")
            ctx.fillStyle = '#ffffff';
            ctx.font = "bold 11px 'Courier New', monospace";
            ctx.fillText(Math.round(gCursorDepth) + ' ft', bx + bw / 2, by + 37);
        }

        ctx.restore();
    }
};

Chart.register(formationBandsPlugin, depthCursorPlugin);

// ─────────────────────────────────────────────────────────────────────────────
// COMMON STYLES
// ─────────────────────────────────────────────────────────────────────────────
const C = {
    grid: 'rgba(255, 255, 255, 0.06)',
    tick: '#94a3b8',
    mono: "'Courier New', monospace",
    border: '#1e293b',
    cyan: '#00d4ff',
    green: '#00d46a',
    red: '#ff3b3b',
    white: '#e2e8f0',
    purple: '#c084fc',
    gold: '#fbbf24',
    emerald: '#10b981',
    orange: '#ff6b4a'
};

function mkX(showTicks) {
    return {
        type: 'linear',
        min: DEPTH_MIN,
        max: DEPTH_MAX,
        grid: { color: C.grid, lineWidth: 0.7 },
        border: { color: C.border },
        ticks: {
            display: !!showTicks,
            color: C.tick,
            font: { size: 9, family: C.mono },
            stepSize: 50,
            callback: v => v + ' ft'
        },
        title: {
            display: !!showTicks,
            text: 'MEASURED DEPTH (ft)',
            color: '#e2e8f0',
            font: { size: 10, family: C.mono, weight: 'bold' }
        }
    };
}

function mkY(min, max, label, color, step) {
    return {
        min, max,
        grid: { color: C.grid, lineWidth: 0.7 },
        border: { color: C.border },
        ticks: { color: color || C.tick, font: { size: 9, family: C.mono }, stepSize: step },
        title: { display: !!label, text: label, color: color || C.tick, font: { size: 9, family: C.mono } }
    };
}

const legendOpts = {
    display: true, position: 'top', align: 'end',
    labels: { color: '#cbd5e1', font: { size: 9, family: C.mono }, boxWidth: 16, boxHeight: 2, padding: 8 }
};

const BASE = { responsive: true, maintainAspectRatio: false, animation: { duration: 0 } };

// ─────────────────────────────────────────────────────────────────────────────
// 5 SYNCHRONIZED CHARTS
// ─────────────────────────────────────────────────────────────────────────────
let pressureChart, flowChart, mwChart, ropChart, pitChart;

function initCharts() {
    // 1. Dominant Main Pressure vs Depth Graph (70-80% of visualization area)
    // - Black background
    // - Cyan/turquoise = Hydrostatic / BHP
    // - Red dashed = Formation Pressure
    // - White/light gray dashed = Fracture Pressure
    // - Dark green = Safe Drilling Window (filled between Formation and Fracture)
    const ctxP = document.getElementById('pressureChart').getContext('2d');
    pressureChart = new Chart(ctxP, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Formation Pressure',
                    data: [],
                    borderColor: '#ff3b3b',           // Red dashed line
                    borderDash: [6, 4],
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.25,
                    fill: false,
                    order: 3
                },
                {
                    label: 'Fracture Pressure',
                    data: [],
                    borderColor: '#e2e8f0',           // White / light gray dashed line
                    borderDash: [6, 4],
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.25,
                    order: 2,
                    // Shaded dark green Safe Window between Formation and Fracture
                    fill: { target: 0, above: 'rgba(0, 180, 100, 0.25)', below: 'rgba(0, 180, 100, 0.25)' }
                },
                {
                    label: 'Hydrostatic / BHP',
                    data: [],
                    borderColor: '#00d4ff',           // Smooth cyan / turquoise line
                    borderWidth: 2.8,
                    borderDash: [],
                    pointRadius: 0,
                    tension: 0.35,
                    fill: false,
                    order: 1
                }
            ]
        },
        options: {
            ...BASE,
            layout: { padding: { top: 26, bottom: 6, left: 4, right: 12 } },
            plugins: {
                legend: { display: false } // Legend placed in header row
            },
            scales: {
                x: mkX(true), // Full engineering scale with depth ticks & label
                y: mkY(700, 3300, 'PRESSURE (psi)', '#e2e8f0', 300)
            }
        }
    });

    // 2. Compact Supporting Card 1: Flow Rate Monitoring
    const ctxFlow = document.getElementById('flowChart').getContext('2d');
    flowChart = new Chart(ctxFlow, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Flow In',
                    data: [],
                    borderColor: '#00d4ff',
                    borderWidth: 1.4,
                    borderDash: [4, 3],
                    pointRadius: 0,
                    tension: 0.2,
                    fill: false
                },
                {
                    label: 'Flow Out',
                    data: [],
                    borderColor: '#ff6b4a',
                    borderWidth: 1.8,
                    pointRadius: 0,
                    tension: 0.35,
                    fill: false
                }
            ]
        },
        options: {
            ...BASE,
            layout: { padding: { top: 6, bottom: 2, left: 0, right: 4 } },
            plugins: { legend: { display: false } },
            scales: {
                x: mkX(false),
                y: mkY(430, 600, null, '#ff6b4a', 50)
            }
        }
    });

    // 3. Compact Supporting Card 2: Mud Weight Monitoring
    const ctxMw = document.getElementById('mwChart').getContext('2d');
    mwChart = new Chart(ctxMw, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Actual MW',
                    data: [],
                    borderColor: '#00d4ff',
                    borderWidth: 1.8,
                    pointRadius: 0,
                    tension: 0.3,
                    fill: false
                },
                {
                    label: 'Rec MW',
                    data: [],
                    borderColor: '#fbbf24',
                    borderWidth: 1.4,
                    borderDash: [4, 3],
                    pointRadius: 0,
                    tension: 0.2,
                    fill: false
                }
            ]
        },
        options: {
            ...BASE,
            layout: { padding: { top: 6, bottom: 2, left: 0, right: 4 } },
            plugins: { legend: { display: false } },
            scales: {
                x: mkX(false),
                y: mkY(15, 45, null, '#00d4ff', 10)
            }
        }
    });

    // 4. Compact Supporting Card 3: ROP & Torque Monitoring (Dual Axis)
    const ctxRop = document.getElementById('ropChart').getContext('2d');
    ropChart = new Chart(ctxRop, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'ROP',
                    data: [],
                    borderColor: '#c084fc',
                    borderWidth: 1.8,
                    yAxisID: 'y',
                    pointRadius: 0,
                    tension: 0.35,
                    fill: false
                },
                {
                    label: 'Torque',
                    data: [],
                    borderColor: '#fbbf24',
                    borderWidth: 1.4,
                    yAxisID: 'y1',
                    pointRadius: 0,
                    tension: 0.35,
                    fill: false
                }
            ]
        },
        options: {
            ...BASE,
            layout: { padding: { top: 6, bottom: 2, left: 0, right: 0 } },
            plugins: { legend: { display: false } },
            scales: {
                x: mkX(false),
                y: {
                    min: 0.005, max: 0.022,
                    position: 'left',
                    grid: { color: C.grid, lineWidth: 0.7 },
                    border: { color: C.border },
                    ticks: { color: '#c084fc', font: { size: 8, family: C.mono }, maxTicksLimit: 4 },
                    title: { display: false }
                },
                y1: {
                    min: 8.0, max: 13.5,
                    position: 'right',
                    grid: { display: false },
                    border: { color: C.border },
                    ticks: { color: '#fbbf24', font: { size: 8, family: C.mono }, maxTicksLimit: 4 },
                    title: { display: false }
                }
            }
        }
    });

    // 5. Compact Supporting Card 4: Pit Volume / Gain-Loss Monitoring
    const ctxPit = document.getElementById('pitChart').getContext('2d');
    pitChart = new Chart(ctxPit, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Pit Gain / Loss',
                    data: [],
                    borderColor: '#10b981',
                    borderWidth: 1.8,
                    pointRadius: 0,
                    tension: 0.35,
                    fill: false
                }
            ]
        },
        options: {
            ...BASE,
            layout: { padding: { top: 6, bottom: 2, left: 0, right: 4 } },
            plugins: { legend: { display: false } },
            scales: {
                x: mkX(false),
                y: mkY(-18, 25, null, '#10b981', 10)
            }
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSIVE CHART DATA UPDATER
// Only plots data up to current depth index (nothing ahead is exposed).
// ─────────────────────────────────────────────────────────────────────────────
function updateAllCharts(idx) {
    const n      = idx + 1;
    const depths = SimData.depths.slice(0, n);

    // 1. Dominant Pressure chart datasets: ONLY up to current depth
    pressureChart.data.datasets[0].data = depths.map((d, i) => ({ x: d, y: SimData.fp[i] }));
    pressureChart.data.datasets[1].data = depths.map((d, i) => ({ x: d, y: SimData.frac[i] }));
    pressureChart.data.datasets[2].data = depths.map((d, i) => ({ x: d, y: SimData.bhp[i] }));
    pressureChart.update('none');

    // 2. Flow chart
    if (flowChart) {
        flowChart.data.datasets[0].data = depths.map((d, i) => ({ x: d, y: SimData.flowIn[i] }));
        flowChart.data.datasets[1].data = depths.map((d, i) => ({ x: d, y: SimData.flowOut[i] }));
        flowChart.update('none');
    }

    // 3. Mud Weight chart
    if (mwChart) {
        mwChart.data.datasets[0].data = depths.map((d, i) => ({ x: d, y: SimData.aMW[i] }));
        mwChart.data.datasets[1].data = depths.map((d, i) => ({ x: d, y: SimData.rMW[i] }));
        mwChart.update('none');
    }

    // 4. ROP & Torque chart
    if (ropChart) {
        ropChart.data.datasets[0].data = depths.map((d, i) => ({ x: d, y: SimData.rop[i] }));
        if (ropChart.data.datasets[1]) {
            ropChart.data.datasets[1].data = depths.map((d, i) => ({ x: d, y: SimData.torque[i] }));
        }
        ropChart.update('none');
    }

    // 5. Pit Volume chart
    if (pitChart) {
        pitChart.data.datasets[0].data = depths.map((d, i) => ({ x: d, y: SimData.pitVol[i] }));
        pitChart.update('none');
    }
}

function resetCharts() {
    gCursorDepth = DEPTH_MIN;
    [pressureChart, flowChart, mwChart, ropChart, pitChart].forEach(ch => {
        if (!ch) return;
        ch.data.datasets.forEach(ds => { ds.data = []; });
        ch.update('none');
    });
}
