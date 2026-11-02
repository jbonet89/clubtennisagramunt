export const adminSections = {
  resum: "Resum", socis: "Socis", families: "Famílies",
  convidats: "Jugadors convidats", documents: "Documents", quotes: "Quotes", permisos: "Permisos",
} as const;
export type AdminSection = keyof typeof adminSections;
export const adminTables = {socis:"club_members", families:"club_families", quotes:"club_dues"} as const;
