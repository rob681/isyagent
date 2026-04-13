/**
 * POST /api/ingest
 *
 * Handles PDF uploads and website URL ingestion.
 * Extracts text content, chunks it, and stores as memory.
 *
 * Content-Type: multipart/form-data
 *   - type: "PDF" | "WEBSITE"
 *   - label: human-readable name
 *   - file: (for PDF) the PDF file
 *   - url: (for WEBSITE) the URL to scrape
 *   - clientId: (optional) agent client ID
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@/generated/prisma";

const db = new PrismaClient();

// Max chunk size in characters (~500 words)
const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const orgId = session.user.organizationId;

  try {
    const formData = await req.formData();
    const type = formData.get("type") as string;
    const label = formData.get("label") as string;
    const clientId = (formData.get("clientId") as string) || undefined;

    if (!type || !label) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    let rawContent = "";
    let sourceUrl: string | undefined;

    if (type === "PDF") {
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Falta el archivo PDF" }, { status: 400 });
      }

      // Extract text from PDF (pdf-parse v1)
      // NOTE: Import directly from lib/ to bypass the broken test-file auto-load
      // that causes ENOENT in serverless environments (known bug in pdf-parse v1)
      const buffer = Buffer.from(await file.arrayBuffer());
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse");
      const pdfData = await pdfParse(buffer);
      rawContent = pdfData.text;
      sourceUrl = file.name;
    } else if (type === "WEBSITE") {
      const url = formData.get("url") as string;
      if (!url) {
        return NextResponse.json({ error: "Falta la URL del sitio web" }, { status: 400 });
      }

      sourceUrl = url;
      rawContent = await scrapeWebsite(url);
    } else {
      return NextResponse.json({ error: "Tipo no soportado" }, { status: 400 });
    }

    if (!rawContent.trim()) {
      return NextResponse.json({ error: "No se pudo extraer contenido" }, { status: 422 });
    }

    // Create source record
    const source = await db.memorySource.create({
      data: {
        organizationId: orgId,
        clientId,
        type: type as any,
        label,
        sourceUrl,
        rawContent,
      },
    });

    // Chunk the content
    const chunks = chunkText(rawContent, CHUNK_SIZE, CHUNK_OVERLAP);

    // Create memory chunks
    for (let i = 0; i < chunks.length; i++) {
      await db.memoryChunk.create({
        data: {
          organizationId: orgId,
          clientId,
          sourceId: source.id,
          level: "IDENTITY",
          category: type === "PDF" ? "documento" : "sitio-web",
          content: chunks[i],
          isEditable: true,
          embedding: undefined,
        },
      });
    }

    // Mark source as processed
    await db.memorySource.update({
      where: { id: source.id },
      data: { processedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      sourceId: source.id,
      chunksCreated: chunks.length,
      totalChars: rawContent.length,
    });
  } catch (err: any) {
    console.error("[Ingest] Error:", err);
    return NextResponse.json(
      { error: err.message || "Error procesando contenido" },
      { status: 500 }
    );
  }
}

// ──────────────────────────────────────────────
// Website scraper — simple fetch + HTML to text
// ──────────────────────────────────────────────

async function scrapeWebsite(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "IsyAgent/1.0 (Memory Ingestion Bot)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Error al acceder al sitio: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return htmlToText(html);
}

// Simple HTML to plain text extraction (no external deps)
function htmlToText(html: string): string {
  // Remove script and style blocks
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, "");
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, "");
  text = text.replace(/<header[\s\S]*?<\/header>/gi, "");

  // Replace block elements with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|blockquote|section|article)>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");

  // Clean whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n/g, "\n\n");
  text = text.trim();

  return text;
}

// ──────────────────────────────────────────────
// Text chunking with overlap
// ──────────────────────────────────────────────

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);

  let current = "";
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (current.length + trimmed.length + 2 > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      // Keep overlap from end of current chunk
      const words = current.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      current = overlapWords.join(" ") + "\n\n" + trimmed;
    } else {
      current = current ? current + "\n\n" + trimmed : trimmed;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  // If we got no chunks (single paragraph), split by sentences
  if (chunks.length === 0 && text.trim()) {
    chunks.push(text.trim().slice(0, chunkSize));
  }

  return chunks;
}
