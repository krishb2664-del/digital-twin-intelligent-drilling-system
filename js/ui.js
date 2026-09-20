'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// BUILD DEPTH-WISE EVENT TABLE (13 columns)
// ─────────────────────────────────────────────────────────────────────────────
function buildEventTable() {
    const thead = document.getElementById('eventTableHead');
    const tbody = document.getElementById('eventTableBody');
    if (!thead || !tbody) return;

    // Header: Depth intervals
    let headHtml = '<tr><th class="tbl-lbl-col">PARAMETER</th>';
    EVENT_COLUMNS.forEach(col => {
        headHtml += `<th class="tbl-col" id="th-${col.id}">${col.depth}</th>`;
    });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    // Rows: 1. Depth, 2. Event / Condition, 3. Expected Behavior
    let bodyHtml = '';

    // Row 1: Depth (ft)
    bodyHtml += '<tr><td class="tbl-lbl-col">Depth (ft)</td>';
    EVENT_COLUMNS.forEach(col => {
        bodyHtml += `<td class="tbl-cell tbl-depth" id="cell-d-${col.id}">${col.depth}</td>`;
    });
    bodyHtml += '</tr>';

    // Row 2: Event / Condition
    bodyHtml += '<tr><td class="tbl-lbl-col">Event / Condition</td>';
    EVENT_COLUMNS.forEach(col => {
        bodyHtml += `<td class="tbl-cell tbl-event" id="cell-e-${col.id}">${col.event}</td>`;
    });
    bodyHtml += '</tr>';

    // Row 3: Expected Behavior
    bodyHtml += '<tr><td class="tbl-lbl-col">Expected Behavior</td>';
    EVENT_COLUMNS.forEach(col => {
        bodyHtml += `<td class="tbl-cell tbl-beh" id="cell-b-${col.id}">${col.behavior}</td>`;
    });
    bodyHtml += '</tr>';

    tbody.innerHTML = bodyHtml;
}

function highlightEventColumn(depth) {
    let activeId = EVENT_COLUMNS[0].id;
    for (let i = 0; i < EVENT_COLUMNS.length; i++) {
        if (depth >= EVENT_COLUMNS[i].min && depth <= EVENT_COLUMNS[i].max) {
            activeId = EVENT_COLUMNS[i].id;
            break;
        }
    }

    EVENT_COLUMNS.forEach(col => {
        const isActive = (col.id === activeId);
        const th = document.getElementById(`th-${col.id}`);
        const cd = document.getElementById(`cell-d-${col.id}`);
        const ce = document.getElementById(`cell-e-${col.id}`);
        const cb = document.getElementById(`cell-b-${col.id}`);
        [th, cd, ce, cb].forEach(el => {
            if (!el) return;
            if (isActive) el.classList.add('col-active');
            else el.classList.remove('col-active');
        });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP PARAMETER BAR
// ─────────────────────────────────────────────────────────────────────────────
function updateTopBar(idx, override) {
    const bhp    = override?.bhp !== undefined ? override.bhp : (SimData.liveBhp ? SimData.liveBhp[idx] : SimData.bhp[idx]);
    const fp     = SimData.fp[idx];
    const frac   = SimData.frac[idx];
    const aMW    = override?.aMW !== undefined ? override.aMW : SimData.aMW[idx];
    const rMW    = SimData.rMW[idx];
    const flowIn = override?.flowIn !== undefined ? override.flowIn : SimData.flowIn[idx];
    const flowOut= override?.flowOut !== undefined ? override.flowOut : SimData.flowOut[idx];
    const pit    = SimData.pitVol[idx];
    const rpm    = override?.rpm !== undefined ? override.rpm : SimData.rpm[idx];
    const rop    = override?.rop !== undefined ? override.rop : SimData.rop[idx];
    const torque = override?.torque !== undefined ? override.torque : SimData.torque[idx];

    const set = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
    };

    set('val-pressure', bhp);
    set('val-mw', (typeof aMW === 'number' ? aMW.toFixed(2) : aMW));
    set('val-recmw', rMW.toFixed(2));
    set('val-flowin', flowIn);
    set('val-flowout', flowOut);
    set('val-pit', (pit >= 0 ? '+' : '') + pit.toFixed(1));
    set('val-rpm', rpm);
    set('val-rop', (typeof rop === 'number' ? rop.toFixed(4) : rop));
    set('val-torque', (typeof torque === 'number' ? torque.toFixed(1) : torque));

    // Color indicators
    const pEl = document.getElementById('val-pressure');
    if (pEl) {
        pEl.style.color = (bhp < fp) ? '#ff4444' : (bhp >= frac) ? '#ff8844' : (bhp > frac - 80) ? '#ffaa00' : '#00d4ff';
    }

    const pitEl = document.getElementById('val-pit');
    if (pitEl) {
        pitEl.style.color = (pit > 5.0) ? '#ff4444' : (pit < -3.0) ? '#ff8844' : '#10b981';
    }

    const flowOutEl = document.getElementById('val-flowout');
    if (flowOutEl) {
        flowOutEl.style.color = (flowOut > flowIn + 15) ? '#ff4444' : (flowOut < flowIn - 15) ? '#ff8844' : '#ff6b4a';
    }

    const rEl = document.getElementById('val-recmw');
    if (rEl) {
        rEl.style.color = Math.abs(rMW - 40.26) < 0.02 ? '#ff8844' : Math.abs(rMW - 35.50) < 0.02 ? '#ffdd00' : '#00d4ff';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// WELL CONTROL & DRILLING OPERATIONS UI
// ─────────────────────────────────────────────────────────────────────────────
function updateWellControlUI(wc, depth, tickRes) {
    // 1. Drilling & Pump Status
    const drillBadge = document.getElementById('badge-drilling');
    const drillTxt   = document.getElementById('val-drill-state');
    const drillOn    = tickRes ? tickRes.drillOn : (wc ? wc.drillOn : true);
    if (drillTxt)   drillTxt.textContent = drillOn ? 'ON' : 'OFF';
    if (drillBadge) {
        drillBadge.className = 'wc-badge ' + (drillOn ? 'badge-active' : 'badge-inactive');
    }

    const pumpBadge = document.getElementById('badge-pump');
    const pumpTxt   = document.getElementById('val-pump-state');
    const pumpOn    = tickRes ? tickRes.pumpOn : (wc ? wc.pumpOn : true);
    if (pumpTxt)   pumpTxt.textContent = pumpOn ? 'ON' : 'OFF';
    if (pumpBadge) {
        pumpBadge.className = 'wc-badge ' + (pumpOn ? 'badge-active' : 'badge-inactive');
    }

    // 2. Large Alert / Operation Banner
    const bannerEl = document.getElementById('opStatusBanner');
    const iconEl   = document.getElementById('opStatusIcon');
    const titleEl  = document.getElementById('opStatusTitle');
    const subEl    = document.getElementById('opStatusSubtitle');
    const reqEl    = document.getElementById('opReqText');

    let title = tickRes?.bannerTitle || 'STAGE 1 — NORMAL DRILLING';
    let sub   = tickRes?.bannerSubtitle || 'All parameters within normal safe boundaries. No kick indication.';
    let icon  = tickRes?.bannerIcon || '⚡';
    let bCls  = tickRes?.bannerClass || 'st-wc-normal';
    let req   = tickRes?.reqText || 'Normal Drilling — No Action Required';

    if (!tickRes && depth !== undefined) {
        if (depth < 1310) {
            title = 'STAGE 1 — NORMAL DRILLING';
            sub   = 'All parameters within normal safe boundaries. Safe drilling window.';
            icon  = '⚡'; bCls = 'st-wc-normal'; req = 'Normal Drilling — No Action Required';
        } else if (depth < 1340) {
            title = '⚠️ KICK INDICATION DETECTED';
            sub   = 'Flow Out is abnormal. Possible influx / kick risk detected.';
            icon  = '⚠️'; bCls = 'st-wc-warning'; req = '🔴 TURN OFF DRILLING IMMEDIATELY';
        } else if (depth < 1370) {
            title = 'STAGE 1 — NORMAL DRILLING (KICK 1 CONTROLLED)';
            sub   = 'Well is stable with 22.00 ppg mud. Safe operating window.';
            icon  = '✓'; bCls = 'st-wc-normal'; req = 'Normal Drilling — No Action Required';
        } else if (depth < 1390) {
            title = '⚠️ ABNORMAL DRILLING / KICK RISK DETECTED';
            sub   = 'Abnormal Flow Out and ROP increase observed. Influx suspected.';
            icon  = '⚠️'; bCls = 'st-wc-warning'; req = '🔴 TURN OFF DRILLING IMMEDIATELY';
        } else if (depth < 1440) {
            title = 'FORMATION 2 — SAFE DRILLING (40.26 PPG)';
            sub   = 'Abnormal gas zone controlled. Drilling at 40.26 ppg.';
            icon  = '✓'; bCls = 'st-wc-normal'; req = 'Normal Drilling — No Action Required';
        } else if (depth < 1460) {
            title = 'FORMATION 2 — CONTROLLED MW REDUCTION';
            sub   = 'Controlled reduction toward 35.50 ppg within safe window.';
            icon  = '📉'; bCls = 'st-wc-normal'; req = 'Normal Drilling — No Action Required';
        } else if (depth < 1490) {
            title = 'FORMATION 2 — STABLE DRILLING (35.50 PPG)';
            sub   = 'Stable drilling to base of Formation 2.';
            icon  = '✓'; bCls = 'st-wc-normal'; req = 'Normal Drilling — No Action Required';
        } else if (depth < 1520) {
            title = '⚡ FORMATION 3 — FRACTURE RISK DETECTED';
            sub   = 'BHP exceeds fracture limit! Lost circulation and pit loss observed.';
            icon  = '⚡'; bCls = 'st-wc-danger'; req = 'FRACTURE RISK — REDUCE MUD WEIGHT';
        } else if (depth < 1540) {
            title = '📉 FORMATION 3 — REDUCING MUD WEIGHT';
            sub   = 'Driller reducing Mud Weight toward 28.50 ppg to heal fracture.';
            icon  = '📉'; bCls = 'st-wc-warning'; req = 'Mud Weight Reduction in Progress';
        } else {
            title = '✓ FORMATION 3 — STABLE DRILLING TO TD';
            sub   = 'Normal safe drilling in Formation 3 to 1650 ft total depth.';
            icon  = '✓'; bCls = 'st-wc-normal'; req = 'Normal Drilling to Total Depth';
        }
    }

    if (bannerEl) bannerEl.className = 'op-status-banner ' + bCls;
    if (iconEl)   iconEl.textContent  = icon;
    if (titleEl)  titleEl.textContent = title;
    if (subEl)    subEl.textContent   = sub;
    if (reqEl)    reqEl.textContent   = req;

    // 3. Large Gauges: SIDPP, SICP, KMW
    const sidppEl = document.getElementById('val-sidpp');
    const sicpEl  = document.getElementById('val-sicp');
    const kmwEl   = document.getElementById('val-kmw');

    const curSidpp = tickRes?.sidpp !== undefined ? tickRes.sidpp : wc?.sidpp;
    const curSicp  = tickRes?.sicp !== undefined ? tickRes.sicp : wc?.sicp;
    const curKmw   = tickRes?.kmw !== undefined ? tickRes.kmw : wc?.kmw;

    if (sidppEl) {
        if (curSidpp !== null && curSidpp !== undefined) {
            sidppEl.textContent = curSidpp;
            sidppEl.classList.add('active-reading');
        } else {
            sidppEl.textContent = '--';
            sidppEl.classList.remove('active-reading');
        }
    }

    if (sicpEl) {
        if (curSicp !== null && curSicp !== undefined) {
            sicpEl.textContent = curSicp;
            sicpEl.classList.add('active-reading');
        } else {
            sicpEl.textContent = '--';
            sicpEl.classList.remove('active-reading');
        }
    }

    if (kmwEl) {
        if (curKmw !== null && curKmw !== undefined) {
            kmwEl.textContent = typeof curKmw === 'number' ? curKmw.toFixed(2) : curKmw;
            kmwEl.classList.add('active-reading');
        } else {
            kmwEl.textContent = '--';
            kmwEl.classList.remove('active-reading');
        }
    }

    // 4. Interactive Action Buttons
    const btns = wc ? wc.getActiveButtons() : {};
    const setBtn = (id, enabled) => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !enabled;
    };

    setBtn('btnStopDrilling',   btns.stopDrilling);
    setBtn('btnStopPump',       btns.stopPump);
    setBtn('btnShutIn',         btns.shutIn);
    setBtn('btnCalcKmw',        btns.calcKmw);
    setBtn('btnApplyKmw',       btns.applyKmw);
    setBtn('btnResumeDrilling', btns.resumeDrilling);
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS AND FORMATION INFO
// ─────────────────────────────────────────────────────────────────────────────
function updateStatus(state) {
    const wrap = document.getElementById('statusIndicator');
    const icon = document.getElementById('statusIcon');
    const text = document.getElementById('statusText');
    const desc = document.getElementById('statusEvent');

    if (icon) icon.textContent = state.icon;
    if (text) text.textContent = state.text;
    if (desc && state.desc) desc.textContent = state.desc;

    if (wrap) {
        wrap.className = 'status-indicator';
        if (state.type === 'stable') wrap.classList.add('st-stable');
        else if (state.type === 'danger' || state.type === 'fracture') wrap.classList.add('st-danger');
        else wrap.classList.add('st-warning');
    }

    // Siren / Alert panel
    const sp   = document.getElementById('siren-panel');
    const sTxt = document.getElementById('sirenText');
    const sIcon= document.getElementById('sirenIcon');
    if (sp) {
        const mode = state.soundMode || (state.siren ? 'KICK_WARNING' : 'NONE');
        if (state.siren || mode !== 'NONE') {
            sp.classList.add('siren-active');
            if (mode === 'KICK_WARNING') {
                if (sIcon) sIcon.textContent = '⚠';
                if (sTxt)  sTxt.textContent  = 'KICK WARNING';
            } else if (mode === 'KICK_SUSPECTED') {
                if (sIcon) sIcon.textContent = '⚠';
                if (sTxt)  sTxt.textContent  = 'KICK SUSPECTED';
            } else if (mode === 'KICK_CONFIRMED') {
                if (sIcon) sIcon.textContent = '🚨';
                if (sTxt)  sTxt.textContent  = 'KICK ALARM';
            } else if (mode === 'FRACTURE_RISK') {
                if (sIcon) sIcon.textContent = '⚡';
                if (sTxt)  sTxt.textContent  = 'FRAC WARNING';
            } else {
                if (sIcon) sIcon.textContent = '🚨';
                if (sTxt)  sTxt.textContent  = 'SIREN ACTIVE';
            }
        } else {
            sp.classList.remove('siren-active');
            if (sIcon) sIcon.textContent = '🔇';
            if (sTxt)  sTxt.textContent  = 'SIREN OFF';
        }
    }
}

function updateDepthDisplay(d) {
    const el = document.getElementById('currentDepth');
    if (el) el.textContent = Math.round(d);
}

function startClock() {
    const el = document.getElementById('clock');
    if (!el) return;
    const tick = () => {
        const n = new Date();
        el.textContent =
            String(n.getHours()).padStart(2,'0') + ':' +
            String(n.getMinutes()).padStart(2,'0') + ':' +
            String(n.getSeconds()).padStart(2,'0');
    };
    tick();
    setInterval(tick, 1000);
}

function initUI() {
    buildEventTable();
    startClock();
}

window.updateWellControlUI = updateWellControlUI;

