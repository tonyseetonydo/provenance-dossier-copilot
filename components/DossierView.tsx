import type { Dossier } from "@/lib/schema";
import { RiskLevelBadge } from "./StatusBadge";
import { Timeline } from "./Timeline";
import { ClaimCheckTable } from "./ClaimCheckTable";
import { RiskFlags } from "./RiskFlags";
import { SourceTable } from "./SourceTable";

function SectionHeader({
  num,
  title,
  hint,
}: {
  num: number;
  title: string;
  hint?: string;
}) {
  return (
    <header className="mb-3">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
          §{num}
        </span>
        <h2 className="font-serif text-lg font-semibold text-ink">{title}</h2>
      </div>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </header>
  );
}

export function DossierView({ dossier }: { dossier: Dossier }) {
  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="font-serif text-xl font-semibold text-ink">
            {dossier.artwork.artist}, <em>{dossier.artwork.title}</em>
          </h2>
          <RiskLevelBadge level={dossier.summary.riskLevel} />
        </div>
        <p className="mt-2 font-serif text-lg leading-snug text-ink">
          {dossier.summary.oneLineTakeaway}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {dossier.summary.whyThisMatters}
        </p>
      </section>

      <section>
        <SectionHeader
          num={1}
          title="Provenance timeline"
          hint="Chronological events extracted from retrieved sources. Each row cites its evidence."
        />
        <Timeline events={dossier.timeline} />
      </section>

      <section>
        <SectionHeader
          num={2}
          title="Claim verification"
          hint="Each seller-asserted owner checked against retrieved sources."
        />
        <ClaimCheckTable checks={dossier.claimChecks} />
      </section>

      <section>
        <SectionHeader
          num={3}
          title="Risk flags"
          hint="Categorical flags inferred from retrieved evidence. Each flag points to a specialist next action."
        />
        <RiskFlags flags={dossier.riskFlags} />
      </section>

      <section>
        <SectionHeader
          num={4}
          title="Sources"
          hint="Every source the app retrieved via Exa. Click an [Sn] pill above to scroll to its row."
        />
        <SourceTable sources={dossier.sources} />
      </section>

      {dossier.nextActions.length > 0 && (
        <section>
          <SectionHeader
            num={5}
            title="Specialist next actions"
            hint="Suggested follow-ups for a human provenance researcher or legal reviewer."
          />
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
            {dossier.nextActions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
