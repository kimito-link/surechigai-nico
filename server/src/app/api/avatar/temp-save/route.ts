import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// temp-avatar-save.php の置き換え
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let filename: string;
    let imgdata: string;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      filename = params.get("filename") || "";
      imgdata = params.get("imgdata") || "";
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      filename = formData.get("filename") as string || "";
      imgdata = formData.get("imgdata") as string || "";
    } else {
      const body = await req.json().catch(() => ({}));
      filename = body.filename || "";
      imgdata = body.imgdata || "";
    }

    if (!filename || !imgdata) {
      return new Response("Missing data", { status: 400 });
    }

    const nameMatch = filename.match(/^(svgA)([0-9]+)\.(png|svg)$/);
    if (!nameMatch) {
      return new Response("Invalid filename", { status: 400 });
    }

    const fileType = nameMatch[3];
    const dir = path.join(process.cwd(), "public", "svgavatars", "temp-avatars");
    await mkdir(dir, { recursive: true });
    const savePath = path.join(dir, filename);

    if (fileType === "png") {
      const base64Data = imgdata.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      await writeFile(savePath, buffer);
    } else if (fileType === "svg") {
      await writeFile(savePath, imgdata.replace(/\\'/g, "'"));
    }

    return new Response("saved");
  } catch (error) {
    console.error("一時アバター保存エラー:", error);
    return new Response("Error", { status: 500 });
  }
}
