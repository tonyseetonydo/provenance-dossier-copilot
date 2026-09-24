"use client";

export function SourcePill({ id }: { id: string }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(`source-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-amber-400");
    setTimeout(() => el.classList.remove("ring-2", "ring-amber-400"), 1600);
  };
  return (
    <a
      href={`#source-${id}`}
      onClick={handleClick}
      className="inline-flex items-center rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-slate-50 hover:bg-amber-600"
    >
      {id}
    </a>
  );
}

export function SourcePills({ ids }: { ids: string[] }) {
  if (!ids || ids.length === 0) {
    return (
      <span className="text-[11px] uppercase tracking-wide text-slate-400">
        no source
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap gap-1">
      {ids.map((id) => (
        <SourcePill key={id} id={id} />
      ))}
    </span>
  );
}
