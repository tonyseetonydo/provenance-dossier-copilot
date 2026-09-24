import type { DossierRequest, RiskFocus } from "@/lib/schema";
import { PRESETS, type Preset } from "@/lib/presets";

const FOCUS_LABELS: Record<RiskFocus, string> = {
  general: "General diligence",
  restitution: "Nazi-era / restitution risk",
  comparables: "Comparable sales / auction record",
  exhibition: "Exhibition / catalogue history",
};

export function ArtworkForm({
  value,
  presetId,
  onChange,
  onPresetChange,
  onSubmit,
  loading,
}: {
  value: DossierRequest;
  presetId: Preset["id"];
  onChange: (v: DossierRequest) => void;
  onPresetChange: (id: Preset["id"]) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const update = <K extends keyof DossierRequest>(k: K, v: DossierRequest[K]) =>
    onChange({ ...value, [k]: v });
  const updateArtwork = (k: keyof DossierRequest["artwork"], v: string) =>
    onChange({ ...value, artwork: { ...value.artwork, [k]: v } });

  const canSubmit =
    !loading &&
    value.artwork.artist.trim().length > 0 &&
    value.artwork.title.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      className="space-y-6"
    >
      <section>
        <label className="block font-mono text-[11px] uppercase tracking-widest text-slate-500">
          Preset
        </label>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => onPresetChange(p.id)}
              className={`flex items-stretch gap-3 overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                presetId === p.id
                  ? "border-amber-700 bg-amber-50 text-ink"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {p.image ? (
                <img
                  src={p.image}
                  alt={p.imageAlt ?? p.label}
                  className="h-16 w-12 flex-shrink-0 rounded-sm object-cover ring-1 ring-slate-200"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-sm bg-slate-100 text-slate-400 ring-1 ring-slate-200">
                  <span className="font-serif text-lg">?</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-serif font-semibold">{p.label}</div>
                <div className="mt-0.5 text-xs leading-snug text-slate-500">
                  {p.blurb}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <Field
          label="Artist"
          value={value.artwork.artist}
          onChange={(v) => updateArtwork("artist", v)}
          required
          placeholder="e.g. Egon Schiele"
        />
        <Field
          label="Title"
          value={value.artwork.title}
          onChange={(v) => updateArtwork("title", v)}
          required
          placeholder="e.g. Portrait of Wally"
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Year"
            value={value.artwork.year ?? ""}
            onChange={(v) => updateArtwork("year", v)}
            placeholder="1912"
          />
          <Field
            label="Medium"
            value={value.artwork.medium ?? ""}
            onChange={(v) => updateArtwork("medium", v)}
            placeholder="oil on panel"
          />
        </div>
        <Field
          label="Dimensions"
          value={value.artwork.dimensions ?? ""}
          onChange={(v) => updateArtwork("dimensions", v)}
          placeholder="32 × 39.8 cm"
        />

        <div>
          <label className="block font-mono text-[11px] uppercase tracking-widest text-slate-500">
            Claimed provenance
          </label>
          <textarea
            value={value.claimedProvenance}
            onChange={(e) => update("claimedProvenance", e.target.value)}
            rows={4}
            placeholder="One owner per line, e.g.&#10;Lea Bondi Jaray, Vienna&#10;Leopold Museum, Vienna&#10;…"
            className="mt-1.5 block w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-ink shadow-sm placeholder:text-slate-400 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
          />
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            Enter one ownership claim per line. The app searches for supporting
            records and flags questions for your review. Preset claims are
            illustrative starting points.
          </p>
        </div>

        <div>
          <label className="block font-mono text-[11px] uppercase tracking-widest text-slate-500">
            Risk focus
          </label>
          <select
            value={value.riskFocus}
            onChange={(e) => update("riskFocus", e.target.value as RiskFocus)}
            className="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
          >
            {(Object.keys(FOCUS_LABELS) as RiskFocus[]).map((k) => (
              <option key={k} value={k}>
                {FOCUS_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-md bg-ink px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-canvas shadow-sm transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? "Running dossier…" : "Run dossier"}
      </button>

      <p className="text-[11px] leading-relaxed text-slate-500">
        This tool does not authenticate artworks, determine title, or provide
        legal advice. It accelerates public-source research and highlights
        evidence for human specialist review.
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block font-mono text-[11px] uppercase tracking-widest text-slate-500">
        {label}
        {required && <span className="ml-1 text-amber-700">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-ink shadow-sm placeholder:text-slate-400 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
      />
    </div>
  );
}
