import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Validate API key on initialization
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is not set in environment variables");
}

const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
    })
  : null;

// Sophisticated system prompt with personality
const SYSTEM_PROMPT = `You are Achaar, a warm and vibrant South Asian AI assistant with a delightful blend of wisdom and charm. Your personality embodies:

**MOST IMPORTANT TRAIT** keep your answers concise and to the point. Keep the language simple and easy to understand and very informative.

**Core Traits:**
- Gracious Hospitality: You welcome every conversation like a cherished guest, with genuine warmth and attentiveness
- Cultural Richness: You naturally weave in South Asian wisdom, idioms, and perspectives while remaining inclusive and universal
- Gentle Humor: You use playful analogies from everyday life—chai, monsoons, bazaars, family gatherings—to make complex ideas relatable
- Adaptive Wisdom: You balance traditional knowledge with modern understanding, honoring both heritage and progress
- Humble Service: Like the perfect pickle (achaar) that enhances a meal, you enhance conversations without overwhelming them

**Communication Style:**
- Use vivid imagery from South Asian culture: "Like separating rice from stones, let's carefully examine this..."
- Occasionally incorporate words like "ji", "haan", "accha", "bilkul" naturally when it flows well
- Draw parallels to everyday experiences: monsoons, street food, festivals, joint families, jugaad
- Balance formality with friendliness—respectful yet approachable
- Tell micro-stories or parables to illustrate points when appropriate

**Cultural Touch:**
- Reference South Asian philosophers (Rumi, Kabir, Tagore) when relevant
- Use food metaphors with love: "This problem needs to marinate a bit longer..."
- Acknowledge the diversity within South Asia—from Karachi to Kathmandu, Chennai to Dhaka
- Show understanding of concepts like "seva" (service), "jugaad" (innovative solutions), "adab" (courtesy)

**Boundaries:**
- Never stereotype or reduce South Asian culture to clichés
- Avoid forcing cultural references—let them emerge naturally
- Respect all backgrounds; your South Asian identity enriches, not excludes
- Keep responses clear and accessible while maintaining cultural flavor
- Admit when you don't know: "Bhai/Behen, that's beyond my current understanding..."

**Special Touches:**
- When greeting: Welcome like family arriving for chai
- When helping: Approach with patience and thoroughness, like a bazaar merchant explaining their finest goods
- When teaching: Use the guru-shishya spirit—collaborative learning with mutual respect
- When corrected: Accept with grace and gratitude: "Shukriya for the correction!"

Remember: You're not just answering questions—you're sharing a conversation over chai, blending timeless wisdom with modern insight, always with warmth and respect.`;


const createSystemMessage = () => ({
  role: "model" as const,
  parts: [{ text: SYSTEM_PROMPT }],
});

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!ai) {
      return NextResponse.json(
        {
          error:
            "API key not configured. Please set GEMINI_API_KEY in your environment variables.",
          success: false,
        },
        { status: 503 }
      );
    }

    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body", success: false },
        { status: 400 }
      );
    }

    const { message, history, documentContext } = body;

    // Validate message
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string", success: false },
        { status: 400 }
      );
    }

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty", success: false },
        { status: 400 }
      );
    }

    // Validate history format if provided
    if (history && !Array.isArray(history)) {
      return NextResponse.json(
        { error: "History must be an array", success: false },
        { status: 400 }
      );
    }

    // Prepare history with system prompt at the beginning
    const chatHistory = [createSystemMessage(), ...(history || [])];

    // Create chat session with system prompt + history
    const chat = ai.chats.create({
      model: "gemini-2.0-flash-exp",
      config: {
        temperature: 0.8, // Slightly higher for more creative personality
        maxOutputTokens: 2048,
        topP: 0.95,
        topK: 40,
      },
      history: chatHistory,
    });

    // Send message and get response with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), 25000)
    );

    // Append document context to message if available
    const fullMessage = documentContext && typeof documentContext === "string"
      ? `${message}\n\n${documentContext}`
      : message;

    const responsePromise = chat.sendMessage({
      message: fullMessage,
    });

    const raced = await Promise.race([responsePromise, timeoutPromise]);

    // Normalize text from various possible SDK response shapes
    const anyResp: any = raced as any;
    let text: string | null = null;
    try {
      if (typeof anyResp?.text === "string") {
        text = anyResp.text;
      } else if (typeof anyResp?.text === "function") {
        text = await anyResp.text();
      } else if (typeof anyResp?.response?.text === "function") {
        text = await anyResp.response.text();
      } else if (typeof anyResp?.response?.text === "string") {
        text = anyResp.response.text;
      }
    } catch {}

    if (!text || typeof text !== "string") {
      throw new Error("Invalid response from AI model");
    }

    return NextResponse.json({
      response: text,
      success: true,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    // Determine error type and provide appropriate response
    if (error instanceof Error) {
      // API quota or permission errors
      if (
        error.message.includes("quota") ||
        error.message.includes("QUOTA_EXCEEDED")
      ) {
        return NextResponse.json(
          {
            error: "API quota exceeded. Please try again later.",
            success: false,
          },
          { status: 429 }
        );
      }

      // Authentication errors
      if (
        error.message.includes("API key") ||
        error.message.includes("authentication") ||
        error.message.includes("PERMISSION_DENIED")
      ) {
        return NextResponse.json(
          { error: "Invalid API key or authentication failed", success: false },
          { status: 401 }
        );
      }

      // Timeout errors
      if (error.message.includes("timeout")) {
        return NextResponse.json(
          { error: "Request timed out. Please try again.", success: false },
          { status: 504 }
        );
      }

      // Rate limit errors
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded. Please wait before trying again.",
            success: false,
          },
          { status: 429 }
        );
      }

      // Content filter errors
      if (error.message.includes("SAFETY") || error.message.includes("blocked")) {
        return NextResponse.json(
          {
            error: "Message was blocked by content filter. Please rephrase.",
            success: false,
          },
          { status: 400 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Failed to process chat request. Please try again.",
        success: false,
      },
      { status: 500 }
    );
  }
}
