import { useEffect, useState } from "react";
import { getDB, deleteReport } from "@/lib/db";

// Temporary debug component
export function DBDebugPanel() {
    const [records, setRecords] = useState<any[]>([]);
    const [log, setLog] = useState<string[]>([]);

    const addLog = (msg: string) => setLog(p => [...p.slice(-10), msg]);

    const runSync = async () => {
        addLog('Starting sync…');
        try {
            const db = await getDB();
            if (!db) return;
            const pending = await db.getAll('reports');
            addLog(`Found ${pending.length} records`);

            for (const report of pending) {
                try {
                    addLog(`Uploading ${report.id.slice(0, 8)}…`);
                    const res = await fetch('/api/reports', {
                        method: 'POST',
                        body: (() => {
                            const fd = new FormData();
                            const { photo, ...meta } = report;
                            fd.append('metadata', JSON.stringify(meta));
                            if (photo) fd.append('photo', photo, 'photo.jpg');
                            return fd;
                        })(),
                    });
                    addLog(`Response: ${res.status} ${res.statusText}`);
                    if (res.ok) {
                        await deleteReport(report.id);
                        addLog(`Deleted ${report.id.slice(0, 8)} ✓`);
                    } else {
                        const body = await res.text();
                        addLog(`Error body: ${body.slice(0, 100)}`);
                    }
                } catch (e: any) {
                    addLog(`Threw: ${e.message}`);
                }
            }
        } finally {
            const db = await getDB();
            const remaining = db ? await db.getAll('reports') : [];
            addLog(`Done. ${remaining.length} remaining.`);
            setRecords(remaining);
        }
    };

    useEffect(() => {
        const check = async () => {
            const db = await getDB();
            if (!db) return;
            const all = await db.getAll('reports');
            setRecords(all.map(r => ({
                id: r.id.slice(0, 8),
                ts: new Date(r.timestamp).toLocaleTimeString(),
                status: r.syncStatus,
            })));
        };
        check();
        const interval = setInterval(check, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-green-400 text-xs p-2 font-mono z-50 max-h-64 overflow-y-auto">
            <div className="flex justify-between items-center mb-1">
                <span className="font-bold">IDB ({records.length})</span>
                <button onClick={runSync} className="bg-green-700 px-2 py-0.5 rounded text-white">
                    Run Sync
                </button>
            </div>
            {records.map(r => (
                <div key={r.id}>{r.id.slice(0, 8)} | {new Date(r.timestamp).toLocaleTimeString()} | {r.syncStatus}</div>
            ))}
            <div className="mt-1 border-t border-green-800 pt-1">
                {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    );
}