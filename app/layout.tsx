import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Provenance Dossier Copilot",
  description:
    "Turn an artwork's claimed history into an inspectable research brief with public sources, a timeline, and questions for specialist review.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
