"use client";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/store";
import { useEffect, useRef } from "react";

export function ChatInterface() {
  const { messages, isLoading, error, clearChat, retryLastMessage } =
    useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header with New Chat button - Fixed */}
      <div className="shrink-0 border-b p-3 flex items-center justify-between bg-background">
        <h1 className="font-semibold">Chat</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={clearChat}
          disabled={isLoading}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Error Banner - Fixed */}
      {error && (
        <div className="shrink-0 border-b bg-destructive/10 border-destructive/20 p-3">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive flex-1">{error}</p>
            {!isLoading && (
              <Button
                variant="outline"
                size="sm"
                onClick={retryLastMessage}
                className="shrink-0"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Messages Area - Scrollable */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4"
      >
        <div className="space-y-4 max-w-3xl mx-auto pb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" && "flex-row-reverse"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                  className={cn(
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : message.error
                      ? "bg-destructive/20"
                      : "bg-muted"
                  )}
                >
                  {message.role === "user" ? "U" : message.error ? "!" : "AI"}
                </AvatarFallback>
              </Avatar>

              <div
                className={cn(
                  "flex flex-col gap-1",
                  message.role === "user" && "items-end"
                )}
              >
                <Card
                  className={cn(
                    "px-4 py-2 max-w-[80%]",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : message.error
                      ? "bg-destructive/10 border-destructive/20"
                      : "bg-muted"
                  )}
                >
                  <p
                    className={cn(
                      "text-sm whitespace-pre-wrap",
                      message.error && "text-destructive"
                    )}
                  >
                    {message.content}
                  </p>
                </Card>
                <span className="text-xs text-muted-foreground px-1">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-muted">AI</AvatarFallback>
              </Avatar>
              <Card className="px-4 py-2 bg-muted">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {error && (
                    <span className="text-xs text-muted-foreground">
                      {error}
                    </span>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
