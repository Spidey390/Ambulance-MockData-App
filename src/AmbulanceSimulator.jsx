import React, { useState, useEffect } from "react";
import { Activity, Heart, MapPin, Play, Square, User, Truck, RefreshCw, Trash2, Plus, Wind } from "lucide-react";
const GET_URL = "https://ambulance-monitoring.onrender.com/api/ambulance/status/api/ambulance/status";
const UPDATE_URL = "https://ambulance-monitoring.onrender.com/api/ambulance/status/api/ambulance/update";
const ADD_URL = "https://ambulance-monitoring.onrender.com/api/ambulance/status/api/ambulance/add";
const DELETE_URL = "https://ambulance-monitoring.onrender.com/api/ambulance/status/api/ambulance/delete";
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
        const interval = setInterval(() => {
            Object.keys(activeSims).forEach(async (id) => {
                if (!activeSims[id]) return;
                const amb = ambulances.find(a => (a.vehicleId || a.ambulanceId) === id);
                if (!amb) return;
                const newLoc = moveAmbulance(amb.location.latitude, amb.location.longitude);
                const newVitals = getVitals(amb.patient.isOnboard);
                await fetch(UPDATE_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ambulanceId: id,
                        hasPatient: amb.patient.isOnboard,
                        heartRate: newVitals.heartRate,
                        spo2: newVitals.spo2,
                        latitude: newLoc.latitude,
                        longitude: newLoc.longitude
                    })
                });
                setAmbulances(prev => prev.map(a =>
                    (a.vehicleId || a.ambulanceId) === id
                        ? { ...a, location: newLoc, patient: { ...a.patient, vitals: { heartRate: newVitals.heartRate, spO2: newVitals.spo2 } } }
                        : a
                ));
            });
        }, 2000);
        return () => clearInterval(interval);
    }, [activeSims, ambulances]);
    const toggleSimulation = async (id) => {
        const willStop = activeSims[id];
        if (willStop) {
            // Stopping simulation, automatically unload patient if onboard
            const amb = ambulances.find(a => (a.vehicleId || a.ambulanceId) === id);
            if (amb && amb.patient.isOnboard) {
                await togglePatient(amb);
            }
        }
        setActiveSims(prev => ({ ...prev, [id]: !prev[id] }));
    };
    const togglePatient = async (amb) => {
        const id = amb.vehicleId || amb.ambulanceId;
        const isRunning = activeSims[id];
        const newState = !amb.patient.isOnboard;
        if (newState && !isRunning) {
            alert("Cannot load patient while the ambulance is IDLE.");
            return;
        }
        try {
            await fetch(UPDATE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ambulanceId: id,
                    hasPatient: newState,
                    heartRate: amb.patient.vitals?.heartRate || 0,
                    spo2: amb.patient.vitals?.spO2 || 0,
                    latitude: amb.location.latitude,
                    longitude: amb.location.longitude
                })
            });
        } catch (err) {
            console.error("Update failed", err);
            return;
        }
        setAmbulances(prev => prev.map(a =>
            (a.vehicleId || a.ambulanceId) === id
                ? { ...a, patient: { ...a.patient, isOnboard: newState } }
                : a
        ));
    };
    return (
        <div style={styles.container}>
            <style>{scrollbarStyles}</style>
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <Activity size={32} color="#EF4444" />
                    <h1 style={styles.brandTitle}>Fleet Simulator</h1>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <input
                        placeholder="e.g. AMB_101"
                        value={newAmbId}
                        onChange={(e) => setNewAmbId(e.target.value)}
                        style={styles.input}
                    />
                    <button onClick={addAmbulance} style={styles.addBtn}>
                        <Plus size={18} /> <span>Deploy</span>
                    </button>
                    <button onClick={fetchAmbulances} style={styles.refreshBtn}>
                        <RefreshCw size={18} color="#4B5563" />
                    </button>
                </div>
            </div>
            <div style={styles.grid}>
                {ambulances.map((amb) => {
                    const id = amb.vehicleId || amb.ambulanceId;
                    const isSimulating = activeSims[id];
                    const isPatient = amb.patient.isOnboard;
                    return (
                        <div key={id} style={styles.card}>
                            <button onClick={() => deleteAmbulance(id)} style={styles.deleteBtn}>
                                <Trash2 size={16} color="#EF4444" />
                            </button>
                            <div style={styles.cardHeader}>
                                <span style={styles.itemId}>{id}</span>
                                <div style={{ ...styles.statusBadge, backgroundColor: isSimulating ? "#DCFCE7" : "#F3F4F6", color: isSimulating ? "#166534" : "#4B5563" }}>
                                    {isSimulating ? "MOVING" : "STATIONARY"}
                                </div>
                            </div>
                            <div style={styles.locationBox}>
                                <MapPin size={14} color="#6B7280" />
                                <span style={styles.locationText}>{amb.location.latitude.toFixed(4)}, {amb.location.longitude.toFixed(4)}</span>
                            </div>
                            <div style={styles.vitalsRow}>
                                <div style={styles.miniVital}>
                                    <Heart size={14} color="#EF4444" />
                                    <span>{amb.patient.vitals?.heartRate || 0}</span>
                                </div>
                                <div style={styles.miniVital}>
                                    <Wind size={14} color="#22C55E" />
                                    <span>{amb.patient.vitals?.spO2 || 0}%</span>
                                </div>
                            </div>
                            <div style={styles.cardFooter}>
                                <button onClick={() => togglePatient(amb)} style={{ ...styles.actionBtn, backgroundColor: isPatient ? "#FEE2E2" : "#F3F4F6", color: isPatient ? "#991B1B" : "#111827" }}>
                                    <User size={16} /> {isPatient ? "Unload" : "Load"}
                                </button>
                                <button onClick={() => toggleSimulation(id)} style={{ ...styles.actionBtn, backgroundColor: isSimulating ? "#2D2F54" : "#111827", color: "white" }}>
                                    {isSimulating ? <Square size={16} /> : <Play size={16} />}
                                    {isSimulating ? "Stop" : "Drive"}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
const styles = {
    container: { width: "100vw", boxSizing: "border-box", padding: "40px", backgroundColor: "#F9FAFB", minHeight: "100vh", fontFamily: "'Inter', sans-serif" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", backgroundColor: "white", padding: "20px 30px", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #E5E7EB" },
    headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
    brandTitle: { fontSize: "24px", fontWeight: "800", color: "#111827", margin: 0 },
    input: { padding: "10px 16px", borderRadius: "8px", border: "1px solid #E5E7EB", backgroundColor: "#F9FAFB", fontSize: "14px", outline: "none", width: "180px" },
    addBtn: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "#111827", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "opacity 0.2s" },
    refreshBtn: { padding: "10px", background: "white", borderRadius: "8px", border: "1px solid #E5E7EB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" },
    card: { backgroundColor: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #E5E7EB", position: "relative", transition: "transform 0.2s" },
    cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
    itemId: { fontSize: "18px", fontWeight: "700", color: "#111827" },
    statusBadge: { padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700" },
    locationBox: { display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" },
    locationText: { fontSize: "13px", color: "#6B7280", fontWeight: "500" },
    vitalsRow: { display: "flex", gap: "12px", marginBottom: "20px", padding: "12px", backgroundColor: "#F9FAFB", borderRadius: "10px" },
    miniVital: { display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: "700", color: "#374151" },
    cardFooter: { display: "flex", gap: "10px" },
    actionBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
    deleteBtn: { position: "absolute", top: "-10px", right: "-10px", backgroundColor: "white", border: "1px solid #FEE2E2", padding: "8px", borderRadius: "50%", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }
};
