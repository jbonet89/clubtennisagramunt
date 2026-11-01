import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Club Tennis Agramunt | Des de 1974",
  description:
    "El tennis ens uneix. Club Tennis Agramunt, esport i comunitat des de 1974.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ca">
      <body>{children}</body>
    </html>
  );
}
