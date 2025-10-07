import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
}

export interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
  uploadedAt: Date;
}

interface ChatStore {
  messages: Message[];
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  addDocument: (document: Omit<Document, "id" | "uploadedAt">) => void;
  removeDocument: (id: string) => void;
  clearChat: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  sendMessage: (content: string, retryCount?: number) => Promise<void>;
  retryLastMessage: () => Promise<void>;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Use a fixed timestamp to avoid hydration mismatch
const INITIAL_TIMESTAMP = new Date("2025-01-01T00:00:00Z");

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [
    {
      id: "1",
      role: "assistant",
      content:
        "Assalamu Alaikum! 🙏 Welcome, welcome! I'm Achaar, and like a warm cup of chai on a rainy day, I'm here to make our conversation both comforting and enriching. Please, sit—consider this space your own. What brings you here today, dost?",
      timestamp: INITIAL_TIMESTAMP,
    },
  ],
  documents: [],
  isLoading: false,
  error: null,

  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  addDocument: (document) => {
    const newDocument: Document = {
      ...document,
      id: Date.now().toString(),
      uploadedAt: new Date(),
    };
    set((state) => {
      const currentDocuments = Array.isArray(state.documents)
        ? state.documents
        : [];
      return {
        documents: [...currentDocuments, newDocument],
      };
    });
  },

  removeDocument: (id) => {
    set((state) => ({
      documents: state.documents.filter((doc) => doc.id !== id),
    }));
  },

  clearChat: () => {
    set({
      messages: [
        {
          id: "1",
          role: "assistant",
          content:
            "Assalamu Alaikum! 🙏 Welcome, welcome! I'm Achaar, and like a warm cup of chai on a rainy day, I'm here to make our conversation both comforting and enriching. Please, sit—consider this space your own. What brings you here today, dost?",
          timestamp: INITIAL_TIMESTAMP,
        },
      ],
      isLoading: false,
      error: null,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  sendMessage: async (content: string, retryCount = 0) => {
    const { addMessage, setLoading, setError, messages, documents } = get();

    // Add user message only on first attempt
    if (retryCount === 0) {
      addMessage({ role: "user", content });
    }

    setLoading(true);
    setError(null);

    try {
      // Convert messages to API format (excluding system messages and error messages)
      const history = messages
        .filter((m) => !m.error && (m.role !== "assistant" || m.id !== "1"))
        .map((m) => ({
          role: m.role,
          parts: [{ text: m.content }],
        }));

      // Build document context
      const documentContext = Array.isArray(documents) && documents.length > 0
        ? `\n\nAttached Documents:\n${documents
            .map((doc) => `[${doc.name}]\n${doc.content}`)
            .join('\n\n')}`
        : '';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history, documentContext }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.response) {
        throw new Error("Invalid response from server");
      }

      // Add assistant response
      addMessage({
        role: "assistant",
        content: data.response,
      });

      setError(null);
    } catch (error) {
      console.error("Error sending message:", error);

      const isTimeout = error instanceof Error && error.name === "AbortError";
      const isNetworkError =
        error instanceof Error &&
        (error.message.includes("fetch") || error.message.includes("network"));

      // Retry logic for network errors and timeouts
      if ((isTimeout || isNetworkError) && retryCount < MAX_RETRIES) {
        const retryDelay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
        setError(
          `Connection issue. Retrying in ${retryDelay / 1000}s... (${
            retryCount + 1
          }/${MAX_RETRIES})`
        );

        await delay(retryDelay);
        return get().sendMessage(content, retryCount + 1);
      }

      // Final error after all retries
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred";

      setError(errorMessage);

      addMessage({
        role: "assistant",
        content: `❌ Error: ${errorMessage}${
          retryCount >= MAX_RETRIES
            ? ` (Failed after ${MAX_RETRIES} retries)`
            : ""
        }`,
        error: true,
      });
    } finally {
      setLoading(false);
    }
  },

  retryLastMessage: async () => {
    const { messages } = get();

    // Find the last user message
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");

    if (lastUserMessage) {
      // Remove error messages after the last user message
      const lastUserIndex = messages.findIndex(
        (m) => m.id === lastUserMessage.id
      );
      set({
        messages: messages.slice(0, lastUserIndex + 1),
        error: null,
      });

      // Retry sending the message
      await get().sendMessage(lastUserMessage.content, 0);
    }
  },
}));
