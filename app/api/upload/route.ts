export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type))
      return NextResponse.json({ success: false, error: "Only JPG, PNG, WebP or PDF allowed" }, { status: 400 });

    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ success: false, error: "File too large (max 5MB)" }, { status: 400 });

    const uploadDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const filename = `${token.userId}-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();
    await writeFile(join(uploadDir, filename), Buffer.from(bytes));

    return NextResponse.json({ success: true, data: { url: `/uploads/${filename}` } });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
