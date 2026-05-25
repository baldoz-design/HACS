import { Suspense } from "react";
import { ProposeLab } from "./ProposeLab";

export const metadata = { title: "Proposal Lab — HACS Intelligence" };

export default function ProposePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-[var(--text-2)] text-sm">
          Loading Proposal Lab…
        </div>
      }
    >
      <ProposeLab />
    </Suspense>
  );
}
