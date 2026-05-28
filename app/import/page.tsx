"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchBeaconHistoricalStatus,
  fetchBeaconExecutionStatus,
  fetchBeaconExecutionDiscoveryStatus,
  refreshBeaconHistorical,
  refreshBeaconExecution,
  refreshBeaconExecutionDiscovery,
  searchTed,
  confirmTed,
  fetchImportLog,
  type BeaconHistoricalStatus,
  type BeaconExecutionStatus,
  type TedNotice,
  type ImportLogOut,
  API_BASE,
} from "@/lib/api";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
      <h2 className="text-sm font-semibold text-[var(--text-1)]">{title}</h2>
      {children}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "ok" ? "bg-[#10B981]" : status === "partial" ? "bg-[#F59E0B]" : "bg-[#EF4444]";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

export default function ImportPage() {
  // BEACON historical sync state
  const [beacon, setBeacon] = useState<BeaconHistoricalStatus | null>(null);
  const [beaconLoading, setBeaconLoading] = useState(true);
  const [beaconMsg, setBeaconMsg] = useState("");
  const [beaconExecution, setBeaconExecution] = useState<BeaconExecutionStatus | null>(null);
  const [beaconExecutionLoading, setBeaconExecutionLoading] = useState(true);
  const [beaconExecutionMsg, setBeaconExecutionMsg] = useState("");
  const [beaconDiscovery, setBeaconDiscovery] = useState<BeaconExecutionStatus | null>(null);
  const [beaconDiscoveryLoading, setBeaconDiscoveryLoading] = useState(true);
  const [beaconDiscoveryMsg, setBeaconDiscoveryMsg] = useState("");

  // TED state
  const [tedQuery, setTedQuery] = useState("HACS consulting digital strategy");
  const [tedLoading, setTedLoading] = useState(false);
  const [tedNotices, setTedNotices] = useState<TedNotice[]>([]);
  const [tedSelected, setTedSelected] = useState<Set<string>>(new Set());
  const [tedMsg, setTedMsg] = useState("");

  // CSV state
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvMsg, setCsvMsg] = useState("");

  // Log state
  const [logs, setLogs] = useState<ImportLogOut[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  async function loadBeacon() {
    setBeaconLoading(true);
    try {
      setBeacon(await fetchBeaconHistoricalStatus());
    } finally {
      setBeaconLoading(false);
    }
  }

  async function loadBeaconExecution() {
    setBeaconExecutionLoading(true);
    try {
      setBeaconExecution(await fetchBeaconExecutionStatus());
    } finally {
      setBeaconExecutionLoading(false);
    }
  }

  async function loadBeaconDiscovery() {
    setBeaconDiscoveryLoading(true);
    try {
      setBeaconDiscovery(await fetchBeaconExecutionDiscoveryStatus());
    } finally {
      setBeaconDiscoveryLoading(false);
    }
  }

  async function handleBeaconRefresh() {
    setBeaconLoading(true);
    setBeaconMsg("");
    try {
      const result = await refreshBeaconHistorical();
      setBeacon(await fetchBeaconHistoricalStatus());
      setBeaconMsg(
        `Synced ${result.notices_found} BEACON notices, imported ${result.records_imported} records, matched ${result.matched_entities} entities.`
      );
      loadLogs();
    } finally {
      setBeaconLoading(false);
    }
  }

  async function handleBeaconExecutionRefresh() {
    setBeaconExecutionLoading(true);
    setBeaconExecutionMsg("");
    try {
      const result = await refreshBeaconExecution();
      setBeaconExecution(await fetchBeaconExecutionStatus());
      setBeaconExecutionMsg(
        `Synced ${result.supplier_specific_records} supplier-specific execution records, matched ${result.matched_entities} entities.`
      );
      loadLogs();
    } finally {
      setBeaconExecutionLoading(false);
    }
  }

  async function handleBeaconDiscoveryRefresh() {
    setBeaconDiscoveryLoading(true);
    setBeaconDiscoveryMsg("");
    try {
      const result = await refreshBeaconExecutionDiscovery();
      setBeaconDiscovery(await fetchBeaconExecutionDiscoveryStatus());
      setBeaconDiscoveryMsg(
        result.validation_errors.length > 0
          ? `Validation failed: ${result.validation_errors.slice(0, 2).join("; ")}`
          : `Synced ${result.supplier_specific_records} discovered supplier-specific execution records, matched ${result.matched_entities} entities.`
      );
      loadLogs();
    } finally {
      setBeaconDiscoveryLoading(false);
    }
  }

  async function handleTedSearch() {
    if (!tedQuery.trim()) return;
    setTedLoading(true);
    setTedMsg("");
    try {
      const r = await searchTed(tedQuery);
      setTedNotices(r.notices);
      if (r.notices.length === 0) setTedMsg("No results found.");
    } catch {
      setTedMsg("TED API unavailable.");
    } finally {
      setTedLoading(false);
    }
  }

  function toggleTed(id: string) {
    setTedSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleTedConfirm() {
    if (tedSelected.size === 0) return;
    setTedLoading(true);
    try {
      const r = await confirmTed(Array.from(tedSelected));
      setTedMsg(`Imported ${r.records_imported} notices.`);
      setTedSelected(new Set());
      loadLogs();
    } finally {
      setTedLoading(false);
    }
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    setCsvMsg("");
    const form = new FormData();
    form.append("file", file);
    try {
      const r = await fetch(`${API_BASE}/api/import/csv/allocations`, {
        method: "POST",
        body: form,
      });
      const data = await r.json();
      setCsvMsg(`Imported ${data.records_imported} rows.${data.errors?.length ? ` (${data.errors.length} errors)` : ""}`);
      loadLogs();
    } catch {
      setCsvMsg("Upload failed.");
    } finally {
      setCsvLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function loadLogs() {
    setLogsLoading(true);
    try {
      setLogs(await fetchImportLog());
    } finally {
      setLogsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [beaconStatus, beaconExecutionStatus, beaconDiscoveryStatus, importLogs] = await Promise.all([
          fetchBeaconHistoricalStatus(),
          fetchBeaconExecutionStatus(),
          fetchBeaconExecutionDiscoveryStatus(),
          fetchImportLog(),
        ]);

        if (cancelled) return;

        setBeacon(beaconStatus);
        setBeaconExecution(beaconExecutionStatus);
        setBeaconDiscovery(beaconDiscoveryStatus);
        setLogs(importLogs);
      } finally {
        if (!cancelled) {
          setBeaconLoading(false);
          setBeaconExecutionLoading(false);
          setBeaconDiscoveryLoading(false);
          setLogsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-8 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text-1)]">Data Import</h1>

      <Card title="BEACON Historical Awards Sync">
        <p className="text-xs text-[var(--text-2)]">
          Sync historical awards directly from the BEACON backbone around <code className="text-[var(--text-1)]">DIGIT/2020/OP/0005</code>. This is the main historical source for intelligence.
        </p>
        {beaconLoading && !beacon ? (
          <p className="text-sm text-[var(--text-2)]">Loading…</p>
        ) : beacon ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span
                className={`inline-block w-2 h-2 rounded-full ${beacon.records > 0 ? "bg-[#10B981]" : "bg-[#F59E0B]"}`}
              />
              <span className="text-[var(--text-2)]">
                {beacon.records > 0 ? "Historical awards available" : "No BEACON awards synced yet"}
              </span>
              <span className="text-[var(--text-2)] text-xs font-mono ml-auto">
                {beacon.framework_reference}
              </span>
            </div>
            <div className="text-sm text-[var(--text-2)]">
              <span className="font-semibold text-[var(--text-1)]">{beacon.records}</span> historical records
              {beacon.last_synced && (
                <span className="ml-2">
                  · last sync {new Date(beacon.last_synced).toLocaleString()}
                </span>
              )}
            </div>
            {beaconMsg && <p className="text-xs text-[var(--text-2)]">{beaconMsg}</p>}
            <button
              onClick={handleBeaconRefresh}
              disabled={beaconLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-40"
            >
              {beaconLoading ? "Syncing…" : "Sync historical awards"}
            </button>
          </div>
        ) : (
          <button onClick={loadBeacon} className="text-xs text-[var(--accent)] hover:underline">
            Check status
          </button>
        )}
      </Card>

      <Card title="BEACON Execution Signals">
        <p className="text-xs text-[var(--text-2)]">
          Load curated public execution records that show which entities used BEACON, with supplier and value when disclosed.
        </p>
        {beaconExecutionLoading && !beaconExecution ? (
          <p className="text-sm text-[var(--text-2)]">Loading…</p>
        ) : beaconExecution ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span
                className={`inline-block w-2 h-2 rounded-full ${beaconExecution.records > 0 ? "bg-[#10B981]" : "bg-[#F59E0B]"}`}
              />
              <span className="text-[var(--text-2)]">
                {beaconExecution.records > 0 ? "Execution signals available" : "No BEACON execution signals loaded yet"}
              </span>
              <span className="text-[var(--text-2)] text-xs font-mono ml-auto">
                {beaconExecution.framework_reference}
              </span>
            </div>
            <div className="text-sm text-[var(--text-2)]">
              <span className="font-semibold text-[var(--text-1)]">{beaconExecution.supplier_specific_records}</span> supplier-specific execution records
              {beaconExecution.framework_aggregate_records > 0 && (
                <span className="ml-2">
                  · {beaconExecution.framework_aggregate_records} framework aggregate context record(s)
                </span>
              )}
              {beaconExecution.last_synced && (
                <span className="ml-2">
                  · last sync {new Date(beaconExecution.last_synced).toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-2)] break-all">
              Source file: <code className="text-[var(--text-1)]">{beaconExecution.sources_file}</code>
            </p>
            {beaconExecutionMsg && <p className="text-xs text-[var(--text-2)]">{beaconExecutionMsg}</p>}
            <button
              onClick={handleBeaconExecutionRefresh}
              disabled={beaconExecutionLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-40"
            >
              {beaconExecutionLoading ? "Syncing…" : "Sync execution signals"}
            </button>
          </div>
        ) : (
          <button onClick={loadBeaconExecution} className="text-xs text-[var(--accent)] hover:underline">
            Check status
          </button>
        )}
      </Card>

      <Card title="BEACON Execution Discovery">
        <p className="text-xs text-[var(--text-2)]">
          Sync newly discovered supplier-specific execution records from <code className="text-[var(--text-1)]">data/beacon_execution_discovery.json</code>. This is the staging area for old awards found through annual lists and entity procurement pages.
        </p>
        {beaconDiscoveryLoading && !beaconDiscovery ? (
          <p className="text-sm text-[var(--text-2)]">Loading…</p>
        ) : beaconDiscovery ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span
                className={`inline-block w-2 h-2 rounded-full ${beaconDiscovery.supplier_specific_records > 0 ? "bg-[#10B981]" : "bg-[#F59E0B]"}`}
              />
              <span className="text-[var(--text-2)]">
                {beaconDiscovery.supplier_specific_records > 0 ? "Discovery records available" : "No discovered execution records loaded yet"}
              </span>
              <span className="text-[var(--text-2)] text-xs font-mono ml-auto">
                {beaconDiscovery.framework_reference}
              </span>
            </div>
            <div className="text-sm text-[var(--text-2)]">
              <span className="font-semibold text-[var(--text-1)]">{beaconDiscovery.supplier_specific_records}</span> supplier-specific discovery records
              {beaconDiscovery.last_synced && (
                <span className="ml-2">
                  · last sync {new Date(beaconDiscovery.last_synced).toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-2)] break-all">
              Source file: <code className="text-[var(--text-1)]">{beaconDiscovery.sources_file}</code>
            </p>
            {beaconDiscoveryMsg && <p className="text-xs text-[var(--text-2)]">{beaconDiscoveryMsg}</p>}
            <button
              onClick={handleBeaconDiscoveryRefresh}
              disabled={beaconDiscoveryLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-40"
            >
              {beaconDiscoveryLoading ? "Syncing…" : "Sync discovery records"}
            </button>
          </div>
        ) : (
          <button onClick={loadBeaconDiscovery} className="text-xs text-[var(--accent)] hover:underline">
            Check status
          </button>
        )}
      </Card>

      {/* TED search */}
      <Card title="TED Europa Search">
        <p className="text-xs text-[var(--text-2)]">
          Search the EU Tenders Electronic Daily for past contract awards.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={tedQuery}
            onChange={(e) => setTedQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTedSearch()}
            placeholder="Search query…"
            className="flex-1 h-8 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <button
            onClick={handleTedSearch}
            disabled={tedLoading}
            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-40"
          >
            {tedLoading ? "Searching…" : "Search"}
          </button>
        </div>

        {tedMsg && <p className="text-xs text-[var(--text-2)]">{tedMsg}</p>}

        {tedNotices.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tedNotices.map((n) => (
              <label
                key={n.notice_id}
                className="flex items-start gap-2 p-2 rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--border)]/40"
              >
                <input
                  type="checkbox"
                  checked={tedSelected.has(n.notice_id)}
                  onChange={() => toggleTed(n.notice_id)}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--text-1)] line-clamp-1">{n.title || n.notice_id}</p>
                  <p className="text-[10px] text-[var(--text-2)]">
                    {n.client_name}
                    {n.award_value_eur ? ` · Award €${(n.award_value_eur / 1000).toFixed(0)}k` : ""}
                    {n.estimated_value_eur ? ` · Est. €${(n.estimated_value_eur / 1000).toFixed(0)}k` : ""}
                    {!n.award_value_eur && !n.estimated_value_eur && n.contract_value_eur ? ` · €${(n.contract_value_eur / 1000).toFixed(0)}k` : ""}
                    {n.cpv_codes.length ? ` · CPV ${n.cpv_codes.slice(0, 2).join(", ")}` : ""}
                    {n.publication_date ? ` · ${n.publication_date}` : ""}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}

        {tedSelected.size > 0 && (
          <button
            onClick={handleTedConfirm}
            disabled={tedLoading}
            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--accent)] text-[var(--accent)] font-medium hover:bg-[var(--accent)] hover:text-white transition-colors"
          >
            Import {tedSelected.size} selected
          </button>
        )}
      </Card>

      {/* CSV upload */}
      <Card title="CSV Upload">
        <p className="text-xs text-[var(--text-2)]">
          Optional fallback for ad hoc datasets. The main historical path is now the direct BEACON sync above.
        </p>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            className="text-xs text-[var(--text-2)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[var(--accent)] file:text-white hover:file:opacity-90"
          />
          {csvLoading && <span className="text-xs text-[var(--text-2)]">Uploading…</span>}
        </div>
        {csvMsg && (
          <p className="text-xs text-[var(--text-2)]">{csvMsg}</p>
        )}
      </Card>

      {/* Import log */}
      <Card title="Import Log">
        {logsLoading ? (
          <p className="text-xs text-[var(--text-2)]">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-xs text-[var(--text-2)]">No import history yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="flex items-start gap-2 text-xs">
                <StatusDot status={l.status} />
                <div className="min-w-0">
                  <span className="font-medium text-[var(--text-1)] uppercase text-[10px]">{l.source}</span>
                  <span className="text-[var(--text-2)] ml-2">{l.message}</span>
                </div>
                <span className="ml-auto text-[10px] text-[var(--text-2)] shrink-0">
                  {new Date(l.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
        <button onClick={loadLogs} className="text-xs text-[var(--accent)] hover:underline">
          Refresh
        </button>
      </Card>
    </div>
  );
}
