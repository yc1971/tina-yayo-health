import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Brain, Send, Sparkles, RefreshCw, User, Stethoscope, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import { usePatient } from "@/context/PatientContext";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTED_QUESTIONS = [
  "¿Qué patrón de resistencia insulínica ves en mis resultados?",
  "¿Qué suplementos específicos me recomiendas y en qué dosis?",
  "¿Mi función tiroidea está óptima o hay señales de hipotiroidismo subclínico?",
  "¿Qué cambios de dieta concretos debo hacer basado en mis labs?",
  "¿Cuál es mi riesgo cardiovascular real desde medicina funcional?",
  "¿Cómo puedo optimizar mis niveles de testosterona naturalmente?",
];

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none
      prose-headings:text-foreground prose-headings:font-semibold
      prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2
      prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1.5
      prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:my-1.5
      prose-li:text-muted-foreground prose-li:my-0.5
      prose-ul:my-2 prose-ol:my-2
      prose-strong:text-foreground prose-strong:font-semibold
      prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded
      prose-hr:border-border">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export default function Expert() {
  const { patient, patientLabel, patientAge, isYayo } = usePatient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [fullAnalysis, setFullAnalysis] = useState<string | null>(null);
  const [analysisExpanded, setAnalysisExpanded] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Track which patient the current analysis belongs to
  const analysisPatientRef = useRef<string | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear analysis when patient switches
  useEffect(() => {
    if (analysisPatientRef.current && analysisPatientRef.current !== patient) {
      setFullAnalysis(null);
      setMessages([]);
      setStreamError(null);
      abortRef.current?.abort();
      setIsStreaming(false);
    }
  }, [patient]);

  // SSE streaming analysis
  const startStreamingAnalysis = useCallback(() => {
    if (isStreaming) return;

    // abort any previous stream
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsStreaming(true);
    setStreamError(null);
    setFullAnalysis("");
    setAnalysisExpanded(true);
    analysisPatientRef.current = patient;

    const url = `${API_BASE}/api/ai/analyze-all-stream?patient=${patient}`;

    fetch(url, { signal: abortRef.current.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const pump = (): Promise<void> =>
          reader.read().then(({ done, value }) => {
            if (done) {
              setIsStreaming(false);
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (line.startsWith("data:")) {
                const raw = line.slice(5).trim();
                if (!raw) continue;
                try {
                  const parsed = JSON.parse(raw);
                  if (parsed.text) {
                    setFullAnalysis((prev) => (prev ?? "") + parsed.text);
                  }
                } catch { /* ignore parse errors */ }
              } else if (line.startsWith("event: done")) {
                setIsStreaming(false);
              } else if (line.startsWith("event: error")) {
                // error data follows in next data line — handled below
              }
            }
            return pump();
          });

        return pump();
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setStreamError(err.message || "Error desconocido");
        setIsStreaming(false);
      });
  }, [isStreaming]);

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: (msgs: Message[]) => apiRequest("POST", "/api/ai/chat", { messages: msgs }).then(r => r.json()),
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { role: "assistant", content: "Lo siento, hubo un error al procesar tu pregunta. Por favor intenta de nuevo." }]);
    }
  });

  const sendMessage = (content: string) => {
    if (!content.trim()) return;
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    chatMutation.mutate(newMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const analysisInProgress = isStreaming;
  const hasAnalysis = !!fullAnalysis && fullAnalysis.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
              isYayo ? "bg-blue-500/10 border-blue-500/20" : "bg-pink-500/10 border-pink-500/20"
            }`}>
              <Stethoscope className={`w-5 h-5 ${isYayo ? "text-blue-400" : "text-pink-400"}`} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg md:text-xl font-semibold text-foreground">Dr. FunctionalMD — {patientLabel}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                  isYayo
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : "bg-pink-500/10 text-pink-400 border-pink-500/20"
                }`}>{patientAge}</span>
              </div>
              <p className="text-sm text-muted-foreground">Medicina funcional · Análisis exclusivo de {patientLabel}</p>
            </div>
          </div>
          <Button
            data-testid="btn-full-analysis"
            onClick={startStreamingAnalysis}
            disabled={analysisInProgress}
            className="bg-primary text-primary-foreground hover:opacity-90 gap-2"
          >
            {analysisInProgress ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Analizando...</>
            ) : (
              <><Sparkles className="w-4 h-4" />Análisis Completo</>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8 space-y-5 md:space-y-6 max-w-4xl mx-auto">

          {/* Empty state — no analysis yet */}
          {!hasAnalysis && !analysisInProgress && !streamError && (
            <div className="glass rounded-xl p-5 md:p-8 text-center border border-primary/10">
              <Brain className={`w-12 h-12 mx-auto mb-4 ${
                isYayo ? "text-blue-400/40" : "text-pink-400/40"
              }`} />
              <h2 className="text-base font-semibold text-foreground mb-2">Análisis Funcional — {patientLabel}</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                El Dr. FunctionalMD revisará exclusivamente los estudios de <strong>{patientLabel}</strong> con criterios de medicina funcional de vanguardia — rangos óptimos, patrones sistémicos y un plan de acción personalizado.
              </p>
              <Button
                onClick={startStreamingAnalysis}
                className="bg-primary text-primary-foreground hover:opacity-90 gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generar Análisis Completo
              </Button>
            </div>
          )}

          {/* Error state */}
          {streamError && (
            <div className="glass rounded-xl p-4 md:p-6 border border-red-500/20 text-center">
              <p className="text-red-400 text-sm mb-3">Error: {streamError}</p>
              <Button onClick={startStreamingAnalysis} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" /> Reintentar
              </Button>
            </div>
          )}

          {/* Streaming / completed analysis panel */}
          {(hasAnalysis || analysisInProgress) && (
            <div className="glass rounded-xl border border-primary/15">
              <button
                onClick={() => setAnalysisExpanded(e => !e)}
                className="w-full flex items-center justify-between p-4 md:p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  {analysisInProgress ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-primary" />
                  )}
                  <span className="font-semibold text-foreground">
                    {analysisInProgress
                      ? `Analizando a ${patientLabel}...`
                      : `Análisis Completo — ${patientLabel}`
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!analysisInProgress && (
                    <button
                      onClick={(e) => { e.stopPropagation(); startStreamingAnalysis(); }}
                      className="text-muted-foreground hover:text-foreground p-1 rounded"
                      title="Regenerar análisis"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {analysisExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>
              {analysisExpanded && (
                <div className="px-6 pb-6 border-t border-border pt-5">
                  <MarkdownContent content={fullAnalysis ?? ""} />
                  {analysisInProgress && (
                    <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1 rounded-sm" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Chat section */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Consulta Directa</span>
              <span className="text-xs text-muted-foreground ml-1">— hazle cualquier pregunta sobre tus resultados</span>
            </div>

            {/* Messages */}
            {messages.length === 0 && (
              <div className="p-5 space-y-2">
                <p className="text-xs text-muted-foreground mb-3 font-medium">PREGUNTAS SUGERIDAS:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs p-3 rounded-lg bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border border-border hover:border-primary/20"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.length > 0 && (
              <div className="p-3 md:p-5 space-y-4 md:space-y-5 max-h-[400px] md:max-h-[500px] overflow-y-auto">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Stethoscope className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[85%] ${msg.role === "user"
                      ? "bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-4 py-3"
                      : "bg-secondary/60 rounded-2xl rounded-tl-sm px-4 py-3"
                    }`}>
                      {msg.role === "user" ? (
                        <p className="text-sm text-foreground">{msg.content}</p>
                      ) : (
                        <MarkdownContent content={msg.content} />
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="bg-secondary/60 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                        <span className="text-xs text-muted-foreground">El Dr. FunctionalMD está respondiendo...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-3 items-end">
                <Textarea
                  data-testid="chat-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pregúntale al Dr. FunctionalMD sobre tus resultados... (Enter para enviar)"
                  className="bg-secondary border-border resize-none text-sm flex-1"
                  rows={2}
                />
                <Button
                  data-testid="btn-send-chat"
                  onClick={() => sendMessage(input)}
                  disabled={chatMutation.isPending || !input.trim()}
                  size="icon"
                  className="bg-primary text-primary-foreground hover:opacity-90 h-[60px] w-10 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">El Dr. FunctionalMD analiza exclusivamente los estudios de {patientLabel}.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
