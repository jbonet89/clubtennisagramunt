import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = "https://clubtennisagramunt.vercel.app";
  const languages = {
    ca: `${origin}/ca`,
    es: `${origin}/es`,
    en: `${origin}/en`,
  };
  return Object.values(languages).map((url) => ({
    url,
    alternates: { languages },
  }));
}
