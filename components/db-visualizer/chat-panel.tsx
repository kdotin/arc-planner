"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, Trash2, Code, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  schema: string;
  currentTable: string | null;
  externalPrompt?: string | null;
  onExternalPromptConsumed?: () => void;
}

type ChatMode = "developer" | "vibe";

export default function ChatPanel({ 
  schema, 
  currentTable,
  externalPrompt,
  onExternalPromptConsumed,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>("developer");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasProcessedPrompt = useRef(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [input]);

  // Handle external prompt (e.g., from Analyze button)
  useEffect(() => {
    if (externalPrompt && !isLoading && !hasProcessedPrompt.current) {
      hasProcessedPrompt.current = true;
      handleSubmitWithPrompt(externalPrompt);
      onExternalPromptConsumed?.();
    }
    if (!externalPrompt) {
      hasProcessedPrompt.current = false;
    }
  }, [externalPrompt, isLoading]);

  const handleSubmitWithPrompt = async (promptMessage: string) => {
    if (!promptMessage || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "🔍 Analyzing database schema for quality, architecture, and multi-tenancy readiness...",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: promptMessage }],
          schema,
          currentTable,
          mode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fullContent } : m
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Sorry, I encountered an error. Please check that CLAUDE_API_KEY is set in your .env.local file.",
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, overrideMessage?: string) => {
    e?.preventDefault();
    const messageContent = overrideMessage || input.trim();
    if (!messageContent || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!overrideMessage) {
      setInput("");
    }
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current && !overrideMessage) {
      textareaRef.current.style.height = "auto";
    }

    // Create placeholder for assistant message
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          schema,
          currentTable,
          mode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fullContent } : m
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Sorry, I encountered an error. Please check that CLAUDE_API_KEY is set in your .env.local file.",
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-foreground/70" />
          <h2 className="font-medium text-sm">Assistant</h2>
        </div>
        <div className="flex items-center gap-1">
          {/* Mode Toggle */}
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <button
              onClick={() => setMode("developer")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                mode === "developer"
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Code className="w-3 h-3" />
              <span>Dev</span>
            </button>
            <button
              onClick={() => setMode("vibe")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                mode === "vibe"
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Wand2 className="w-3 h-3" />
              <span>Vibe</span>
            </button>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages - This scrolls */}
      <ScrollArea className="flex-1 min-h-0 w-full" ref={scrollAreaRef}>
        <div className="p-4 w-full overflow-hidden">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
              <Bot className="w-8 h-8 text-muted-foreground mb-4" />
              <h3 className="font-medium text-sm mb-1">Ask about your schema</h3>
              <p className="text-xs text-muted-foreground mb-6 max-w-[260px]">
                I can help you understand tables, relationships, and write queries.
              </p>
              <div className="space-y-2 w-full max-w-[280px]">
                {[
                  "Explain the relationships in this database",
                  "How do I query all tasks with their activities?",
                  currentTable
                    ? `What are the constraints on ${currentTable}?`
                    : "Which tables have the most foreign keys?",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="w-full text-left text-xs p-2.5 bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 w-full overflow-hidden">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 w-full",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && message.content && (
                    <div className="w-5 h-5 flex items-center justify-center shrink-0 bg-muted text-foreground">
                      <Bot className="w-3 h-3" />
                    </div>
                  )}
                  {message.content ? (
                    <div
                      className={cn(
                        "px-3 py-2 text-sm overflow-hidden",
                        message.role === "user"
                          ? "bg-foreground text-background max-w-[80%]"
                          : "bg-muted w-full"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <div className="streamdown-content">
                          <Streamdown>{message.content}</Streamdown>
                        </div>
                      ) : (
                        <p className="leading-relaxed break-words">{message.content}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-pulse" />
                      <span className="text-xs">Thinking...</span>
                    </div>
                  )}
                  {message.role === "user" && (
                    <div className="w-5 h-5 flex items-center justify-center shrink-0 bg-foreground text-background">
                      <User className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input - Fixed at bottom */}
      <div className="p-4 shrink-0">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative bg-muted/50 focus-within:bg-muted transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the schema..."
              className="w-full resize-none bg-transparent px-3 py-2.5 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none min-h-[40px] max-h-[120px]"
              disabled={isLoading}
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="absolute bottom-1.5 right-1.5 h-7 w-7 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </form>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
