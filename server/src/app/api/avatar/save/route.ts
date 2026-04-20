import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// ファイル名の数字部分から2階層のサブフォルダを生成
// svgA9085483059776392.png → 90/85/svgA9085483059776392.png
function getSubDir(numStr: string): string {
  const padded = numStr.padStart(4, "0");
  return path.join(padded.slice(0, 2), padded.slice(2, 4));
}

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
      return new Response("Missing filename or imgdata", { status: 400 });
    }

    const nameMatch = filename.match(/^(svgA)([0-9]+)\.(png|svg)$/);
    if (!nameMatch) {
      return new Response("Received file name doesn't match required pattern.", { status: 400 });
    }

    const numPart = nameMatch[2];
    const fileType = nameMatch[3];
    const subDir = getSubDir(numPart);
    const dir = path.join(process.cwd(), "public", "svgavatars", "ready-avatars", subDir);
    await mkdir(dir, { recursive: true });
    const savePath = path.join(dir, filename);

    if (fileType === "png") {
      const base64Data = imgdata.replace(/^data:image\/png;base64,/, "");
      if (!base64Data) {
        return new Response("Received PNG file data is not valid.", { status: 400 });
      }
      const buffer = Buffer.from(base64Data, "base64");
      await writeFile(savePath, buffer);
    } else if (fileType === "svg") {
      let svgData = imgdata.replace(/\\'/g, "'");
      if (!svgData.includes("<svg")) {
        return new Response("Received SVG file data is not valid.", { status: 400 });
      }
      await writeFile(savePath, svgData);
    }

    // サブフォルダ付きのパスをレスポンスヘッダーに含める
    return new Response("saved_custom", {
      headers: { "X-Avatar-Path": `/svgavatars/ready-avatars/${subDir}/${filename}` },
    });
  } catch (error) {
    console.error("アバター保存エラー:", error);
    return new Response("Error writing avatar on a disk.", { status: 500 });
  }
}
