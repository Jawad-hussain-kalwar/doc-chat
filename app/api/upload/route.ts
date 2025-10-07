import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided", success: false },
        { status: 400 }
      );
    }

    // Check file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported", success: false },
        { status: 400 }
      );
    }

    // Check file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit", success: false },
        { status: 400 }
      );
    }

    // Convert file to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Parse PDF using unpdf
    const pdf = await getDocumentProxy(uint8Array);
    const { text, totalPages } = await extractText(pdf, { mergePages: true });

    return NextResponse.json({
      success: true,
      document: {
        name: file.name,
        size: file.size,
        type: "PDF",
        content: text,
        pages: totalPages,
      },
    });
  } catch (error) {
    console.error("Upload API error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process document", success: false },
      { status: 500 }
    );
  }
}
