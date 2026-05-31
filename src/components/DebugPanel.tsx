import { useEffect, useState } from "react";
import { getDB } from "@/lib/db";

// Temporary debug component
export function DBDebugPanel() {
    const [records, setRecords] = useState<any[]>([]);

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
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 text-green-400 text-xs p-2 font-mono z-50">
            <div className="font-bold mb-1">IndexedDB ({records.length} records)</div>
            {records.map(r => (
                <div key={r.id}>{r.id} | {r.ts} | {r.status}</div>
            ))}
        </div>
    );
}