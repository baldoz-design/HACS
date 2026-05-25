"use client";

import { useState, useRef } from "react";
import {
  fetchAnnex71Status,
  reimportAnnex71,
  searchTed,
  confirmTed,
  fetchImportLog,
  type TedNotice,
  type ImportLogOut,
  type Annex71Status,
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
  // Annex 7.1 state
  const [annex, setAnnex] = useState<Annex71Status | null>(null);
  const [annexLoading, setAnnexLoading] = useState(false);

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
  const [logsLoading, setLogsLoading] = useState(false);

  async function loadAnnex() {
    setAnnexLoading(true);
    try {
      setAnnex(await fetchAnnex71Status());
    } finally {
      setAnnexLoading(false);
    }
  }

  async function handleReimport() {
    setAnnexLoading(true);
    try {
      const r = await reimportAnnex71();
      setAnnex(await fetchAnnex71Status());
      loadLogs();
    } finally {
      setAnnexLoading(false);
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
      next.has(id) ? next.delete(id) : next.add(id);
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

  // Load on first render
  useState(() => {
    loadAnnex();
    loadLogs();
  });

  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-8 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text-1)]">Data Import</h1>

      {/* Annex 7.1 status */}
      <Card title="Annex 7.1 — Contract List">
        {annexLoading && !annex ? (
          <p className="text-sm text-[var(--text-2)]">Loading…</p>
        ) : annex ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span
                className={`inline-block w-2 h-2 rounded-full ${annex.file_found ? "bg-[#10B981]" : "bg-[#EF4444]"}`}
              />
              <span className="text-[var(--text-2)]">
                {annex.file_found ? "File found" : "File not found"}
              </span>
              <span className="text-[var(--text-2)] text-xs font-mono ml-auto truncate max-w-xs">
                {annex.file_path.split("/").slice(-3).join("/")}
              </span>
            </div>
            <div className="text-sm text-[var(--text-2)]">
              <span className="font-semibold text-[var(--text-1)]">{annex.records}</span> records imported
              {annex.last_imported && (
                <span className="ml-2">
                  · last run {new Date(annex.last_imported).toLocaleString()}
                </span>
              )}
            </div>
            <button
              onClick={handleReimport}
              disabled={annexLoading || !annex.file_found}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-40"
            >
              {annexLoading ? "Importing…" : "Re-import"}
            </button>
          </div>
        ) : (
          <button onClick={loadAnnex} className="text-xs text-[var(--accent)] hover:underline">
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
                    {n.contract_value_eur ? ` · €${(n.contract_value_eur / 1000).toFixed(0)}k` : ""}
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
          Upload a CSV with columns: <code className="text-[var(--text-1)]">entity_name, client_name, contract_title, contract_value_eur, hacs_field, role</code>
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
