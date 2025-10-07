import { DocumentsPanel } from "@/components/documents-panel";
import { ChatInterface } from "@/components/chat-interface";
import { ChatInput } from "@/components/chat-input";

export default function Home() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Panel - Documents (narrow) */}
      <aside className="w-80 hidden md:block h-screen overflow-hidden">
        <DocumentsPanel />
      </aside>

      {/* Right Panel - Chat */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <ChatInterface />
        <ChatInput />
      </main>
    </div>
  );
}
