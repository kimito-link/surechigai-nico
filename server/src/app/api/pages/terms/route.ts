import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  const email = process.env.CONTACT_EMAIL || "support@surechigai.app";
  const html = readFileSync(join(process.cwd(), "public/terms.html"), "utf-8")
    .replace(/\{\{CONTACT_EMAIL\}\}/g, email);

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}
