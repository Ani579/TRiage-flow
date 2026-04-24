/**
 * UI Renderer - Handles DOM updates and animations
 */
const UI = {
    renderQueue(patients) {
        const container = document.getElementById('queue-container');
        if (!container) return;

        // Simple reconcile logic or just clear/rebuild for demo
        container.innerHTML = '';
        
        patients.forEach((p, index) => {
            if (p.status !== 'WAITING') return;

            const waitTime = Math.floor((Date.now() - p.entryTime) / 1000);
            const minutes = Math.floor(waitTime / 60);
            const seconds = waitTime % 60;
            const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            const card = document.createElement('div');
            card.className = `patient-card ${p.currentSeverity === 'CRITICAL' ? 'critical-vitals' : ''}`;
            card.onclick = () => this.renderExplainability(p);
            
            card.innerHTML = `
                <div class="priority-tag ${p.currentSeverity.toLowerCase()}"></div>
                <div class="patient-info">
                    <span class="patient-name">${p.name} <small style="opacity: 0.5; font-size: 10px;">#${p.id} • ${p.age}${p.gender} • ${p.bloodType}</small></span>
                    <span class="patient-condition">${p.condition}</span>
                    <div class="vitals-mini">
                        <span class="vital-item">HR: ${p.vitals.hr}</span>
                        <span class="vital-item">BP: ${p.vitals.bp}</span>
                        <span class="vital-item">SpO2: ${p.vitals.spo2}%</span>
                        <span class="vital-item" style="color: var(--accent)">Survival: ${p.survivalProbability}%</span>
                    </div>
                    ${p.waitScore > 0 ? `<div class="insight-label" style="font-size: 10px; color: var(--severity-high); margin-top: 4px;">⬆ Priority boosted by wait time</div>` : ''}
                </div>
                <div class="wait-timer">
                    <span class="time">${timeStr}</span>
                    <span class="label">Waiting</span>
                </div>
                <div class="patient-actions">
                    <button onclick="handleManualAdmit('${p.id}')" style="background: none; border: 1px solid var(--border-color); color: white; border-radius: 6px; padding: 4px 8px; font-size: 10px; cursor: pointer;">Admit</button>
                </div>
            `;
            container.appendChild(card);
        });

        // Also update Full View if it exists
        const fullContainer = document.getElementById('full-queue-container');
        if (fullContainer) {
            fullContainer.innerHTML = '';
            patients.forEach(p => {
                const card = document.createElement('div');
                card.className = `patient-card ${p.currentSeverity === 'CRITICAL' ? 'critical-vitals' : ''}`;
                card.style.animation = 'none';
                card.onclick = () => this.renderExplainability(p);
                card.innerHTML = `
                    <div class="priority-tag ${p.currentSeverity.toLowerCase()}"></div>
                    <div style="width: 120px; font-weight: 700; color: var(--accent); font-size: 11px;">${p.status}</div>
                    <div class="patient-info">
                        <span class="patient-name">${p.name} <small>#${p.id}</small></span>
                        <span class="patient-condition">${p.age}${p.gender} • ${p.condition}</span>
                    </div>
                    <div style="width: 100px; text-align: right; font-family: monospace;">BP: ${p.vitals.bp}</div>
                `;
                fullContainer.appendChild(card);
            });
        }
    },

    renderBeds(beds, patients) {
        const container = document.getElementById('bed-grid-container');
        if (!container) return;

        container.innerHTML = '';
        beds.forEach(bed => {
            const slot = document.createElement('div');
            slot.className = `bed-slot ${bed.status.toLowerCase()}`;
            
            let innerHTML = `<span>${bed.id}</span>`;
            if (bed.status === 'OCCUPIED') {
                const patient = patients.find(p => p.id === bed.patientId);
                innerHTML = `
                    <span style="font-size: 8px; opacity: 0.7;">${bed.department} • BED ${bed.id}</span>
                    <span style="font-size: 11px; font-weight: 700;">${patient ? patient.name.split(' ')[0] : '...'}</span>
                    <span style="font-size: 8px; color: var(--accent)">${bed.equipment.join(' | ')}</span>
                    <button onclick="handleDischarge('${bed.patientId}')" style="background:none; border:none; color: #ff3b3b; font-size: 8px; cursor:pointer; margin-top:4px;">DISCHARGE</button>
                `;
            } else if (bed.status === 'RESERVED') {
                innerHTML = `
                    <span style="font-size: 8px;">${bed.department} • BED ${bed.id}</span>
                    <span style="font-size: 9px; font-weight: 700; color: var(--severity-high)">RESERVED</span>
                    <span style="font-size: 8px; opacity: 0.5;">${bed.equipment[0]} READY</span>
                `;
            } else {
                innerHTML = `
                    <span style="font-size: 8px; opacity: 0.4;">${bed.department}</span>
                    <span style="font-size: 8px; opacity: 0.5;">BED ${bed.id}</span>
                    <span style="font-size: 9px; opacity: 0.5;">FREE</span>
                `;
            }
            
            slot.innerHTML = innerHTML;
            container.appendChild(slot);
        });

        // Also update Full Bed Container
        const fullBedContainer = document.getElementById('full-bed-container');
        if (fullBedContainer) {
            fullBedContainer.innerHTML = container.innerHTML;
        }
    },

    renderIncoming(incoming) {
        const container = document.getElementById('incoming-container');
        if (!container) return;

        container.innerHTML = '';
        incoming.forEach(inc => {
            const minutes = Math.floor(inc.eta / 60);
            const seconds = inc.eta % 60;
            const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            const card = document.createElement('div');
            card.className = 'incoming-card';
            card.innerHTML = `
                <div class="incoming-info">
                    <span style="font-weight: 600; font-size: 12px; display: block;">Ambulance ${inc.id}</span>
                    <span style="font-size: 10px; color: var(--severity-critical)">SEVERITY: ${inc.severity}</span>
                </div>
                <div class="incoming-timer">${timeStr}</div>
            `;
            container.appendChild(card);
        });
    },

    updateStats(patients, beds, incoming) {
        const bedCount = document.getElementById('bed-count');
        const criticalCountText = document.getElementById('critical-count');
        const incomingCountText = document.getElementById('incoming-count');

        const occupiedBeds = beds.filter(b => b.occupied).length;
        const criticalCount = patients.filter(p => p.currentSeverity === 'CRITICAL' && p.status === 'WAITING').length;

        if (bedCount) bedCount.innerText = `${occupiedBeds} / ${beds.length}`;
        if (criticalCountText) criticalCountText.innerText = criticalCount;
        if (incomingCountText) incomingCountText.innerText = incoming.length;

        // Dynamic Staffing
        const staffCountText = document.getElementById('staff-count');
        if (staffCountText) {
            const baseStaff = 20;
            const shiftStaff = Math.floor(baseStaff + (occupiedBeds / 2) + (incoming.length * 2));
            staffCountText.innerText = `${shiftStaff} Active`;
        }

        // Analytics Strip
        const totalWaiting = document.getElementById('total-waiting');
        const medianWait = document.getElementById('median-wait');
        const facilityLoad = document.getElementById('facility-load');
        const activeProtocol = document.getElementById('active-protocol');

        const waiting = patients.filter(p => p.status === 'WAITING');
        if (totalWaiting) totalWaiting.innerText = waiting.length;
        
        if (medianWait) {
            const now = Date.now();
            const times = waiting.map(p => (now - p.entryTime) / 60000);
            if (times.length > 0) {
                const median = times.sort((a,b) => a-b)[Math.floor(times.length / 2)];
                medianWait.innerText = `${Math.round(median)}m`;
            } else {
                medianWait.innerText = '0m';
            }
        }

        if (facilityLoad) {
            const loadPercent = Math.round((occupiedBeds / beds.length) * 100);
            facilityLoad.innerText = `${loadPercent}%`;
        }

        if (activeProtocol) {
            activeProtocol.innerText = window.engine?.isMCIMode ? 'MCI PROTOCOL' : 'STANDARD ER';
        }

        this.generateInsights(patients, beds, incoming);
        this.renderChart(patients);

        // Clock
        const clock = document.getElementById('main-clock');
        if (clock) {
            const now = new Date();
            clock.innerText = now.toLocaleTimeString([], { hour12: false });
        }
    },

    showNotification(message, type = 'info') {
        const toggle = document.getElementById('voice-toggle');
        const voiceEnabled = toggle ? toggle.checked : true;

        if (voiceEnabled && 'speechSynthesis' in window) {
            const msg = new SpeechSynthesisUtterance(message);
            msg.rate = 1.1;
            window.speechSynthesis.speak(msg);
        }
        console.log(`[${type.toUpperCase()}] ${message}`);
    },

    renderChart(patients) {
        const container = document.getElementById('chart-viz');
        if (!container) return;

        // Maintain a history for the chart
        if (!this.chartData) this.chartData = Array(20).fill(0);
        
        // Calculate load (occupied beds + high priority wait)
        const load = patients.filter(p => p.status === 'ADMITTED' || p.currentSeverity === 'CRITICAL').length;
        this.chartData.push(load);
        if (this.chartData.length > 20) this.chartData.shift();

        const width = 300;
        const height = 100;
        const maxVal = Math.max(...this.chartData, 5);
        
        const points = this.chartData.map((val, i) => {
            const x = (i / 19) * width;
            const y = height - (val / maxVal) * height;
            return `${x},${y}`;
        }).join(' ');

        container.innerHTML = `
            <svg viewBox="0 0 ${width} ${height}" class="chart-svg">
                <defs>
                    <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.4"/>
                        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                <path d="M 0 ${height} L ${points} L ${width} ${height} Z" class="chart-area" fill="url(#chart-gradient)" />
                <polyline points="${points}" class="chart-line" />
            </svg>
        `;
    },

    triggerAlert(message, level = 'warning') {
        // Shake screen
        document.body.classList.add('shake-it');
        setTimeout(() => document.body.classList.remove('shake-it'), 500);

        // Visual flash
        const flash = document.createElement('div');
        flash.className = 'alert-flash';
        if (level === 'danger') flash.style.borderColor = 'var(--severity-critical)';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 1000);

        // Sound alert
        this.playAlertSound(level);
        this.showNotification(message, level);
    },

    playAlertSound(level) {
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(level === 'danger' ? 880 : 440, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, this.audioCtx.currentTime + 0.5);
        
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.5);
    },

    renderExplainability(patient) {
        const modal = document.getElementById('admin-modal');
        const content = modal.querySelector('.modal-content');
        
        content.innerHTML = `
            <h2>Explainable Triage: ${patient.name}</h2>
            <div style="margin: 20px 0;">
                <div style="font-size: 11px; color: var(--accent); margin-bottom: 12px; font-family: monospace;">
                    DEMOGRAPHICS: AGE ${patient.age} | SEX ${patient.gender} | BLOOD ${patient.bloodType}
                </div>
                <p style="font-size: 14px; margin-bottom: 20px; color: var(--text-secondary)">
                    AI Decision Rationale: Patient ranked priority <strong>${patient.priorityScore.toFixed(0)}</strong> based on clinical complexity and risk decomposition.
                </p>
                
                ${this.renderFactor('Clinical Severity', patient.factors.severity)}
                ${this.renderFactor('Wait Time Penalty', patient.factors.wait)}
                ${this.renderFactor('Survival Risk Index', patient.factors.risk)}
                
                <div style="margin-top: 24px; padding: 16px; background: rgba(255,255,255,0.05); border-radius: 12px; font-size: 12px;">
                    <strong>Clinical Summary:</strong> ${patient.condition}<br><br>
                    <strong>Recommendation:</strong> ${patient.currentSeverity === 'CRITICAL' ? 'Immediate resuscitation required.' : 'Priority monitoring advised.'}
                </div>
            </div>
            <button class="primary-btn" onclick="document.getElementById('admin-modal').classList.remove('show')">Close Analysis</button>
        `;
        modal.classList.add('show');
    },

    renderFactor(label, value) {
        return `
            <div class="factor-row">
                <span>${label}</span>
                <div class="factor-bar-bg">
                    <div class="factor-bar-fill" style="width: ${value}%"></div>
                </div>
                <span style="width: 30px; text-align: right;">${value.toFixed(0)}%</span>
            </div>
        `;
    },

    generateInsights(patients, beds, incoming) {
        const container = document.getElementById('insights-container');
        if (!container) return;

        const occupied = beds.filter(b => b.status === 'OCCUPIED').length;
        const waiting = patients.filter(p => p.status === 'WAITING').length;
        const criticalCount = patients.filter(p => p.currentSeverity === 'CRITICAL' && p.status === 'WAITING').length;

        let messages = [];
        if (occupied > 15) messages.push("⚠️ Bed shortage detected. Divert non-critical patients.");
        if (criticalCount > 2) messages.push("❗ Surge in critical cases. Resource threshold exceeded.");
        if (waiting > 10) messages.push("⏳ High queue volume. Expedite stabilization.");
        if (incoming.length > 0) messages.push(`🚑 Ambulance inbound: ${incoming.length}`);
        
        // Critical Patient Demographics Insight
        const elderlyCritical = patients.find(p => p.status === 'WAITING' && p.age > 65 && p.currentSeverity === 'CRITICAL');
        if (elderlyCritical) messages.push(`💎 Priority Alert: Patient ${elderlyCritical.id} (Age 65+) requires senior consultation.`);
        
        const pediatricCase = patients.find(p => p.status === 'WAITING' && p.age < 18);
        if (pediatricCase) messages.push(`👶 Pediatric alert: Patient ${pediatricCase.id} in queue. Notify child care.`);

        if (messages.length === 0) messages.push("✅ System flow stable. Operational capacity normal.");

        container.innerHTML = messages.map(m => `
            <div class="insight-card" style="border-left: 2px solid var(--accent); margin-bottom: 8px; background: rgba(255,255,255,0.02)">
                <p style="font-size: 11px;">${m}</p>
            </div>
        `).join('');
    },

    logEvent(message) {
        const container = document.getElementById('event-log');
        if (!container) return;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const item = document.createElement('div');
        item.innerHTML = `<span style="color: var(--accent); opacity: 0.6;">[${time}]</span> ${message}`;
        item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        item.style.paddingBottom = '2px';
        
        container.prepend(item);
        if (container.children.length > 30) container.lastChild.remove();
    }
};

window.UI = UI;
