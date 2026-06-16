import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  Sparkles, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Info, 
  Loader2, 
  FileVideo, 
  RefreshCw, 
  Play, 
  Video, 
  FileText,
  BookmarkCheck,
  ChevronRight,
  ShieldCheck,
  Settings,
  Cpu
} from "lucide-react";

interface GeminiVideoUploaderProps {
  theme: 'light' | 'dark';
}

type UploadStepState = 'idle' | 'generating_url' | 'uploading_to_google' | 'completed' | 'error';

export const GeminiVideoUploader: React.FC<GeminiVideoUploaderProps> = ({ theme }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string>("");
  
  // Estados do upload
  const [uploadStep, setUploadStep] = useState<UploadStepState>('idle');
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string>("");
  const [activeXhr, setActiveXhr] = useState<XMLHttpRequest | null>(null);

  // Metadados retornados pelo Google Gemini File API
  const [uploadedFileUri, setUploadedFileUri] = useState<string>("");
  const [uploadedFileMimeType, setUploadedFileMimeType] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  // Estado da análise Gemini
  const [prompt, setPrompt] = useState<string>(
    "Analise o vídeo desta aula de treinamento detalhadamente. Forneça um resumo geral do conteúdo estruturado contendo: \n1. Principais Tópicos Abordados\n2. Passo a Passo Técnico/Operacional Explicado\n3. Pontos de Atenção Críticos para evitar erros\n4. Recomendações didáticas para fixação."
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [analysisError, setAnalysisError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Limpa URLs Blob locais anteriores de memória
  useEffect(() => {
    return () => {
      if (localVideoUrl) {
        URL.revokeObjectURL(localVideoUrl);
      }
    };
  }, [localVideoUrl]);

  // Capturar arquivo de vídeo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert("Por favor, selecione apenas arquivos de vídeo (MP4, WebM, etc).");
      return;
    }

    // Reset de tudo
    cancelUpload();
    setSelectedFile(file);
    setUploadPercent(0);
    setUploadStep('idle');
    setUploadError("");
    setUploadedFileUri("");
    setUploadedFileMimeType("");
    setUploadedFileName("");
    setAnalysisResult("");
    setAnalysisError("");

    // Cria Blob URL para o player local
    const bUrl = URL.createObjectURL(file);
    setLocalVideoUrl(bUrl);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert("Por favor, selecione apenas arquivos de vídeo.");
      return;
    }

    cancelUpload();
    setSelectedFile(file);
    setUploadPercent(0);
    setUploadStep('idle');
    setUploadError("");
    setUploadedFileUri("");
    setUploadedFileMimeType("");
    setUploadedFileName("");
    setAnalysisResult("");
    setAnalysisError("");

    const bUrl = URL.createObjectURL(file);
    setLocalVideoUrl(bUrl);
  };

  // Cancela o Upload Atual se houver
  const cancelUpload = () => {
    if (activeXhr) {
      activeXhr.abort();
      setActiveXhr(null);
    }
  };

  // Executar o fluxo completo de Upload Direto para o Google
  const startDirectUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadStep('generating_url');
      setUploadError("");

      // 1. Solicita a URL de upload segura do nosso backend na Vercel (Rápido, segura, protege a key)
      const res = await fetch("/api/gemini/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.name,
          mimeType: selectedFile.type,
          size: selectedFile.size
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Ocorreu um erro ao obter canal de upload.");
      }

      const { uploadUrl } = await res.json();

      // 2. Com a URL do Google em mãos, o Front envia o arquivo BRUTO diretamente (Nuvem para Nuvem)
      setUploadStep('uploading_to_google');

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      
      // Cabeçalhos requeridos pelo protocolo de upload seguro/resumível do Google APIs
      xhr.setRequestHeader("X-Goog-Upload-Offset", "0");
      xhr.setRequestHeader("X-Goog-Upload-Command", "upload, finalize");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadPercent(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data && data.file) {
              setUploadedFileUri(data.file.uri);
              setUploadedFileMimeType(data.file.mimeType);
              setUploadedFileName(data.file.displayName || selectedFile.name);
              setUploadStep('completed');
            } else {
              throw new Error("Metadados do arquivo não retornados de forma válida pelo Google.");
            }
          } catch (e: any) {
            setUploadError(`Erro ao interpretar confirmação do arquivo: ${e.message}`);
            setUploadStep('error');
          }
        } else {
          setUploadError(`Falha ao carregar conteúdo estruturado (Status Google: ${xhr.status})`);
          setUploadStep('error');
        }
      };

      xhr.onerror = () => {
        setUploadError("Falha de conexão física ou perda de rede durante a transferência direta.");
        setUploadStep('error');
      };

      // Inicia a transferência
      xhr.send(selectedFile);
      setActiveXhr(xhr);

    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Erro inesperado ao iniciar o pipeline.");
      setUploadStep('error');
    }
  };

  // Solicita ao Backend a Análise Inteligente do vídeo já presente na nuvem
  const analyzeVideoWithGemini = async () => {
    if (!uploadedFileUri || !uploadedFileMimeType) return;

    setIsAnalyzing(true);
    setAnalysisError("");
    setAnalysisResult("");

    try {
      const res = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUri: uploadedFileUri,
          mimeType: uploadedFileMimeType,
          prompt: prompt
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Ocorreu um erro no servidor de inteligência.");
      }

      const data = await res.json();
      setAnalysisResult(data.text);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || "Erro para processar a inferência com o modelo Gemini.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper para formatar tamanho de arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Renderizador básico de Markdown rústico e seguro
  const renderStyledText = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      
      // Cabeçalhos (ex: ### Titulo)
      if (trimmed.startsWith("###")) {
        return <h5 key={idx} className="text-sm font-extrabold text-blue-400 mt-4 mb-2 first:mt-0">{trimmed.replace("###", "").trim()}</h5>;
      }
      if (trimmed.startsWith("##")) {
        return <h4 key={idx} className="text-base font-extrabold text-blue-300 mt-4 mb-2 first:mt-0 border-b border-slate-800 pb-1">{trimmed.replace("##", "").trim()}</h4>;
      }
      if (trimmed.startsWith("#")) {
        return <h3 key={idx} className="text-lg font-extrabold text-[#3B82F6] mt-4 mb-2 first:mt-0">{trimmed.replace("#", "").trim()}</h3>;
      }

      // Listas ordenadas/não ordenadas
      if (trimmed.startsWith("•") || trimmed.startsWith("*") || trimmed.startsWith("-")) {
        const cleanItem = trimmed.replace(/^[•\*\-]/, "").trim();
        return (
          <div key={idx} className="pl-4 py-0.5 flex gap-2 text-xs leading-relaxed text-slate-300">
            <span className="text-[#3B82F6]">•</span>
            <div>{parseBoldText(cleanItem)}</div>
          </div>
        );
      }

      // Listas numeradas
      if (/^\d+\./.test(trimmed)) {
        return (
          <div key={idx} className="pl-2 py-0.5 flex gap-2 text-xs leading-relaxed text-slate-300">
            <span className="font-mono text-blue-500 font-bold">{trimmed.match(/^\d+\./)?.[0]}</span>
            <div>{parseBoldText(trimmed.replace(/^\d+\./, "").trim())}</div>
          </div>
        );
      }

      return (
        <p key={idx} className="text-xs leading-relaxed text-slate-300 min-h-[0.5rem] mb-2">
          {parseBoldText(line)}
        </p>
      );
    });
  };

  const parseBoldText = (text: string) => {
    return text.split("**").map((part, i) => 
      i % 2 === 1 ? <strong key={i} className="text-white font-bold">{part}</strong> : part
    );
  };

  const isDark = theme === 'dark';

  return (
    <div className={`p-4 lg:p-8 min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0F172A] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Hero Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="h-9 w-9 rounded-xl bg-blue-600/20 flex items-center justify-center text-[#3B82F6] border border-blue-500/20">
                <Cpu size={18} className="animate-spin-slow" />
              </div>
              <span className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                Gemini File API Integrado
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
              Análise Avançada de Vídeo com Gemini IA
            </h1>
            <p className={`mt-2 text-xs lg:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Carregue treinamentos pesados e de alta duração diretamente para os servidores do Google (PUT Nuvem-para-Nuvem), 
              contornando timeouts de funções serverless da Vercel para análises detalhadas sem lentidão.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Painel Esquerdo: Seletor de Arquivos, Preview e Status do Upload (Cols: 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Caixa de Drag e Drop / Upload */}
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
              selectedFile 
                ? 'border-blue-500/50 bg-blue-500/5' 
                : isDark 
                  ? 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700' 
                  : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept="video/*" 
              className="hidden" 
              onChange={handleFileChange}
            />
            
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/10">
                <Upload size={22} className={uploadStep === 'uploading_to_google' ? 'animate-bounce' : ''} />
              </div>
            </div>

            {selectedFile ? (
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-white max-w-full truncate">{selectedFile.name}</p>
                <div className="flex justify-center gap-3 text-[10px] text-slate-400 font-mono">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  <span>•</span>
                  <span>{selectedFile.type || 'Tipo desconhecido'}</span>
                </div>
                <p className="text-[10px] text-blue-400 font-semibold pt-1">Clique ou solte para trocar de arquivo</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-white mb-1">Selecione uma videoaula para o Gemini</p>
                <p className="text-[10px] text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                  Arraste o arquivo do seu computador ou clique para explorar. Todos os formatos de vídeo são aceitos.
                </p>
              </div>
            )}
          </div>

          {/* Player local do vídeo */}
          {localVideoUrl && (
            <div className={`rounded-2xl p-4 border overflow-hidden ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Video size={14} className="text-blue-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Player Local de Monitoramento</h4>
              </div>
              <div className="relative rounded-xl overflow-hidden aspect-video bg-black flex items-center justify-center group border border-slate-800">
                <video 
                  ref={videoRef}
                  src={localVideoUrl} 
                  className="w-full h-full object-contain" 
                  controls 
                  muted
                />
              </div>
              <p className="text-[9px] text-slate-500 mt-2 text-center text-justify">
                *O player reproduz o arquivo instantaneamente do seu computador para validação prévia. O vídeo não precisa terminar de subir para ser visualizado localmente.
              </p>
            </div>
          )}

          {/* Widget de Controle de Status do Pipeline de Upload */}
          {selectedFile && (
            <div className={`rounded-2xl p-5 border ${
              isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <ActivityIndicator step={uploadStep} />
                  <h4 className="text-xs font-bold tracking-tight text-white">Status do Envio Direto</h4>
                </div>
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 roundedbg bg-slate-800 text-slate-300">
                  {uploadStep === 'idle' ? 'Pronto' : 
                   uploadStep === 'generating_url' ? 'Autorizando' : 
                   uploadStep === 'uploading_to_google' ? 'Transferindo' : 
                   uploadStep === 'completed' ? 'Sucesso' : 'Erro'}
                </span>
              </div>

              {/* Descrições dinâmicas de cada etapa */}
              <div className="space-y-4">
                {uploadStep === 'idle' && (
                  <div className="space-y-3">
                    <p className="text-xs leading-relaxed text-slate-400">
                      O vídeo está preparado! Clique no botão abaixo para iniciar o canal direto de nuvem com os servidores do Google.
                    </p>
                    <button 
                      onClick={startDirectUpload}
                      className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-blue-500/10"
                    >
                      <Upload size={14} />
                      Iniciar Upload Direto
                    </button>
                  </div>
                )}

                {uploadStep === 'generating_url' && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <Loader2 className="animate-spin text-blue-500 shrink-0" size={16} />
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Solicitando URL segura de upload diretamente com a File API do Gemini (protegendo credenciais)...
                    </p>
                  </div>
                )}

                {uploadStep === 'uploading_to_google' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                      <span className="flex items-center gap-1">
                        <Loader2 className="animate-spin text-blue-500" size={12} />
                        Enviando binário direta à Google...
                      </span>
                      <span className="font-mono text-blue-400 font-bold">{uploadPercent}%</span>
                    </div>
                    {/* Barra de progresso */}
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 relative"
                        style={{ width: `${uploadPercent}%` }}
                      >
                        <span className="absolute inset-x-0 bottom-0 top-0 bg-white/20 animate-pulse"></span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                      <span>Ignora tempo do Vercel Server</span>
                      <button 
                        onClick={cancelUpload}
                        className="text-red-400 hover:underline"
                      >
                        Cancelar Envio
                      </button>
                    </div>
                  </div>
                )}

                {uploadStep === 'completed' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-bold text-emerald-400 leading-tight">Envio de Arquivo Concluído!</p>
                        <p className="text-[9px] text-slate-400 leading-relaxed font-mono truncate max-w-[280px]">
                          URI: {uploadedFileUri}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      O arquivo foi registrado de forma permanente nos servidores do Google. Ele está pronto para o modelo Gemini analisá-lo com contexto integral.
                    </p>
                  </div>
                )}

                {uploadStep === 'error' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-bold text-red-400 leading-tight">Falha no Pipeline</p>
                        <p className="text-[9px] text-red-300 leading-tight">{uploadError}</p>
                      </div>
                    </div>
                    <button 
                      onClick={startDirectUpload}
                      className="w-full bg-slate-850 hover:bg-slate-800 text-slate-300 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-800"
                    >
                      <RefreshCw size={12} />
                      Tentar Novamente
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Painel Direito: Configuração da Análise IA e Área de Resultados (Cols: 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Caixa de Texto do Prompt Dinâmico */}
          <div className={`rounded-3xl p-5 lg:p-6 border ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <Settings size={16} className="text-blue-500" />
              <h4 className="text-sm font-bold tracking-tight text-white">Instruções para o Gemini (Prompt)</h4>
            </div>

            <textarea
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all resize-none leading-relaxed font-medium"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Digite o comando que guiará a análise do Gemini no vídeo..."
              disabled={isAnalyzing || uploadStep !== 'completed'}
            />

            {/* Tags e Sugestões rápidas de Prompts para Videoaulas */}
            <div className="mt-3.5 flex flex-wrap gap-2">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider self-center mr-1">Sugestões:</span>
              <button 
                onClick={() => setPrompt("Por favor, faça um resumo conceitual e didático desta aula em tópicos simples e claros.")}
                disabled={isAnalyzing || uploadStep !== 'completed'}
                className="text-[10px] sm:text-xs font-semibold px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700/50 transition-colors cursor-pointer"
              >
                📝 Resumo Didático
              </button>
              <button 
                onClick={() => setPrompt("Atue como um analista de suporte técnico institucional. Transcreva as telas do vídeo e descreva cada etapa operacional passo-a-passo detalhando cada clique mostrado.")}
                disabled={isAnalyzing || uploadStep !== 'completed'}
                className="text-[10px] sm:text-xs font-semibold px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700/50 transition-colors cursor-pointer"
              >
                🔧 Detalhar Cliques / Telas
              </button>
              <button 
                onClick={() => setPrompt("Analise este curso e formule um questionário estilo Quiz contendo 5 perguntas de múltipla escolha baseadas em pontos cruciais do conteúdo do vídeo, acompanhado do gabarito correspondente.")}
                disabled={isAnalyzing || uploadStep !== 'completed'}
                className="text-[10px] sm:text-xs font-semibold px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700/50 transition-colors cursor-pointer"
              >
                ✏️ Gerar Quiz Avaliativo
              </button>
            </div>

            {/* Ação de Disparo de Análise */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3 justify-end">
              <span className="text-[10px] text-slate-500 text-center sm:text-left leading-normal">
                {uploadStep === 'completed' 
                  ? "✓ Arquivo pronto para passar ao Gemini" 
                  : "⚠ Faça o upload do vídeo completo primeiro para ativar a análise"}
              </span>
              <button 
                onClick={analyzeVideoWithGemini}
                disabled={isAnalyzing || uploadStep !== 'completed'}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg ${
                  uploadStep === 'completed' && !isAnalyzing
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-indigo-500/20 active:scale-95 cursor-pointer'
                    : 'bg-slate-800/50 text-slate-500 border border-slate-800/80 cursor-not-allowed shadow-none'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Processando Vídeo na IA...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-amber-400 animate-pulse" />
                    Analisar com Gemini 3.5
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Container de Respostas / Exibição */}
          <div className={`rounded-3xl p-6 border flex flex-col min-h-[300px] justify-between ${
            isDark ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-850 mb-5">
                <div className="flex items-center gap-2">
                  <BookmarkCheck size={16} className="text-emerald-500" />
                  <h4 className="text-sm font-bold tracking-tight text-white">Relatório Gerado pela IA</h4>
                </div>
                {isAnalyzing && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping"></span>
                    Gemini Pensando...
                  </span>
                )}
              </div>

              {/* Corpo da Resposta */}
              <div className="space-y-3 prose prose-invert overflow-x-auto select-text">
                {isAnalyzing && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="relative">
                      <div className="h-14 w-14 rounded-full border-2 border-dashed border-blue-500/30 animate-spin"></div>
                      <Sparkles className="absolute inset-0 m-auto text-[#3B82F6] animate-pulse" size={20} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white">Analisando vídeo diretamente nos servidores do Google...</p>
                      <p className="text-[10px] text-slate-500 max-w-sm">
                        O Gemini está lendo o fluxo de frames e o áudio da sua gravação. Isso pode levar alguns segundos devido ao alto processamento.
                      </p>
                    </div>
                  </div>
                )}

                {!isAnalyzing && !analysisResult && !analysisError && (
                  <div className="py-16 text-center">
                    <div className="flex justify-center mb-3">
                      <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                        <FileText size={18} />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-400">Aguardando início do processamento</p>
                    <p className="text-[10px] text-slate-500 max-w-xs mx-auto mt-1">
                      Faça o upload de uma gravação técnica de videoaula e solicite a análise para gerar relatórios profissionais.
                    </p>
                  </div>
                )}

                {analysisError && (
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <AlertTriangle size={15} />
                      <span>Erro de Processamento IA</span>
                    </div>
                    <p className="text-[11px] leading-relaxed select-text font-mono">{analysisError}</p>
                  </div>
                )}

                {!isAnalyzing && analysisResult && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="space-y-4 pr-1 max-h-[500px] overflow-y-auto"
                  >
                    {renderStyledText(analysisResult)}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Rodapé informativo */}
            {analysisResult && !isAnalyzing && (
              <div className="mt-6 pt-4 border-t border-slate-850 flex items-center gap-2 text-[10px] text-slate-500">
                <Info size={11} className="shrink-0 text-blue-500" />
                <p>O Gemini analisa frames e áudio em fusão pura, oferecendo alto nível de acerto mesmo em conteúdos densos.</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

// Componente simples para a bolinha de status
const ActivityIndicator: React.FC<{ step: UploadStepState }> = ({ step }) => {
  if (step === 'idle') return <span className="h-2 w-2 rounded-full bg-slate-650 inline-block"></span>;
  if (step === 'generating_url') return <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse inline-block"></span>;
  if (step === 'uploading_to_google') return <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping inline-block"></span>;
  if (step === 'completed') return <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>;
  return <span className="h-2 w-2 rounded-full bg-red-500 inline-block"></span>;
};
