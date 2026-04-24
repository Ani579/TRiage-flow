/**
 * Application Entry Point
 */
const engine = new TriageEngine();
window.engine = engine;

// Initial Data
const demoPatients = [
    { name: "John Doe", severity: "CRITICAL", condition: "Multiple Trauma - GSW" },
    { name: "Sarah Connor", severity: "HIGH", condition: "Severe Respiratory Distress" },
    { name: "Arthur Dent", severity: "MEDIUM", condition: "Suspected Fracture - Left Arm" },
    { name: "Ford Prefect", severity: "LOW", condition: "Mild Laceration" },
    { name: "Ellen Ripley", severity: "CRITICAL", condition: "Acute Chest Pain - Cardiac" },
    { name: "Timmy Smith", severity: "MEDIUM", condition: "Allergic Reaction (Peanuts)", age: 12 }
];

function init() {
    // Add demo patients
    demoPatients.forEach(p => engine.addPatient(p.name, p.severity, p.condition));

    // Simulation: Add incoming ambulance after 5 seconds
    setTimeout(() => {
        engine.addIncoming(1, "CRITICAL");
        UI.showNotification("Critical patient arrival in 60 seconds", "warning");
    }, 5000);

    // Event Listeners
    setupEventListeners();

    // Main Loop (1s)
    setInterval(() => {
        engine.tick();
        updateUI();
    }, 1000);

    updateUI();

    // Splash Screen Sequence
    setTimeout(() => {
        document.getElementById('splash-status').innerText = "Linking Bed Registry...";
    }, 800);
    setTimeout(() => {
        document.getElementById('splash-status').innerText = "System Ready.";
    }, 1600);
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 1000);
    }, 2000);
}

function updateUI() {
    UI.renderQueue(engine.patients);
    UI.renderBeds(engine.beds, engine.patients);
    UI.renderIncoming(engine.incoming);
    UI.updateStats(engine.patients, engine.beds, engine.incoming);

    // Auto-alert for critical patients waiting too long
    const criticalWaiting = engine.patients.find(p => p.status === 'WAITING' && p.priorityScore > 1200);
    if (criticalWaiting && !criticalWaiting.alerted) {
        UI.showNotification(`Critical patient ${criticalWaiting.name} requires immediate bed allocation`);
        criticalWaiting.alerted = true;
    }
}

function setupEventListeners() {
    // MCI Toggle
    const mciToggle = document.getElementById('mci-toggle');
    const mciBanner = document.getElementById('mci-banner');
    
    mciToggle.addEventListener('change', (e) => {
        const active = e.target.checked;
        engine.toggleMCI(active);
        if (active) {
            document.body.classList.add('mci-active');
            mciBanner.classList.remove('hidden');
            UI.triggerAlert("MCI Mode Activated. Priority logic shifted to Survival Probability.", "danger");
            UI.logEvent("PROTOCOL SHIFT: MCI DISASTER MODE ENGAGED");
        } else {
            document.body.classList.remove('mci-active');
            mciBanner.classList.add('hidden');
            UI.showNotification("System reverted to Normal Operations.");
            UI.logEvent("PROTOCOL SHIFT: Normal Operations Resumed");
        }
        updateUI();
    });

    // Search Filtering
    const searchInput = document.getElementById('search-patients');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.patient-card');
        
        cards.forEach(card => {
            const name = card.querySelector('.patient-name').innerText.toLowerCase();
            const condition = card.querySelector('.patient-condition').innerText.toLowerCase();
            const id = card.querySelector('small').innerText.toLowerCase();
            
            if (name.includes(query) || condition.includes(query) || id.includes(query)) {
                card.style.display = 'flex';
                if (query.length > 0) card.classList.add('searching');
                else card.classList.remove('searching');
            } else {
                card.style.display = 'none';
            }
        });
    });

    // Admin Panel patient injection
    const addBtn = document.getElementById('add-patient-btn');
    addBtn.addEventListener('click', () => {
        const name = document.getElementById('p-name').value || "Unknown Patient";
        const severity = document.getElementById('p-severity').value;
        const condition = document.getElementById('p-condition').value || "Unspecified";
        
        const p = engine.addPatient(name, severity, condition);
        
        // Reset form
        document.getElementById('p-name').value = '';
        document.getElementById('p-condition').value = '';
        
        UI.triggerAlert(`Critical arrival: ${name}`, "danger");
        UI.logEvent(`NEW ADMISSION: Patient ${p.id} (${name}) registered as ${severity}`);
        updateUI();
    });

    // Simulate Emergency
    const emergencyBtn = document.getElementById('trigger-emergency');
    emergencyBtn?.addEventListener('click', () => {
        // Trigger 3 concurrent emergencies
        engine.addIncoming(1, "CRITICAL");
        engine.addIncoming(2, "CRITICAL");
        engine.addIncoming(3, "HIGH");
        UI.triggerAlert("MULTIPLE CASUALTY INCIDENT INBOUND", "danger");
        updateUI();
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.getAttribute('data-view');
            
            // UI Update
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            // View Update
            document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
            const targetView = document.getElementById(`view-${view}`);
            if (targetView) targetView.classList.add('active');
            
            UI.logEvent(`NAV: Switched to ${view.toUpperCase()} view`);
        });
    });
}

// Global handlers for UI button clicks
window.handleDischarge = (id) => {
    const patient = engine.patients.find(p => p.id === id);
    const bedId = patient?.bedId;
    engine.removePatient(id);
    UI.showNotification("Patient discharged. Bed available.");
    UI.logEvent(`DISCHARGE: Patient ${id} (${patient?.name}) cleared Bed ${bedId}`);
    updateUI();
};

window.handleManualAdmit = (id) => {
    const patient = engine.patients.find(p => p.id === id);
    const emptyBed = engine.beds.find(b => b.status === 'AVAILABLE');
    
    if (emptyBed && patient) {
        emptyBed.status = 'OCCUPIED';
        emptyBed.patientId = patient.id;
        patient.bedId = emptyBed.id;
        patient.status = 'ADMITTED';
        UI.showNotification(`Admitting ${patient.name} to Bed ${emptyBed.id}`);
        UI.logEvent(`ADMISSION: Patient ${patient.id} assigned to ${emptyBed.department} Bed ${emptyBed.id}`);
        updateUI();
    } else {
        UI.showNotification("No beds available for admission", "error");
        UI.logEvent(`ADMISSION FAILED: No bed capacity for Patient ${patient?.id}`);
    }
};

// Start the app
window.addEventListener('DOMContentLoaded', init);
