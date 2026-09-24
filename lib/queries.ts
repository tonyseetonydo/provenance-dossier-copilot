import type { Artwork, RiskFocus } from "./schema";

function extractNames(claimedProvenance: string): string[] {
  const lines = claimedProvenance
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  // Take the leading person/institution name out of each line; drop trailing parenthetical/city detail.
  return lines
    .map((line) => {
      const withoutCity = line.split(/[,(]/)[0].trim();
      return withoutCity;
    })
    .filter((n) => n.length >= 3 && n.length <= 80);
}

export function buildQueryGroups({
  artwork,
  claimedProvenance,
  riskFocus,
}: {
  artwork: Artwork;
  claimedProvenance: string;
  riskFocus: RiskFocus;
}): string[] {
  const artist = `"${artwork.artist}"`;
  const title = `"${artwork.title}"`;
  const year = artwork.year ? ` ${artwork.year}` : "";

  const queries = new Set<string>();

  // A. identity
  queries.add(`${artist} ${title}${year}`);
  queries.add(`${artist} ${title} provenance`);

  // B. provenance names (one per claimed owner)
  for (const name of extractNames(claimedProvenance).slice(0, 5)) {
    queries.add(`${artist} ${title} "${name}"`);
  }

  // C. risk-focused
  if (riskFocus === "restitution") {
    queries.add(`${title} restitution settlement`);
    queries.add(`${title} Nazi looted art`);
    queries.add(`${title} DOJ OR forfeiture OR seizure`);
  } else if (riskFocus === "comparables") {
    queries.add(`${artist} ${title} auction record`);
    queries.add(`${artist} ${title} Sotheby's OR Christie's lot`);
    queries.add(`${artist} ${title} price realized`);
  } else if (riskFocus === "exhibition") {
    queries.add(`${artist} ${title} exhibition catalogue`);
    queries.add(`${artist} ${title} catalogue raisonné`);
    queries.add(`${artist} ${title} museum collection`);
  } else {
    queries.add(`${artist} ${title} catalogue raisonné`);
    queries.add(`${artist} ${title} museum collection`);
  }

  return Array.from(queries).slice(0, 10);
}
