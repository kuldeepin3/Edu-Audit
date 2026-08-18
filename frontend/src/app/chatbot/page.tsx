/**
 * EduAudit AI - AI Chatbot Page (Offline Ollama RAG)
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, Bot, User, Sparkles, Loader2, Database, Wifi, WifiOff } from "lucide-react";
import { api, ChatResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: ChatResponse["citations"];
  confidence?: number;
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Hi! I'm EduAudit AI. Ask me anything about school infrastructure complaints, " +
        "repair status, district comparisons, or budget requirements. I'll provide " +
        "evidence-backed answers with citations.",
    },
  ]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<any>(null);
  const [isReindexing, setIsReindexing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "Which district has the worst toilet infrastructure?",
    "Show schools with recurring complaints",
    "How many critical complaints are pending?",
    "Summarize sanitation issues this month",
  ];

  // Fetch status on mount and poll
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await api.getChatbotStatus();
        setStatus(data);
      } catch (err) {
        console.error("Failed to fetch chatbot status:", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 20000); // Poll every 20s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const mutation = useMutation({
    mutationFn: (query: string) =>
      api.askChatbot(
        query,
        messages.map((m) => ({ role: m.role, content: m.content }))
      ),
    onSuccess: (data: ChatResponse) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          citations: data.citations,
          confidence: data.confidence,
        },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Sorry, I couldn't process your request. Please check if your local Ollama server is running.",
        },
      ]);
    },
  });

  const sendMessage = (text: string) => {
    if (!text.trim() || mutation.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    mutation.mutate(text);
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    try {
      const res = await api.reindexComplaints();
      alert(`Sync Complete!\nTotal complaints found: ${res.total_found || 0}\nSuccessfully indexed: ${res.indexed || 0}\nErrors: ${res.errors || 0}`);
      
      // Refresh status to get new vector count
      const updatedStatus = await api.getChatbotStatus();
      setStatus(updatedStatus);
    } catch (err) {
      console.error("Failed to reindex:", err);
      alert("Failed to sync Vector Database. Please verify that both Qdrant and Ollama services are online.");
    } finally {
      setIsReindexing(false);
    }
  };

  const ollamaOnline = status?.ollama?.status === "online";
  const qdrantOnline = status?.qdrant?.status === "online";

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/20">
            <Bot />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-slate-800 dark:text-slate-200">EduAudit AI Assistant</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">Offline RAG • Evidence-Backed Answers</p>
          </div>
        </div>
        
        {/* Status and Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/30 px-2.5 py-1.5 border border-slate-200/60 dark:border-slate-800">
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              ollamaOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            )} />
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
              Ollama: {status?.ollama?.status || "offline"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/30 px-2.5 py-1.5 border border-slate-200/60 dark:border-slate-800">
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              qdrantOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            )} />
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
              Qdrant: {status?.qdrant?.status || "offline"} {status?.qdrant?.indexed_documents !== undefined && `(${status.qdrant.indexed_documents})`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleReindex}
            disabled={isReindexing}
            className="btn-secondary py-1.5 px-3 text-[11px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 shadow-sm rounded-lg"
          >
            {isReindexing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-brand-600" />
                Syncing...
              </>
            ) : (
              "Sync Vector DB"
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="card flex-1 overflow-y-auto p-4 mb-4">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-3",
                msg.role === "user" && "flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm",
                  msg.role === "assistant"
                    ? "bg-brand-100 text-brand-600 dark:bg-brand-950 dark:text-brand-400"
                    : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                {msg.role === "assistant" ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                  msg.role === "assistant"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    : "bg-brand-600 text-white"
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                {/* Citations & Meta info */}
                {msg.role === "assistant" && msg.confidence !== undefined && (
                  <div className="mt-2.5 flex items-center justify-between gap-4 text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-200/50 dark:border-slate-700/50 pt-2 font-semibold">
                    <span>
                      AI Confidence: <span className="font-bold text-slate-600 dark:text-slate-400 font-mono">{msg.confidence}%</span>
                    </span>
                  </div>
                )}

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 border-t border-slate-200/50 pt-2.5 dark:border-slate-700/50">
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <Sparkles size={11} className="text-brand-500 animate-pulse" /> Sources ({msg.citations.length})
                    </div>
                    <div className="space-y-1.5">
                      {msg.citations.map((c, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-white/60 dark:bg-slate-900/40 p-2 text-xs border border-slate-200/30 dark:border-slate-800/30 shadow-sm"
                        >
                          <div className="font-bold text-slate-700 dark:text-slate-300">
                            [{c.report_id}] {c.school_name}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex flex-wrap gap-2 items-center">
                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold text-slate-500 dark:text-slate-400">{c.category}</span>
                            <span>•</span>
                            <span className={cn(
                              "font-bold uppercase text-[9px]",
                              c.severity === "critical" && "text-red-600 dark:text-red-400",
                              c.severity === "high" && "text-amber-600 dark:text-amber-400",
                              c.severity === "medium" && "text-blue-600 dark:text-blue-400",
                              c.severity === "low" && "text-slate-500"
                            )}>{c.severity}</span>
                            <span>•</span>
                            <span className="italic">{c.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {mutation.isPending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-950">
                <Bot size={16} className="text-brand-600 dark:text-brand-400" />
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-slate-600" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-slate-600 [animation-delay:0.2s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-slate-600 [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sendMessage(s)}
              className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-slate-600 hover:border-brand-400 hover:text-brand-600 hover:shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-brand-500"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          className="input flex-1"
          placeholder={ollamaOnline ? "Ask about school infrastructure..." : "Waiting for local Ollama server..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          disabled={mutation.isPending || !ollamaOnline}
        />
        <button
          type="button"
          onClick={() => sendMessage(input)}
          disabled={mutation.isPending || !input.trim() || !ollamaOnline}
          className="btn-primary"
        >
          <Send size={18} />
        </button>
      </div>

      {/* Local Badge Footer */}
      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-semibold px-1 uppercase tracking-wider">
        <span>Powered by Ollama • llama3.2 + nomic-embed-text</span>
        <span>Local AI Running Offline</span>
      </div>
    </div>
  );
}
