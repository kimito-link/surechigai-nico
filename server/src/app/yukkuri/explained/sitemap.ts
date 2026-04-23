import type { MetadataRoute } from "next";
import {
  countYukkuriExplainedArchive,
  listYukkuriExplainedArchiveSitemapRows,
} from "@/lib/yukkuriExplainedArchive";

const PAGE_SIZE = 500;

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://surechigai-nico.link").replace(/\/$/, "");
}

function toIsoJst(updatedAt: string): string {
  return `${updatedAt.replace(" ", "T")}+09:00`;
}

export async function generateSitemaps() {
  const total = await countYukkuriExplainedArchive();
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return Array.from({ length: pageCount }, (_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const pageId = Number.isFinite(id) && id > 0 ? id : 0;
  const rows = await listYukkuriExplainedArchiveSitemapRows({
    limit: PAGE_SIZE,
    offset: pageId * PAGE_SIZE,
  });
  const base = siteBase();
  return rows.map((row) => ({
    url: `${base}/yukkuri/explained/${encodeURIComponent(row.x_handle)}`,
    lastModified: toIsoJst(row.updated_at),
    changeFrequency: "daily",
    priority: 0.7,
  }));
}
