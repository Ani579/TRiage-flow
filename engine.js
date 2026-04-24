/**
 * TriageEngine - The brain of TriageFlow
 * Handles priority queuing, vitals decay, and bed allocation logic.
 */
class TriageEngine {
    constructor() {
        this.patients = [];
        this.beds = Array(20).fill(null).map((_, i) => ({ 
            id: i + 1, 
            status: 'AVAILABLE', 
            department: i < 5 ? 'ICU' : (i < 12 ? 'ER-Trauma' : 'General'),
            equipment: i < 8 ? ['Ventilator', 'Monitor', 'SPO2'] : ['Monitor', 'SPO2'],
            patientId: null 
        }));
        this.incoming = [];
        this.isMCIMode = false;
        this.severityWeights = {
            'CRITICAL': 1000,
            'HIGH': 500,
            'MEDIUM': 200,
            'LOW': 100
        };
    }

    addPatient(name, severity, condition) {
        const patient = {
            id: 'P' + Math.random().toString(36).substr(2, 5).toUpperCase(),
            name,
            age: Math.floor(18 + Math.random() * 70),
            gender: Math.random() > 0.5 ? 'M' : 'F',
            bloodType: ['A+', 'B+', 'O+', 'AB+', 'O-'][Math.floor(Math.random() * 5)],
            originalSeverity: severity,
            currentSeverity: severity,
            condition,
            entryTime: Date.now(),
            vitals: {
                hr: Math.floor(60 + Math.random() * 60),
                bp: `${110 + Math.floor(Math.random() * 40)}/${70 + Math.floor(Math.random() * 20)}`,
                spo2: 94 + Math.floor(Math.random() * 6)
            },
            waitScore: 0,
            priorityScore: 0,
            factors: { severity: 0, wait: 0, risk: Math.random() * 100 },
            survivalProbability: Math.floor(40 + Math.random() * 60),
            bedId: null,
            status: 'WAITING'
        };
        this.patients.push(patient);
        this.updatePriorities();
        this.autoAllocateBeds();
        return patient;
    }

    addIncoming(etaMinutes, severity) {
        const inc = {
            id: 'INC' + Math.random().toString(36).substr(2, 5).toUpperCase(),
            eta: etaMinutes * 60, // store in seconds
            originalEta: etaMinutes * 60,
            severity,
            ghostReserved: false
        };
        this.incoming.push(inc);
        // Reservation logic
        const availableBed = this.beds.find(b => b.status === 'AVAILABLE');
        if (availableBed && (severity === 'CRITICAL' || severity === 'HIGH')) {
            availableBed.status = 'RESERVED';
            availableBed.incomingId = inc.id;
        }
    }

    updatePriorities() {
        const now = Date.now();
        this.patients.forEach(p => {
            if (p.status !== 'ADMITTED') {
                const waitTimeMinutes = (now - p.entryTime) / 60000;
                // Vitals Decay Logic: Every 5 minutes of waiting increases "effective" severity
                // If waiting too long, Priority increases
                const decayBoost = Math.floor(waitTimeMinutes / 5) * 50; 
                
                let baseScore = this.severityWeights[p.currentSeverity];
                
                if (this.isMCIMode) {
                    // In MCI Mode: Prioritize those with HIGHER survival probability 
                    // AND moderate severity (efficient use of resources)
                    // Logic: Score = (Survival Prob * 5) + (Severity Weight / 2)
                    p.priorityScore = (p.survivalProbability * 10) + (baseScore * 0.1);
                } else {
                    // Normal Mode: Severity is King, Wait Time is the multiplier
                    p.priorityScore = baseScore + decayBoost;
                }
                
                p.waitScore = decayBoost;
                p.factors = {
                    severity: (baseScore / 1000) * 100,
                    wait: Math.min(100, (p.waitScore / 300) * 100),
                    risk: 100 - p.survivalProbability
                };
            }
        });

        // Sort patients by priority score descending
        this.patients.sort((a, b) => b.priorityScore - a.priorityScore);
    }

    reserveGhostBed() {
        const freeBed = this.beds.find(b => !b.occupied);
        if (freeBed) {
            // We don't actually occupy it yet, but we mark it for the engine
            // In a real system, this would prevent allocation to walk-ins
        }
    }

    autoAllocateBeds() {
        // Find waiting patients and empty beds
        const waitingPatients = this.patients
            .filter(p => p.status === 'WAITING')
            .sort((a, b) => b.priorityScore - a.priorityScore);

        waitingPatients.forEach(patient => {
            // Find a bed that is either AVAILABLE or RESERVED for THIS patient
            const bed = this.beds.find(b => 
                b.status === 'AVAILABLE' || 
                (b.status === 'RESERVED' && b.incomingId === patient.incomingId)
            );

            if (bed) {
                bed.status = 'OCCUPIED';
                bed.patientId = patient.id;
                bed.incomingId = null;
                patient.bedId = bed.id;
                patient.status = 'ADMITTED';
            }
        });
    }

    toggleMCI(enabled) {
        this.isMCIMode = enabled;
        this.updatePriorities();
        this.autoAllocateBeds();
    }

    tick() {
        // Update incoming timers
        this.incoming = this.incoming.filter(inc => {
            inc.eta -= 1;
            return inc.eta > 0; // Remove when arrived
        });

        // Arrival logic: When ETA hits 0, add to patients
        // (Handled by app.js looking for transitions)

        this.updatePriorities();
    }

    removePatient(id) {
        const patient = this.patients.find(p => p.id === id);
        if (patient && patient.bedId) {
            const bed = this.beds.find(b => b.id === patient.bedId);
            if (bed) {
                bed.occupied = false;
                bed.patientId = null;
            }
        }
        this.patients = this.patients.filter(p => p.id !== id);
        this.autoAllocateBeds();
    }
}

window.TriageEngine = TriageEngine;
