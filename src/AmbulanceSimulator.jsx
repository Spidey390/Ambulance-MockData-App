import React, { useState, useEffect } from "react";
import { Activity, Heart, MapPin, Play, Square, User, Truck, RefreshCw, Trash2, Plus, Wind } from "lucide-react";
const GET_URL = "http://localhost:3000/api/ambulance/status";
const UPDATE_URL = "http://localhost:3000/api/ambulance/update";
const ADD_URL = "http://localhost:3000/api/ambulance/add";
const DELETE_URL = "http://localhost:3000/api/ambulance/delete";
const scrollbarStyles = `
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #F3F4F6; }
::-webkit-scrollbar-thumb { background: #2D2F54; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #1e1f3a; }
`;
export default function AmbulanceSimulator() {
    const [ambulances, setAmbulances] = useState([]);
    const [activeSims, setActiveSims] = useState({});
    const [newAmbId, setNewAmbId] = useState("");
    const fetchAmbulances = async () => {
        try {
            const res = await fetch(GET_URL);
            const data = await res.json();
            setAmbulances(Array.isArray(data) ? data : [data]);
        } catch (err) {
            console.error("Fetch failed", err);
        }
    };
    useEffect(() => { fetchAmbulances(); }, []);
    const addAmbulance = async () => {
        if (!newAmbId.trim()) return alert("Enter Ambulance ID");
        const payload = {
            ambulanceId: newAmbId,
            hasPatient: false,
            heartRate: 0,
            spo2: 0,
            latitude: 12.9716,
            longitude: 77.5946
        };
        try {
            await fetch(UPDATE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            setNewAmbId("");
            fetchAmbulances();
        } catch (err) {
            console.error("Add error", err);
        }
    };
    const deleteAmbulance = async (id) => {
        if (!window.confirm("Delete this ambulance?")) return;
        try {
            await fetch(`${DELETE_URL}/${id}`, { method: "DELETE" });
            fetchAmbulances();
        } catch (err) {
            console.error("Delete failed", err);
        }
    };
    const moveAmbulance = (lat, lng) => ({
        latitude: lat + (Math.random() - 0.5) * 0.002,
        longitude: lng + (Math.random() - 0.5) * 0.002
    });
    const getVitals = (isOnboard) =>
        !isOnboard ? { heartRate: 0, spo2: 0 } :
            { heartRate: Math.floor(70 + Math.random() * 30), spo2: Math.floor(95 + Math.random() * 5) };
    useEffect(() => {
        if (!isSimulating) return;
        const interval = setInterval(() => {
            const updates = {};
            const timestamp = Date.now();
            Object.values(ambulances).forEach((amb) => {
                if (!amb.isRunning) return;
                let { latitude, longitude, heartRate, spo2, isEmergency, ambulanceId } = amb;

                latitude += (Math.random() - 0.5) * 0.001;
                longitude += (Math.random() - 0.5) * 0.001;

                if (isEmergency) {
                    heartRate = 60 + Math.floor(Math.random() * 40);
                    spo2 = 94 + Math.floor(Math.random() * 6);
                } else {
                    heartRate = 0;
                    spo2 = 0;
                }

                updates[`ambulances/${ambulanceId}`] = {
                    ...amb, latitude, longitude, heartRate, spo2,
                    hasPatient: isEmergency, timestamp
                };
            });
            if (Object.keys(updates).length > 0) update(ref(db), updates);
        }, 1000);
        return () => clearInterval(interval);
    }, [ambulances, isSimulating]);

    const deployAmbulance = () => {
        if (!newId) return;
        const loc = getRandomLocation();
        const newAmb = {
            ambulanceId: newId,
            latitude: loc.lat,
            longitude: loc.lng,
            heartRate: 0,
            spo2: 0,
            hasPatient: false,
            isRunning: false,
            isEmergency: false,
            timestamp: Date.now()
        };
        update(ref(db, `ambulances/${newId}`), newAmb);
        const num = parseInt(newId.split('_')[1] || "0") + 1;
        setNewId(`AMB_${String(num).padStart(3, '0')}`);
    };

    const removeAmbulance = (id) => remove(ref(db, `ambulances/${id}`));

    const handleStartStop = (id) => {
        const amb = ambulances[id];
        if (amb.isRunning) {
            update(ref(db, `ambulances/${id}`), { isRunning: false, isEmergency: false });
        } else {
            update(ref(db, `ambulances/${id}`), { isRunning: true, isEmergency: false });
        }
    };

    const handleEmergency = (id) => {
        const amb = ambulances[id];
        if (amb.isEmergency) {
            update(ref(db, `ambulances/${id}`), { isEmergency: false });
        } else {
            update(ref(db, `ambulances/${id}`), { isEmergency: true, isRunning: true });
        }
    };

    // --- UI SECTION ---
    return (
        <div style={styles.appContainer}>
            <style>{`
        body, html { margin: 0; padding: 0; overflow: hidden; height: 100%; font-family: 'Inter', sans-serif; background-color: #F9FAFB; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
      `}</style>

            {/* Fixed Header */}
            <div style={styles.header}>
                <div style={styles.brandSection}>
                    <div style={styles.logoBox}>
                        <Activity color="#EF4444" size={28} />
                    </div>
                    <h1 style={styles.title}>Fleet Simulator</h1>
                </div>

                <div style={styles.controlSection}>
                    <input
                        style={styles.input}
                        value={newId}
                        onChange={(e) => setNewId(e.target.value)}
                        placeholder="ID (e.g. AMB_101)"
                    />
                    <button style={styles.deployBtn} onClick={deployAmbulance}>
                        <Plus size={18} /> <span style={styles.btnText}>Deploy</span>
                    </button>
                    <button style={styles.refreshBtn} onClick={() => window.location.reload()}>
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Scrollable Grid Area */}
            <div style={styles.contentArea}>
                <div style={styles.grid}>
                    {Object.values(ambulances).sort((a, b) => a.ambulanceId.localeCompare(b.ambulanceId)).map((amb) => (
                        <div key={amb.ambulanceId} style={{ ...styles.card, opacity: amb.isRunning ? 1 : 0.85, borderColor: amb.isEmergency ? '#FECACA' : '#F3F4F6' }}>

                            {/* Card Header */}
                            <div style={styles.cardHeader}>
                                <div>
                                    <div style={styles.idText}>{amb.ambulanceId}</div>
                                    <div style={styles.coordText}>
                                        {amb.latitude?.toFixed(4)}, {amb.longitude?.toFixed(4)}
                                    </div>
                                </div>
                                <div style={styles.statusCol}>
                                    <span style={{
                                        ...styles.badge,
                                        backgroundColor: !amb.isRunning ? '#F1F5F9' : (amb.isEmergency ? '#FEF2F2' : '#ECFDF5'),
                                        color: !amb.isRunning ? '#64748B' : (amb.isEmergency ? '#991B1B' : '#047857')
                                    }}>
                                        {!amb.isRunning ? 'OFFLINE' : (amb.isEmergency ? 'EMERGENCY' : 'ONLINE')}
                                    </span>
                                    <button style={styles.deleteIcon} onClick={() => removeAmbulance(amb.ambulanceId)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Vitals Data */}
                            <div style={styles.vitalsBox}>
                                <div style={styles.vitalGroup}>
                                    <Heart size={18} fill={amb.isEmergency ? "#EF4444" : "none"} color={amb.isEmergency ? "#EF4444" : "#94A3B8"} />
                                    <span style={{ ...styles.vitalNum, color: amb.isEmergency ? "#0F172A" : "#94A3B8" }}>
                                        {amb.isEmergency ? amb.heartRate : '--'} <span style={styles.unit}>bpm</span>
                                    </span>
                                </div>
                                <div style={styles.vitalGroup}>
                                    <Wind size={18} color={amb.isEmergency ? "#10B981" : "#94A3B8"} />
                                    <span style={{ ...styles.vitalNum, color: amb.isEmergency ? "#0F172A" : "#94A3B8" }}>
                                        {amb.isEmergency ? amb.spo2 : '--'} <span style={styles.unit}>%</span>
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={styles.footer}>
                                <button
                                    onClick={() => handleStartStop(amb.ambulanceId)}
                                    style={{
                                        ...styles.actionBtn,
                                        backgroundColor: amb.isRunning ? '#1E293B' : '#0F172A',
                                        flex: 1
                                    }}
                                >
                                    {amb.isRunning ? <Square size={16} fill="white" /> : <Play size={16} fill="white" />}
                                    {amb.isRunning ? 'Stop' : 'Start'}
                                </button>

                                <button
                                    onClick={() => handleEmergency(amb.ambulanceId)}
                                    style={{
                                        ...styles.actionBtn,
                                        backgroundColor: amb.isEmergency ? '#EF4444' : '#F1F5F9',
                                        color: amb.isEmergency ? 'white' : '#475569',
                                        flex: 1.2
                                    }}
                                >
                                    <Siren size={18} />
                                    {amb.isEmergency ? 'Emergency' : 'Emergency'}
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const styles = {
    appContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#F8FAFC',
        overflow: 'hidden', // Prevents double scrollbars
    },
    header: {
        display: 'flex',
        flexWrap: 'wrap', // Responsive wrapping
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        gap: '16px',
        zIndex: 10,
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    },
    brandSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    logoBox: {
        backgroundColor: '#FEF2F2',
        padding: '8px',
        borderRadius: '10px'
    },
    title: {
        fontSize: '22px',
        fontWeight: '800',
        color: '#0F172A',
        margin: 0,
        letterSpacing: '-0.5px'
    },
    controlSection: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap', // Allows buttons to drop to next line on mobile
    },
    input: {
        padding: '0 16px',
        height: '42px',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        fontSize: '14px',
        width: '180px', // Fixed width for cleaner look
        outline: 'none',
        backgroundColor: '#F8FAFC',
        color: '#0F172A'
    },
    deployBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        height: '42px',
        padding: '0 20px',
        backgroundColor: '#0F172A',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background 0.2s',
        whiteSpace: 'nowrap'
    },
    refreshBtn: {
        height: '42px',
        width: '42px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        cursor: 'pointer',
        color: '#64748B'
    },
    btnText: {
        display: 'inline-block' // Ensures text doesn't collapse oddly
    },
    contentArea: {
        flex: 1, // Takes remaining height
        overflowY: 'auto', // Internal scroll
        padding: '24px',
    },
    grid: {
        display: 'grid',
        // Responsive columns: Minimum 300px wide, fills available space
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        maxWidth: '1600px', // Prevents it from getting too stretched on 4k monitors
        margin: '0 auto'
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'all 0.3s ease'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    idText: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#0F172A'
    },
    coordText: {
        fontSize: '12px',
        color: '#64748B',
        marginTop: '4px',
        fontFamily: 'monospace'
    },
    statusCol: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px'
    },
    badge: {
        fontSize: '11px',
        fontWeight: '700',
        padding: '4px 8px',
        borderRadius: '20px',
        letterSpacing: '0.5px'
    },
    deleteIcon: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#EF4444',
        padding: '4px',
        opacity: 0.6,
        transition: 'opacity 0.2s'
    },
    vitalsBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-around', // Even spacing
        alignItems: 'center'
    },
    vitalGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    vitalNum: {
        fontSize: '16px',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'baseline',
        gap: '2px'
    },
    unit: {
        fontSize: '11px',
        color: '#94A3B8',
        fontWeight: '500'
    },
    footer: {
        display: 'flex',
        gap: '12px',
        marginTop: 'auto' // Pushes buttons to bottom if card height varies
    },
    actionBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px 16px',
        borderRadius: '8px',
        border: 'none',
        fontWeight: '600',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        color: 'white'
    }
};
