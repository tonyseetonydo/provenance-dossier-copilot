import type { DossierRequest } from "./schema";

export type Preset = {
  id: "wally" | "monet" | "custom";
  label: string;
  blurb: string;
  image?: string;
  imageAlt?: string;
  imageCredit?: string;
  request: DossierRequest;
};

export const PRESETS: Preset[] = [
  {
    id: "wally",
    label: "Schiele, Portrait of Wally",
    blurb:
      "Explore a documented restitution dispute through museum records, legal sources, and gaps in a short ownership history.",
    image: "/presets/wally.jpg",
    imageAlt: "Egon Schiele, Portrait of Wally Neuzil (1912)",
    imageCredit: "Leopold Museum / Wikimedia Commons (public domain)",
    request: {
      artwork: {
        artist: "Egon Schiele",
        title: "Portrait of Wally",
        year: "1912",
        medium: "oil on panel",
        dimensions: "32 × 39.8 cm",
      },
      claimedProvenance:
        "Lea Bondi Jaray, Vienna (before 1938)\nLeopold Museum, Vienna (since 1994)",
      riskFocus: "restitution",
    },
  },
  {
    id: "monet",
    label: "Monet, Meules",
    blurb:
      "Investigate auction and ownership records, checking that similarly titled works are not confused.",
    image: "/presets/meules.jpg",
    imageAlt: "Claude Monet, Meules (Haystacks series, 1890)",
    imageCredit: "Art Institute of Chicago / Wikimedia Commons (public domain)",
    request: {
      artwork: {
        artist: "Claude Monet",
        title: "Meules",
        year: "1890",
        medium: "oil on canvas",
        dimensions: "72.7 × 92.6 cm",
      },
      claimedProvenance:
        "Durand-Ruel, Paris (acquired from the artist, 1891)\nSold at Sotheby's New York, May 2019",
      riskFocus: "comparables",
    },
  },
  {
    id: "custom",
    label: "Custom input",
    blurb:
      "Enter an artwork and its claimed history to start a new public-source investigation.",
    request: {
      artwork: {
        artist: "",
        title: "",
        year: "",
        medium: "",
        dimensions: "",
      },
      claimedProvenance: "",
      riskFocus: "general",
    },
  },
];
