import React, { useEffect, useState } from "react";
import BackendDropdown from "./BackendDropdown";

export function DevicePicker(): React.JSX.Element {
    const [devices, setDevices] = useState<any[]>([]);
    const [selected, setSelected] = useState<string | number | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [backend, setBackend] = useState<string>("npcap");
    const [savingBackend, setSavingBackend] = useState<boolean>(false);
    const [restartRequired, setRestartRequired] = useState<boolean>(false);
    const [backendMessage, setBackendMessage] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const resp = await fetch("/api/devices");
                const json = await resp.json();
                if (mounted && json && json.code === 0) {
                    setDevices(json.data || []);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Failed to load devices", err);
                setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const resp = await fetch("/api/device");
                const json = await resp.json();
                if (json && json.code === 0 && json.data) {
                    setSelected(json.data.selectedDevice ?? null);
                }
            } catch (err) {
                // ignore
            }
        })();

        (async () => {
            try {
                const resp = await fetch("/api/settings");
                const json = await resp.json();
                if (json && json.code === 0 && json.data) {
                    setBackend(json.data.captureBackend || "npcap");
                }
            } catch (err) {
                // ignore
            }
        })();
    }, []);

    const handleSave = async (device: number) => {
        setSaving(true);
        try {
            setSelected(device);
            const resp = await fetch("/api/device", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ selectedDevice: device }),
            });
            const json = await resp.json();
            if (json && json.code === 0) {
            }
        } catch (err) {
            console.error("Failed to save device selection", err);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveBackend = async (value: string) => {
        setSavingBackend(true);
        try {
            const settingsResp = await fetch("/api/settings");
            const settings = await settingsResp.json();
            if (!settings || settings.code !== 0) return;

            const newSettings = { ...settings.data, captureBackend: value };

            const resp = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newSettings),
            });

            const json = await resp.json();
            if (json && json.code === 0) {
                // If the selected backend changed, inform the user that an application restart is required
                const prev = backend || "auto";
                setBackend(value);
                if (prev !== value) {
                    setRestartRequired(true);
                    // If switching to WinDivert, instruct the user to restart as Administrator
                    if (value === "windivert") {
                        setBackendMessage("Capture backend saved. Please restart the application to apply the new backend. Note: WinDivert requires the application to be started with Administrator privileges — restart the app as an administrator.");
                    } else {
                        setBackendMessage("Capture backend saved. Please restart the application to apply the new backend.");
                    }
                } else {
                    setBackendMessage("Capture backend saved.");
                    setTimeout(() => setBackendMessage(null), 2000);
                }
            }
        } catch (err) {
            console.error("Failed to save capture backend", err);
        } finally {
            setSavingBackend(false);
        }
    };

    return (
        <div>
            {loading ? (
                <div>Loading devices...</div>
            ) : (
                <div className="device-list">
                    {devices.length === 0 && <div className="device-no-devices">No devices found. Ensure Npcap is installed.</div>}
                    <div style={{ margin: "8px 12px" }}>
                        <div className="device-backend">
                            <span className="backend-label">Capture Backend:</span>
                            <BackendDropdown value={backend} onChange={(v) => handleSaveBackend(v)} disabled={savingBackend} />
                            {savingBackend && <span className="saving-indicator">Saving…</span>}
                        </div>
                        {backendMessage && (
                            <div className={"alert " + (restartRequired ? "alert-warning" : "alert-success")}>
                                <div className="alert-icon" aria-hidden>
                                    {restartRequired ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 9v4" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M12 17h.01" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#b45309" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="rgba(180,69,9,0.06)" />
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9 12l2 2 4-4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <circle cx="12" cy="12" r="9" stroke="#10b981" strokeWidth="1" fill="rgba(16,185,129,0.06)" />
                                        </svg>
                                    )}
                                </div>
                                <div className="alert-content">
                                    <div className="alert-message">
                                        {backendMessage}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {backend === "npcap" && devices.map((d) => (
                        <label key={d.id} className="device-item" onClick={() => handleSave(d.id)}>
                            <input type="radio" name="device" checked={String(selected) === String(d.id)} onChange={() => handleSave(d.id)} />
                            <div className="device-meta">
                                <div className="device-name">{d.description || d.name}</div>
                                <div className="device-desc">{d.name}</div>
                            </div>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}
