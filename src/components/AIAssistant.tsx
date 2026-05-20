import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  X, 
  Minus, 
  MessageSquare, 
  Video, 
  FileText, 
  CornerDownLeft,
  Volume2,
  Trash2
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  system: '7Edu' | 'TOTVS';
  duration: string;
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  thumbnail: string;
  videoUrl?: string;
  pdfUrl?: string;
  createdAt?: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isSystem?: boolean;
  executedActions?: Array<{
    type: string;
    description: string;
  }>;
}

interface AIAssistantProps {
  courses: Course[];
  onOpenCourse: (course: Course, type: "video" | "pdf") => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ courses, onOpenCourse }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const defaultWelcome = {
    id: "welcome",
    role: "assistant" as const,
    content: "Olá! Sou o **Assistente de IA oficial** da FapAcademy. 🫡 Como posso ajudar no seu aprendizado hoje?\n\nVocê pode me pedir tarefas de voz ou texto, como:\n• 🎬 **\"Abre a aula de boleto\"**\n• 📄 **\"Quero baixar o PDF do desconto condicional\"**\n• ⏪ **\"Volta o vídeo 20 segundos\"** ou **\"Pula essa parte\"**\n• 💡 Fazer dúvidas sobre os recursos operacionais.",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isSystem: true
  };

  // Carregar histórico local
  useEffect(() => {
    const saved = localStorage.getItem("fapacademy_ai_chat");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        setMessages([defaultWelcome]);
      }
    } else {
      setMessages([defaultWelcome]);
    }
  }, []);

  // Salvar no localstorage
  const saveMessages = (newMsgs: ChatMessage[]) => {
    setMessages(newMsgs);
    localStorage.setItem("fapacademy_ai_chat", JSON.stringify(newMsgs));
  };

  // Rolar para baixo ao receber mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Configurar reconhecimento de voz (SpeechRecognition)
  useEffect(() => {
    const SpeechReq = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechReq) {
      setSpeechSupported(true);
      const rec = new SpeechReq();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "pt-BR";

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setInputText(text);
          handleSendMessage(text);
        }
      };

      rec.onerror = (err: any) => {
        console.error("Erro no reconhecimento de voz:", err);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, []);

  const handleToggleVoice = () => {
    if (!recognition) return;
    if (isRecording) {
      recognition.stop();
    } else {
      setInputText("");
      recognition.start();
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    setInputText("");
    
    // Adicionar mensagem do usuário
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [...messages, userMsg];
    saveMessages(updated);
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: updated.filter(m => !m.isSystem).map(m => ({ role: m.role, content: m.content })),
          courses: courses
        })
      });

      if (!response.ok) {
        throw new Error("Erro de comunicação com FapAcademy AI.");
      }

      const data = await response.json();
      const actionsExecuted: Array<{ type: string; description: string }> = [];

      // Processar eventuais tool calls/function calls retornados do backend
      if (data.functionCalls && data.functionCalls.length > 0) {
        for (const call of data.functionCalls) {
          if (call.name === "gerenciar_midia") {
            const { acao, tipo_arquivo, id_ou_url_arquivo } = call.args;
            const queryVal = (id_ou_url_arquivo || "").toLowerCase();

            // Encontrar curso correspondente por ID, URL ou Título
            let match = courses.find(c => 
              c.id.toLowerCase() === queryVal || 
              (c.videoUrl && c.videoUrl.toLowerCase().includes(queryVal)) ||
              (c.pdfUrl && c.pdfUrl.toLowerCase().includes(queryVal)) ||
              c.title.toLowerCase().includes(queryVal)
            );

            // Fuzzy check
            if (!match && queryVal) {
              match = courses.find(c => 
                queryVal.includes(c.title.toLowerCase()) || 
                c.title.toLowerCase().split(" ").some((word: string) => word.length > 4 && queryVal.includes(word))
              );
            }

            if (match) {
              onOpenCourse(match, tipo_arquivo);
              actionsExecuted.push({
                type: tipo_arquivo,
                description: `Abertura automática de "${match.title}" (${tipo_arquivo === 'video' ? 'Vídeo' : 'PDF'}).`
              });
            } else if (courses.length > 0) {
              // Fallback para abrir o primeiro que contém parte do termo
              const wordMatch = courses.find(c => {
                const words = c.title.toLowerCase().split(" ");
                return words.some(w => w.length > 3 && queryVal.includes(w));
              });
              if (wordMatch) {
                onOpenCourse(wordMatch, tipo_arquivo);
                actionsExecuted.push({
                  type: tipo_arquivo,
                  description: `Abertura automática de "${wordMatch.title}" (${tipo_arquivo === 'video' ? 'Vídeo' : 'PDF'}).`
                });
              }
            }
          } 
          else if (call.name === "controlar_video") {
            const { acao_reproducao, segundos } = call.args;
            const skip = segundos || 10;
            const player = (window as any).__videoPlayer;

            if (player) {
              if (acao_reproducao === "avancar") {
                player.currentTime = Math.min(player.duration || 99999, player.currentTime + skip);
                actionsExecuted.push({
                  type: "video_control",
                  description: `Avançado vídeo em ${skip} segundos.`
                });
              } else if (acao_reproducao === "retornar") {
                player.currentTime = Math.max(0, player.currentTime - skip);
                actionsExecuted.push({
                  type: "video_control",
                  description: `Retornado vídeo em ${skip} segundos.`
                });
              }
            } else {
              actionsExecuted.push({
                type: "warning",
                description: "Nenhum player de vídeo aberto no momento para controlar."
              });
            }
          }
        }
      }

      // Adicionar resposta do assistente
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: "assistant",
        content: data.text || "Comando processado com sucesso.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        executedActions: actionsExecuted.length > 0 ? actionsExecuted : undefined
      };

      saveMessages([...updated, assistantMsg]);

    } catch (err: any) {
      console.error(err);
      const errMsg: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: "assistant",
        content: "Desculpe, encontrei uma instabilidade ao conectar ao servidor de IA. Você pode tentar novamente.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      saveMessages([...updated, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearHistory = () => {
    if (confirm("Deseja apagar nosso histórico de conversa?")) {
      saveMessages([defaultWelcome]);
    }
  };

  return (
    <>
      {/* Botão Flutuante */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all outline-none border border-white/10"
        whileHover={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.5 }}
        title="FapAcademy Assistente IA"
      >
        <div className="relative">
          <MessageSquare size={24} />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
          </span>
        </div>
      </motion.button>

      {/* Janela de Chat lateral */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 50 }}
            className="fixed bottom-24 right-6 z-50 w-[92vw] sm:w-[420px] h-[520px] bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-blue-600/30 flex items-center justify-center text-[#3B82F6] border border-blue-500/20 shadow-inner">
                  <Sparkles size={18} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                    FapAcademy AI
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Online</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={clearHistory}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
                  title="Limpar Histórico"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl p-3 px-4 text-xs leading-relaxed shadow-sm ${
                      msg.role === "user" 
                        ? "bg-blue-600 text-white rounded-tr-none font-medium" 
                        : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/55"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">
                      {/* Tradução rústica e segura de Markdown para visual */}
                      {msg.content.split("**").map((part, i) => 
                        i % 2 === 1 ? <strong key={i} className="text-white font-bold">{part}</strong> : part
                      )}
                    </p>

                    {/* Exibe ações simuladas ou automações executadas */}
                    {msg.executedActions && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/50 space-y-1">
                        {msg.executedActions.map((action, ai) => (
                          <div key={ai} className="flex items-center gap-1.5 text-[10px] text-blue-400 font-medium">
                            {action.type === 'video' ? <Video size={12} /> : <FileText size={12} />}
                            <span>{action.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 px-1 mt-1 font-mono">{msg.timestamp}</span>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex flex-col items-start">
                  <div className="bg-slate-800 border border-slate-700/55 rounded-2xl rounded-tl-none p-3 px-4 text-xs text-slate-400 flex items-center gap-1.5">
                    <span>FapAcademy está digitando</span>
                    <span className="flex gap-1">
                      <span className="h-1 w-1 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                      <span className="h-1 w-1 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                      <span className="h-1 w-1 bg-slate-500 rounded-full animate-bounce delay-300"></span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input e Controles */}
            <div className="p-3 sm:p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col gap-2">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isRecording ? "Ouvindo sua voz..." : "Como posso te ajudar?"}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-600 transition-all font-medium"
                  disabled={isRecording}
                />
                
                {speechSupported && (
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`p-3 rounded-xl transition-all ${
                      isRecording 
                        ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
                        : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                    title={isRecording ? "Parar de ouvir" : "Pesquisar por comando de voz"}
                  >
                    {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!inputText.trim() || isRecording}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white p-3 rounded-xl transition-all shadow-lg shadow-blue-600/10 active:scale-95 flex items-center justify-center cursor-pointer"
                >
                  <Send size={15} />
                </button>
              </form>
              <div className="flex items-center justify-between px-1 text-[9px] text-slate-500 font-mono">
                <span>Microfone {speechSupported ? "Disponível" : "Indisponível"}</span>
                <span className="flex items-center gap-1">
                  <Volume2 size={10} />
                  Controle de vídeo ativado
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
