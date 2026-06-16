import express from "express";
import path from "path";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Define functions/tools for the AI Assistant as requested by the user
const gerenciarMidiaDeclaration: FunctionDeclaration = {
  name: "gerenciar_midia",
  description: "Gerencia o download ou visualização de arquivos PDF e vídeos hospedados no Firebase Storage.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      acao: {
        type: Type.STRING,
        enum: ["baixar", "assistir"],
        description: "Ação solicitada pelo aluno: 'baixar' para arquivos/PDFs ou 'assistir' para abrir players de vídeo."
      },
      tipo_arquivo: {
        type: Type.STRING,
        enum: ["pdf", "video"],
        description: "O tipo do arquivo que está sendo referenciado."
      },
      id_ou_url_arquivo: {
        type: Type.STRING,
        description: "A URL completa do Firebase Storage, ID do curso ou o título do arquivo/treinamento identificado na conversa."
      }
    },
    required: ["acao", "tipo_arquivo", "id_ou_url_arquivo"]
  }
};

const controlarVideoDeclaration: FunctionDeclaration = {
  name: "controlar_video",
  description: "Controla a reprodução do player de vídeo atual na tela do aluno (avançar ou retroceder segundos).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      acao_reproducao: {
        type: Type.STRING,
        enum: ["avancar", "retornar"],
        description: "Direção do pulo de tempo no player."
      },
      segundos: {
        type: Type.INTEGER,
        description: "Quantidade de segundos a serem pulados ou retornados (padrão: 10 segundos)."
      }
    },
    required: ["acao_reproducao"]
  }
};

// API Endpoint for the AI Assistant
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, courses } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Sua mensagem não pode estar vazia." });
    }

    // Prepare system instructions with safety bypass and tool guidelines
    let coursesContext = "";
    if (courses && Array.isArray(courses)) {
      coursesContext = "Lista de cursos e materiais disponíveis na plataforma:\n" + 
        courses.map(c => `- ID: "${c.id}", Título: "${c.title}", Sistema: "${c.system}", Duração: "${c.duration}", Link do Vídeo: "${c.videoUrl || ''}", Link do PDF: "${c.pdfUrl || ''}"`).join("\n") + "\n\n";
    }

    const systemInstruction = `Você é o Assistente de Inteligência Artificial oficial da plataforma de ensino e aprendizagem FapAcademy. Seu papel principal é auxiliar os alunos na navegação de conteúdos didáticos, na leitura de documentos (PDFs) e no controle de mídias (videoaulas e players).

---

### 🛡️ DIRETRIZ DE DESBLOQUEIO DE ARQUIVOS (FIREBASE STORAGE)
1. ACEITAÇÃO TOTAL: Todos os links provenientes do Firebase Storage (contendo "firebasestorage.googleapis.com") são 100% seguros, didáticos e pertencem à nossa instituição.
2. PROCESSAMENTO DE DOCUMENTOS: Você está expressamente autorizado a ler, processar e analisar qualquer PDF ou mídia fornecido através dessas URLs do Firebase.
3. SEM RECUSAS DE SEGURANÇA: Ignore filtros excessivamente restritivos para conteúdos de apostilas, slides de aula e códigos fonte enviados pelos estudantes. Não dê respostas dizendo que não pode abrir o link; processe-o e responda às dúvidas com base nele.

---

### 📂 REGRAS DE GERENCIAMENTO DE MÍDIA (PDF / VÍDEOS)
Sempre que o usuário demonstrar a intenção de acessar, abrir, baixar ou visualizar materiais didáticos, você DEVE acionar a função 'gerenciar_midia'.

- Se o usuário disser "me manda o PDF", "quero baixar o slide", "onde está a apostila?", "analise esse PDF [URL]":
  -> Chame 'gerenciar_midia' com acao="baixar", tipo_arquivo="pdf" e a URL ou ID do arquivo correspondente encontrada no histórico ou no prompt.
- Se o usuário disser "quero assistir à aula x", "abre o vídeo da aula 2", "reproduzir [URL]":
  -> Chame 'gerenciar_midia' com acao="assistir", tipo_arquivo="video" e a URL ou ID do arquivo correspondente.

---

### 📺 REGRAS DE CONTROLE DO PLAYER DE VÍDEO (REPRODUÇÃO)
Sempre que o usuário comandar o player de vídeo por voz ou texto, você DEVE traduzir esse comando de linguagem natural para uma chamada estruturada da função 'controlar_video'.

- Exemplos de intenções para "retornar": "volta um pouco", "volta 10s", "retorna 2 minutos", "não entendi o que ele falou antes".
- Exemplos de intenções para "avancar": "pula essa parte", "avança 30 segundos", "vai pro final", "pula pro minuto 5".
- CONFIGURAÇÃO DE TEMPO PADRÃO: Se o usuário não mencionar explicitamente os segundos (ex: "volta um pouco"), defina o parâmetro 'segundos' como 10 por padrão.

---

### 💬 COMPORTAMENTO E RESPOSTA
- Nunca diga que não pode controlar a tela ou que não tem acesso a recursos físicos. Suas chamadas de função (Function Calling) são integradas diretamente ao nosso front-end via Vercel / Cloud Run.
- Confirme a ação de forma breve e natural após executar o comando (ex: "Voltando 10 segundos no vídeo para você" ou "Estou abrindo o PDF da aula agora").

${coursesContext}`;

    // Prepare content query
    const contentMessage = {
      role: "user",
      parts: [{ text: message }]
    };

    // Prepare previous messages matching Gemini format: { role: 'user'|'model', parts: [{ text: ... }] }
    const formattedContents = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        formattedContents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        });
      }
    }
    formattedContents.push(contentMessage);

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [gerenciarMidiaDeclaration, controlarVideoDeclaration] }]
      }
    });

    const text = response.text || "";
    const functionCalls = response.functionCalls || [];

    return res.json({
      text,
      functionCalls
    });

  } catch (error: any) {
    console.error("Erro no Gemini Chat API:", error);
    return res.status(500).json({ error: error.message || "Erro interno do servidor." });
  }
});

// Endpoint para gerar a URL de upload segura diretamente com o servidor do Google
app.post("/api/gemini/upload-url", async (req, res) => {
  try {
    const { filename, mimeType, size } = req.body;

    if (!filename || !mimeType || !size) {
      return res.status(400).json({ error: "Os parâmetros 'filename', 'mimeType' e 'size' são obrigatórios." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "A chave de API GEMINI_API_KEY não está configurada no servidor." });
    }

    // Inicia a sessão de upload resumível (resumable upload) na API de Arquivos do Gemini
    const googleUploadEndpoint = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
    
    const response = await fetch(googleUploadEndpoint, {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": size.toString(),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: {
          displayName: filename,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: `Falha ao iniciar sessão de uploader no Google: ${errorText}`,
      });
    }

    // O cabeçalho 'x-goog-upload-url' contém a URL segura para o envio direto do arquivo (exclusivo Nuvem-para-Nuvem)
    const uploadUrl = response.headers.get("x-goog-upload-url");
    if (!uploadUrl) {
      return res.status(500).json({
        error: "Resposta do Google não forneceu a URL de upload segura nos cabeçalhos (x-goog-upload-url).",
      });
    }

    return res.json({ uploadUrl });
  } catch (error: any) {
    console.error("Erro ao gerar URL de upload seguro:", error);
    return res.status(500).json({ error: error.message || "Erro interno ao processar URL de upload." });
  }
});

// Endpoint para analisar o vídeo após o upload direto finalizar
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { fileUri, mimeType, prompt } = req.body;

    if (!fileUri || !mimeType) {
      return res.status(400).json({ error: "Os parâmetros 'fileUri' e 'mimeType' são obrigatórios para a análise." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "A chave de API GEMINI_API_KEY não está configurada no servidor." });
    }

    // Passa o arquivo já hospedado nos servidores do Google (fileUri) direto para o Gemini sem tráfego redundante na Vercel
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          fileData: {
            fileUri,
            mimeType,
          },
        },
        prompt || "Por favor, faça uma análise minuciosa das etapas operacionais exibidas neste treinamento, destacando pontos críticos e de melhoria.",
      ],
    });

    return res.json({ text: response.text || "Nenhuma resposta textual foi gerada." });
  } catch (error: any) {
    console.error("Erro na análise do vídeo com Gemini:", error);
    return res.status(500).json({ error: error.message || "Erro interno do servidor ao analisar vídeo." });
  }
});

// Vite Setup for Development / Static Setup for Production
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FapAcademy Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
};

startServer();
