import type { SourceType } from "./schema";

export function classifySource(url: string, title = ""): SourceType {
  let host = "";
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    path = u.pathname.toLowerCase();
  } catch {
    host = url.toLowerCase();
  }
  const t = title.toLowerCase();

  if (
    host.includes("sothebys.com") ||
    host.includes("christies.com") ||
    host.includes("phillips.com") ||
    host.includes("bonhams.com")
  ) {
    return "auction_lot";
  }
  if (
    host.includes("leopoldmuseum.org") ||
    host.includes("moma.org") ||
    host.includes("metmuseum.org") ||
    host.includes("nga.gov") ||
    host.includes("museum") ||
    host.includes("belvedere.at") ||
    host.includes("artic.edu")
  ) {
    return "museum_page";
  }
  if (host.includes("justice.gov") || host.endsWith(".gov")) {
    return path.endsWith(".pdf") ? "government_pdf" : "legal_article";
  }
  if (
    host.includes("unige.ch") ||
    host.includes("art-adr") ||
    host.includes("restitution") ||
    host.includes("commissionforlootedart")
  ) {
    return "case_summary";
  }
  if (
    host.includes("artlawandmore") ||
    host.includes("law") ||
    host.includes("legal")
  ) {
    return "legal_article";
  }
  if (path.endsWith(".pdf") || t.includes("catalogue raisonné") || t.includes("catalogue raisonne")) {
    return "catalogue_pdf";
  }
  if (
    host.includes("artnet") ||
    host.includes("theartnewspaper") ||
    host.includes("artnews") ||
    host.includes("artsy") ||
    host.includes("nytimes") ||
    host.includes("bbc") ||
    host.includes("apollo-magazine") ||
    host.includes("guardian")
  ) {
    return "news_article";
  }
  if (
    host.includes("foundation") ||
    host.includes("stiftung") ||
    host.includes("trust")
  ) {
    return "foundation_page";
  }
  return "other";
}
