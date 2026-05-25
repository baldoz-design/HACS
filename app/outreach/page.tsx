"use client";

import { useEffect, useState } from "react";
import { fetchEntities, fetchAIStatus, generateOutreach, type AIStatus, type OutreachResult } from "@/lib/api";
import type { ApiEntity } from "@/lib/api";

const PURPOSES = [
  { value: "intro", label: "Initial introduction" },
  { value: "follow_up", label: "Follow-up" },
  { value: "proposal_intro", label: "Proposal introduction" },
  { value: "meeting_request", label: "Meeting request" },
];

const TONES = [
  { value: "formal", label: "Formal" },
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
];

function StepIndicator({ step, current }: { step: number; current: number }) {
  const done = step < current;
  const active = step === current;
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
          done
            ? "bg-[#10B981] text-white"
            : active
            ? "bg-[var(--accent)] text-white"
            : "bg-[var(--border)] text-[var(--text-2)]"
        }`}
      >
        {done ? "✓" : step}
      </div>
    </div>
  );
}

export default function OutreachPage() {
  const [step, setStep] = useState(1);
  const [entities, setEntities] = useState<ApiEntity[]>([]);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);

  // Step 1: entity
  const [entitySearch, setEntitySearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<ApiEntity | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Step 2: config
  const [purpose, setPurpose] = useState("intro");
  const [tone, setTone] = useState("professional");
  const [context, setContext] = useState("");

  // Step 3: generate
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<OutreachResult | null>(null);
  const [genError, setGenError] = useState("");

  // Step 4: preview
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchEntities()
      .then((all) => setEntities(all.filter((e) => !e.is_ec_dg)))
      .catch(() => {});
    fetchAIStatus()
      .then(setAiStatus)
      .catch(() => {});
  }, []);

  const filtered = entitySearch.trim()
    ? entities.filter(
        (e) =>
          e.acronym.toLowerCase().includes(entitySearch.toLowerCase()) ||
          e.name.toLowerCase().includes(entitySearch.toLowerCase())
      ).slice(0, 15)
    : [];

  async function handleGenerate() {
    if (!selectedEntity) return;
    setGenerating(true);
    setGenError("");
    setResult(null);
    try {
      const r = await generateOutreach({
        entity_id: selectedEntity.id,
        purpose,
        tone,
        context,
      });
      setResult(r);
      setStep(4);
    } catch {
      setGenError("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    const text = `Subject: ${result.subject}\n\n${result.body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const STEPS = ["Select entity", "Configure", "Generate", "Preview"];

  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-1)]">Outreach Generator</h1>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center">
            <button
              onClick={() => i + 1 < step && setStep(i + 1)}
              className="flex items-center gap-2 text-sm"
            >
              <StepIndicator step={i + 1} current={step} />
              <span
                className={
                  step === i + 1
                    ? "font-semibold text-[var(--text-1)]"
                    : i + 1 < step
                    ? "text-[#10B981]"
                    : "text-[var(--text-2)]"
                }
              >
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px bg-[var(--border)] mx-2" />
            )}
          </div>
        ))}
      </div>

      {/* AI status notice */}
      {aiStatus && (
        <div
          className={`text-xs px-3 py-2 rounded-lg ${
            aiStatus.available
              ? "bg-[#10B981]/10 text-[#10B981]"
              : "bg-[var(--border)] text-[var(--text-2)]"
          }`}
        >
          {aiStatus.available
            ? `AI enabled · ${aiStatus.provider} / ${aiStatus.model}`
            : "AI unavailable — template output will be used. Set ANTHROPIC_API_KEY or OPENAI_API_KEY to enable."}
        </div>
      )}

      {/* Step 1: Entity */}
      {step === 1 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-1)]">Select target entity</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or acronym…"
              value={selectedEntity ? `${selectedEntity.acronym} — ${selectedEntity.name}` : entitySearch}
              onChange={(e) => {
                setEntitySearch(e.target.value);
                setSelectedEntity(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            {showDropdown && filtered.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg max-h-60 overflow-y-auto">
                {filtered.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => {
                      setSelectedEntity(e);
                      setEntitySearch("");
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--border)] flex items-center gap-3"
                  >
                    <span className="font-medium text-[var(--text-1)] w-16 shrink-0">{e.acronym}</span>
                    <span className="text-[var(--text-2)] truncate">{e.name}</span>
                    <span className="ml-auto text-[10px] text-[var(--text-2)] shrink-0">{e.city}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedEntity && (
            <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] p-3 text-sm space-y-1">
              <p className="font-semibold text-[var(--text-1)]">{selectedEntity.acronym}</p>
              <p className="text-[var(--text-2)]">{selectedEntity.name}</p>
              <p className="text-[var(--text-2)] text-xs">{selectedEntity.city}, {selectedEntity.country} · {selectedEntity.cluster}</p>
              {selectedEntity.notes && (
                <p className="text-xs text-[var(--accent)] italic mt-1">{selectedEntity.notes}</p>
              )}
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={!selectedEntity}
            className="w-full py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-1)]">Configure communication</h2>

          <div>
            <label className="text-xs text-[var(--text-2)] font-medium mb-1.5 block">Purpose</label>
            <div className="grid grid-cols-2 gap-2">
              {PURPOSES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPurpose(p.value)}
                  className={`text-xs px-3 py-2 rounded-lg border text-left transition-colors ${
                    purpose === p.value
                      ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--text-2)] hover:border-[var(--text-2)]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-2)] font-medium mb-1.5 block">Tone</label>
            <div className="flex gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    tone === t.value
                      ? "bg-[var(--text-1)] text-white border-[var(--text-1)]"
                      : "border-[var(--border)] text-[var(--text-2)] hover:border-[var(--text-2)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-2)] font-medium mb-1.5 block">
              Additional context <span className="font-normal">(optional)</span>
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. we met at the kick-off meeting last month, specific opportunity to reference…"
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-1)] placeholder:text-[var(--text-2)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-2)] hover:bg-[var(--border)]"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Generate */}
      {step === 3 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-1)]">Generate email</h2>

          <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] p-3 text-sm space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-2)]">Entity</span>
              <span className="font-medium text-[var(--text-1)]">{selectedEntity?.acronym}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-2)]">Purpose</span>
              <span className="font-medium text-[var(--text-1)]">
                {PURPOSES.find((p) => p.value === purpose)?.label}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-2)]">Tone</span>
              <span className="font-medium text-[var(--text-1)]">
                {TONES.find((t) => t.value === tone)?.label}
              </span>
            </div>
            {aiStatus && (
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-2)]">Output</span>
                <span className="font-medium text-[var(--text-1)]">
                  {aiStatus.available ? `AI (${aiStatus.model})` : "Template"}
                </span>
              </div>
            )}
          </div>

          {genError && (
            <p className="text-xs text-[#EF4444]">{genError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-2)] hover:bg-[var(--border)]"
            >
              ← Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {generating ? "Generating…" : "Generate →"}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Preview */}
      {step === 4 && result && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-1)]">Preview</h2>
            {result.ai_generated && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] font-medium">
                AI · {result.model_used}
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-[var(--text-2)] uppercase font-semibold mb-1">Subject</p>
              <p className="text-sm font-medium text-[var(--text-1)] bg-[var(--bg)] rounded-lg px-3 py-2 border border-[var(--border)]">
                {result.subject}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-2)] uppercase font-semibold mb-1">Body</p>
              <pre className="text-sm text-[var(--text-1)] bg-[var(--bg)] rounded-lg px-3 py-2 border border-[var(--border)] whitespace-pre-wrap font-sans">
                {result.body}
              </pre>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setResult(null); setStep(3); }}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-2)] hover:bg-[var(--border)]"
            >
              Regenerate
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90"
            >
              {copied ? "Copied!" : "Copy email"}
            </button>
            <button
              onClick={() => { setStep(1); setSelectedEntity(null); setResult(null); setEntitySearch(""); }}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-2)] hover:bg-[var(--border)]"
            >
              New
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
