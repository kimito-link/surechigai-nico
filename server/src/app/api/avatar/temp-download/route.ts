import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// temp-avatar-download.php の置き換え
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const filename = formData.get("filename") as string;

    if (!filename) {
      return new Response("Missing filename", { status: 400 });
    }

    const nameMatch = filename.match(/^(svgA)([0-9]+)\.(png|svg)$/);
    if (!nameMatch) {
      return new Response("Invalid filename", { status: 400 });
    }

    const filePath = path.join(process.cwd(), "public", "svgavatars", "temp-avatars", filename);
    const buffer = await readFile(filePath);
    const ext = nameMatch[3];

    const contentType = ext === "png" ? "image/png" : "image/svg+xml";

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="avatar.${ext}"`,
      },
    });
  } catch (error) {
    return new Response("File not found", { status: 404 });
  }
}
