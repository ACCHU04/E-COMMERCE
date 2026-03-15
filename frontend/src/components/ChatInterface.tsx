"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ChatMessage } from "@/types";
import { Send, Bot, User, Code } from "lucide-react";
import { LoadingState } from "./LoadingState";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (query: string) => void;
  isLoading: boolean;
  suggestedQueries?: string[];
}

const EXAMPLE_QUERIES = [
  "What are the total sales by product category?",
  "Show me monthly revenue trends for 2023 by region",
  "Compare average discount % vs rating across categories",
];

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  suggestedQueries,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const chips = suggestedQueries?.length ? suggestedQueries : EXAMPLE_QUERIES;

  return (
    <div className="flex flex-col glass-panel overflow-hidden h-[620px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 bg-slate-950/35">
        <Bot className="w-4 h-4 text-violet-300" />
        <span className="text-sm font-head font-semibold text-slate-100">Chat with your data</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4">
            <Bot className="w-10 h-10 text-violet-300/75" />
            <div>
              <p className="text-slate-200 text-sm font-medium mb-1">Ask a business question</p>
              <p className="text-slate-400 text-xs">I&apos;ll generate interactive charts from your data</p>
            </div>
            <div className="w-full space-y-2">
              {chips.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(q)}
                  disabled={isLoading}
                  className="w-full text-left text-xs text-slate-300 hover:text-white bg-slate-900/65 hover:bg-slate-800/75 border border-white/10 hover:border-white/20 px-3 py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-3.5 h-3.5" />
                  ) : (
                    <Bot className="w-3.5 h-3.5" />
                  )}
                </div>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-sm shadow-[0_6px_18px_rgba(79,70,229,0.4)]"
                      : msg.error
                      ? "bg-red-900/30 border border-red-800/50 text-red-300 rounded-tl-sm"
                      : "bg-slate-900/85 border border-white/10 text-slate-100 rounded-tl-sm"
                  }`}
                >
                  <p>{msg.content}</p>
                  {msg.clarification_needed && msg.clarification_question && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-amber-300">{msg.clarification_question}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(msg.clarification_options || []).map((option) => (
                          <button
                            key={option}
                            onClick={() => onSendMessage(option)}
                            disabled={isLoading}
                            className="text-xs px-2 py-1 rounded-md border border-amber-400/35 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20 disabled:opacity-50"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.sql_query && (
                    <details className="mt-2">
                      <summary className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer hover:text-slate-200">
                        <Code className="w-3 h-3" /> View SQL
                      </summary>
                      <pre className="mt-1 text-xs text-slate-300 bg-slate-950 p-2 rounded overflow-x-auto">
                        {msg.sql_query}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-violet-200" />
                </div>
                <div className="bg-slate-900/85 border border-white/10 rounded-xl rounded-tl-sm px-3 py-2">
                  <LoadingState />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 bg-slate-950/35">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ask a business question..."
            rows={2}
            className="flex-1 resize-none bg-slate-900/80 text-slate-100 placeholder-slate-500 border border-white/10 focus:border-violet-400/65 focus:outline-none rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
            title="Send message"
            className="flex-shrink-0 p-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 pl-1">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
}
