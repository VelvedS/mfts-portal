import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, X, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: ParsedAction[];
  actionResults?: ActionResult[];
}

interface ParsedAction {
  type: "update_task" | "update_phase";
  id: number;
  updates: Record<string, any>;
}

interface ActionResult {
  action: ParsedAction;
  success: boolean;
  error?: string;
}

function parseActions(text: string): { cleanText: string; actions: ParsedAction[] } {
  const actions: ParsedAction[] = [];
  const actionRegex = /```action\s*\n([\s\S]*?)\n```/g;
  let match;
  
  while ((match = actionRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.type && parsed.id && parsed.updates) {
        actions.push(parsed);
      }
    } catch (e) {
      // Skip malformed action blocks
    }
  }

  // Clean text: remove action blocks
  const cleanText = text.replace(/```action\s*\n[\s\S]*?\n```/g, "").trim();
  return { cleanText, actions };
}

async function executeAction(action: ParsedAction): Promise<ActionResult> {
  try {
    if (action.type === "update_task") {
      await apiRequest("PATCH", `/api/tasks/${action.id}`, action.updates);
    } else if (action.type === "update_phase") {
      await apiRequest("PATCH", `/api/phases/${action.id}`, action.updates);
    }
    return { action, success: true };
  } catch (err: any) {
    return { action, success: false, error: err.message };
  }
}

function ActionBadge({ result }: { result: ActionResult }) {
  const label = result.action.type === "update_task" ? "Task" : "Phase";
  const fields = Object.keys(result.action.updates).join(", ");
  
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium ${
      result.success 
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
        : "bg-red-500/10 text-red-600 dark:text-red-400"
    }`}>
      {result.success 
        ? <CheckCircle2 className="w-3 h-3 shrink-0" />
        : <AlertCircle className="w-3 h-3 shrink-0" />
      }
      <span>
        {result.success ? "Updated" : "Failed"} {label} #{result.action.id}: {fields}
      </span>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isUser 
          ? "bg-primary/10 text-primary" 
          : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
      }`}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div className={`flex-1 min-w-0 space-y-2 ${isUser ? "text-right" : ""}`}>
        <div className={`inline-block rounded-xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[90%] ${
          isUser 
            ? "bg-primary text-primary-foreground text-left" 
            : "bg-muted/60 text-foreground text-left"
        }`}>
          {message.content.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i < message.content.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>
        {/* Action results */}
        {message.actionResults && message.actionResults.length > 0 && (
          <div className="space-y-1.5 text-left">
            {message.actionResults.map((result, i) => (
              <ActionBadge key={i} result={result} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Build history for context (exclude action metadata)
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      const res = await apiRequest("POST", "/api/chat", {
        message: text,
        history,
      });
      const data = await res.json();
      const { cleanText, actions } = parseActions(data.reply);

      // Execute any actions
      let actionResults: ActionResult[] = [];
      if (actions.length > 0) {
        actionResults = await Promise.all(actions.map(executeAction));
        // Invalidate queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/phases"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      }

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: cleanText || "Done.",
        actions,
        actionResults: actionResults.length > 0 ? actionResults : undefined,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `Something went wrong: ${err.message}. Please try again.`,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">AI Assistant</p>
            <p className="text-[11px] text-muted-foreground">Ask me to update tasks or phases</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0" data-testid="button-close-chat">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">MFTS Project Assistant</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px] mx-auto leading-relaxed">
                  I can update task statuses, due dates, priorities, assignees, and phase timelines. Just tell me what to change.
                </p>
              </div>
              <div className="space-y-1.5 text-left max-w-[260px] mx-auto">
                {[
                  "Mark all Research tasks as completed",
                  "Move the Build phase to start April 1",
                  "Set homepage wireframes to high priority",
                  "What tasks are overdue?",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(suggestion);
                      textareaRef.current?.focus();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg border border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                    data-testid={`button-suggestion-${i}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {isLoading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-muted/60">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Ask me to update tasks..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[40px] max-h-[120px] text-sm resize-none"
            rows={1}
            data-testid="input-chat"
          />
          <Button
            size="sm"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 p-0 shrink-0"
            data-testid="button-send-chat"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
