import { NextRequest } from "next/server";

type AvatarFormat = "png" | "svg";

export interface ParsedAvatarPayload {
  filename: string;
  format: AvatarFormat;
  contentType: string;
  buffer: Buffer;
  dataUrl: string;
}

function stripDataUrlPrefix(value: string, format: AvatarFormat): string {
  if (format === "png") {
    return value.replace(/^data:image\/png;base64,/, "");
  }
  if (value.startsWith("data:image/svg+xml")) {
    const commaIndex = value.indexOf(",");
    return commaIndex >= 0 ? decodeURIComponent(value.slice(commaIndex + 1)) : value;
  }
  return value;
}

function inferFormat(filename: string | null | undefined, hint: unknown): AvatarFormat {
  const fileFormat = filename?.toLowerCase().endsWith(".png") ? "png" : filename?.toLowerCase().endsWith(".svg") ? "svg" : null;
  if (fileFormat) return fileFormat;
  const bodyFormat = typeof hint === "string" ? hint.toLowerCase() : "";
  return bodyFormat === "png" ? "png" : "svg";
}

function inferFilename(filename: string | null | undefined, format: AvatarFormat): string {
  const trimmed = typeof filename === "string" ? filename.trim() : "";
  if (trimmed) return trimmed;
  return `avatar-${Date.now()}.${format}`;
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    return Object.fromEntries(new URLSearchParams(text).entries());
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    return Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, String(value)]));
  }

  return req.json().catch(() => ({}));
}

export async function parseAvatarPayload(req: NextRequest): Promise<ParsedAvatarPayload> {
  const body = await readBody(req);
  const filename = inferFilename(
    typeof body.filename === "string" ? body.filename : null,
    inferFormat(typeof body.filename === "string" ? body.filename : null, body.format)
  );
  const format = inferFormat(filename, body.format);
  const rawData =
    typeof body.imgdata === "string" && body.imgdata.trim() !== ""
      ? body.imgdata.trim()
      : typeof body.svg === "string" && body.svg.trim() !== ""
        ? body.svg.trim()
        : "";

  if (!rawData) {
    throw new Error("Missing avatar data");
  }

  if (format === "png") {
    const base64 = stripDataUrlPrefix(rawData, "png");
    if (!base64) {
      throw new Error("Invalid PNG data");
    }
    const buffer = Buffer.from(base64, "base64");
    return {
      filename,
      format,
      contentType: "image/png",
      buffer,
      dataUrl: rawData.startsWith("data:image/png;base64,")
        ? rawData
        : `data:image/png;base64,${base64}`,
    };
  }

  const svg = stripDataUrlPrefix(rawData, "svg");
  if (!svg.includes("<svg")) {
    throw new Error("Invalid SVG data");
  }
  const buffer = Buffer.from(svg, "utf8");
  return {
    filename,
    format,
    contentType: "image/svg+xml; charset=utf-8",
    buffer,
    dataUrl: rawData.startsWith("data:image/svg+xml")
      ? rawData
      : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  };
}
