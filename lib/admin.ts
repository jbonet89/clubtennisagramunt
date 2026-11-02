export const adminSections = {
  resum: "Resum", socis: "Socis", families: "Famílies",
  convidats: "Jugadors convidats", permisos: "Permisos",
} as const;
export type AdminSection = keyof typeof adminSections | "documents" | "quotes";
export const adminTables = {socis:"club_members", families:"club_families", quotes:"club_dues"} as const;
