import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import fs from "fs";
import path from "path";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const CDN_BASE = 'https://cdn.owcsle.xyz';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await jwtVerify(token, SECRET);

    const logosDir = path.join(process.cwd(), "public", "images", "logos");
    const files = fs.readdirSync(logosDir);
    const localLogos = files
      .filter((f) => /\.(png|jpg|jpeg|webp|avif|svg|gif)$/i.test(f))
      .map((f) => `/images/logos/${f}`);

    const r2Response = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      Prefix: 'images/team-logos/',
    }));

    const cdnLogos = (r2Response.Contents ?? [])
      .map((obj) => obj.Key!)
      .filter((key) => /\.(png|jpg|jpeg|webp|avif|svg|gif)$/i.test(key))
      .map((key) => `${CDN_BASE}/${key}`);

    return NextResponse.json({ logos: [...localLogos, ...cdnLogos] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
