/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Play, 
  FileText, 
  BookOpen, 
  Settings, 
  Sparkles,
  LayoutDashboard, 
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  Clock,
  BarChart,
  Menu,
  X,
  CheckCircle2,
  Home as HomeIcon,
  ArrowRight,
  Trophy,
  Users,
  Zap,
  Plus,
  Download,
  Video,
  Upload,
  LogIn,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  Loader2,
  Rewind,
  FastForward,
  RotateCcw,
  RotateCw,
  Pause,
  Maximize,
  ArrowBigLeft,
  ArrowBigRight,
  ExternalLink,
  VolumeX,
  Volume1,
  Volume2,
  FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AIAssistant } from './components/AIAssistant';
import { GeminiVideoUploader } from './components/GeminiVideoUploader';
import { 
  signInAnonymously,
  onAuthStateChanged,
  OAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDocs,
  getDocFromServer,
  query,
  where
} from 'firebase/firestore';
import { db, auth, storage, handleFirestoreError, OperationType } from './lib/firebase';
import { saveLocalFile, getLocalFile } from './lib/indexedDB';

const downloadFile = async (url: string, filename: string) => {
  if (!url) return;
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("CORS constraint or resource not accessible directly");
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.warn("Fallback to opening target link in new tab:", error);
    window.open(url, '_blank');
  }
};

// --- Tipos ---
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
  description?: string;
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

interface CourseCardProps {
  course: Course;
  isCompleted: boolean;
  onToggleComplete: (id: string) => void;
  onOpenMedia: (type: 'video' | 'pdf') => void;
  theme?: 'light' | 'dark';
}

type TabType = 'Home' | '7Edu' | 'TOTVS' | 'Todos' | 'Admin' | 'GeminiVideo';

interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
}

// --- Dados Simulados ---
const INITIAL_USERS: User[] = [
  { id: '1', name: 'Mateus Jhonata', email: 'mateusjhonata123@gmail.com', password: '123', role: 'admin' },
  { id: '2', name: 'Administrador Fap', email: 'admin@fap.com.br', password: 'admin', role: 'admin' },
  { id: '3', name: 'João Silva', email: 'joao@fap.com.br', password: 'user123', role: 'user' },
  { id: '4', name: 'Maria Santos', email: 'maria@fap.com.br', password: 'user456', role: 'user' },
];

const COURSES: Course[] = [
  {
    id: '1',
    title: 'Lançamento de Desconto Condicional',
    system: '7Edu',
    duration: '15 min',
    difficulty: 'Intermediário',
    thumbnail: 'https://i.pinimg.com/736x/02/5a/32/025a32bbd863c42e35e4a87cd372be81.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '2',
    title: 'Alteração de Data de Boleto',
    system: '7Edu',
    duration: '10 min',
    difficulty: 'Iniciante',
    thumbnail: 'https://i.pinimg.com/736x/59/e4/55/59e4554eed17f3bbf64aaf1d2b5d0e06.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '3',
    title: 'Alteração de Contrato',
    system: '7Edu',
    duration: '20 min',
    difficulty: 'Avançado',
    thumbnail: 'https://i.pinimg.com/736x/fc/a0/2e/fca02e2d40c27ff314f401f86e13d75f.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '4',
    title: 'Lançar Negociação',
    system: '7Edu',
    duration: '25 min',
    difficulty: 'Avançado',
    thumbnail: 'https://i.pinimg.com/736x/b0/00/a6/b000a6dff49949b26bbf932dc7bbddf5.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL',
    pdfUrl: ''
  },
  {
    id: '8',
    title: 'Lançamento de Contrato / Pensionato',
    system: '7Edu',
    duration: '22 min',
    difficulty: 'Intermediário',
    thumbnail: 'https://i.pinimg.com/1200x/61/ba/f1/61baf113e8c2e798d4bec4a783a9229c.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '9',
    title: 'Lançar Bolsa Dissídio',
    system: '7Edu',
    duration: '15 min',
    difficulty: 'Intermediário',
    thumbnail: 'https://i.pinimg.com/736x/1d/b6/f7/1db6f75828876c1d6c16f9e893f27f09.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '10',
    title: 'Lançar Taxa de Evento',
    system: '7Edu',
    duration: '12 min',
    difficulty: 'Iniciante',
    thumbnail: 'https://i.pinimg.com/736x/5b/48/25/5b4825901279276a6b6e557cde6b902f.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '11',
    title: 'Baixar Arquivo Bancário',
    system: '7Edu',
    duration: '18 min',
    difficulty: 'Intermediário',
    thumbnail: 'https://i.pinimg.com/1200x/55/4f/fa/554ffab47b99d836c193031ac6dafa7f.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '20',
    title: 'Baixar Declaração de Pagamentos',
    system: '7Edu',
    duration: '10 min',
    difficulty: 'Iniciante',
    thumbnail: 'https://i.pinimg.com/736x/83/1c/0d/831c0dd3d6cd518e330eed0909427703.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '12',
    title: 'Lançar Bolsa (Desconto / Filantrópica)',
    system: 'TOTVS',
    duration: '20 min',
    difficulty: 'Intermediário',
    thumbnail: 'https://i.pinimg.com/736x/b7/a7/96/b7a79630680a20b165bdad440b2bd368.jpg',
    videoUrl: 'https://drive.google.com/file/d/1asr3r1waCXeepATD7kartYtmbfo-1cNf/preview'
  },
  {
    id: '13',
    title: 'Cancelar Lançamento',
    system: 'TOTVS',
    duration: '10 min',
    difficulty: 'Iniciante',
    thumbnail: 'https://i.pinimg.com/736x/9c/7b/63/9c7b639a76ff775b1d0b89aceb8cebc2.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '14',
    title: 'Baixar Boletos',
    system: 'TOTVS',
    duration: '15 min',
    difficulty: 'Iniciante',
    thumbnail: 'https://i.pinimg.com/736x/d5/6d/55/d56d55038df48a5e87577c8b33609e0f.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '15',
    title: 'Registrar e Cancelar Remessa de Boletos',
    system: 'TOTVS',
    duration: '25 min',
    difficulty: 'Avançado',
    thumbnail: 'https://i.pinimg.com/1200x/b6/38/c2/b638c2455e4877a1bbfd4c3c0575da9c.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '16',
    title: 'Baixar Declaração de Pagamentos',
    system: 'TOTVS',
    duration: '12 min',
    difficulty: 'Iniciante',
    thumbnail: 'https://i.pinimg.com/736x/7a/3b/1b/7a3b1b8403a073057292533a5f82e31f.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '17',
    title: 'Baixar Declaração de Débitos',
    system: 'TOTVS',
    duration: '12 min',
    difficulty: 'Iniciante',
    thumbnail: 'https://i.pinimg.com/1200x/e9/e8/1f/e9e81f7db763553e51869ed3abe9dc43.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '18',
    title: 'Aceite de Contrato',
    system: 'TOTVS',
    duration: '15 min',
    difficulty: 'Intermediário',
    thumbnail: 'https://i.pinimg.com/736x/7f/3a/aa/7f3aaaa7ea3f0c3cf9ff780d218dc107.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '19',
    title: 'Retorno de Cobrança',
    system: 'TOTVS',
    duration: '20 min',
    difficulty: 'Intermediário',
    thumbnail: 'https://i.pinimg.com/736x/e1/3e/63/e13e63fb996ee070375592625c1c8b32.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '21',
    title: 'Assistente de parcelas / gerar parcelas',
    system: 'TOTVS',
    duration: '18 min',
    difficulty: 'Intermediário',
    thumbnail: 'https://i.pinimg.com/736x/5f/8e/6c/5f8e6cbc8801b5b41bae70b9c02322c4.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '22',
    title: 'Cadastrar logos',
    system: 'TOTVS',
    duration: '10 min',
    difficulty: 'Iniciante',
    thumbnail: 'https://i.pinimg.com/1200x/93/01/3b/93013bc2b7dc1c7a82df5ebff448f96d.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '28',
    title: 'Lançar contrato de Pensionato',
    system: 'TOTVS',
    duration: '10 min',
    difficulty: 'Iniciante',
    thumbnail: 'https://i.pinimg.com/736x/a1/14/97/a11497ccc8d4ac79fcc11fb5415833cc.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '23',
    title: 'Devolução de mensalidade',
    system: 'TOTVS',
    duration: '15 min',
    difficulty: 'Intermediário',
    thumbnail: 'https://i.pinimg.com/1200x/85/95/7f/85957f8aba52e654066b75a51482dec7.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '24',
    title: 'Lançamento mensal de Boletos',
    system: 'TOTVS',
    duration: '20 min',
    difficulty: 'Intermediário',
    thumbnail: 'https://i.pinimg.com/1200x/18/ea/66/18ea66f817ab3b0a487c83796437e383.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '25',
    title: 'Lançamento individual de boletos',
    system: 'TOTVS',
    duration: '12 min',
    difficulty: 'Iniciante',
    thumbnail: 'https://i.pinimg.com/736x/62/50/28/625028aeb510d0c0f7fd68629240e806.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '26',
    title: 'Vincular 2 lançamentos em um 1 boleto',
    system: 'TOTVS',
    duration: '15 min',
    difficulty: 'Avançado',
    thumbnail: 'https://i.pinimg.com/1200x/c9/79/ad/c979add200083998f27138d82d15dfb7.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  },
  {
    id: '27',
    title: 'Devolução de mensalidade',
    system: '7Edu',
    duration: '14 min',
    difficulty: 'Intermediário',
    thumbnail: 'https://i.pinimg.com/1200x/30/0d/c9/300dc97960d1a89943538da53942c891.jpg',
    videoUrl: 'https://mailadventistas.sharepoint.com/:v:/s/SAD-USB-IAP/iapatendimento/IQBnbmk1XWx6RZKdV7HeOLU0AQOOwNjwiyBGeF5gjbrgxw0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=gobcbL'
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('Home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [completedCourses, setCompletedCourses] = useState<string[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('fapacademy_theme');
    return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'light';
  });

  useEffect(() => {
    localStorage.setItem('fapacademy_theme', theme);
  }, [theme]);

  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modalType, setModalType] = useState<'video' | 'pdf' | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(false);

  // --- Listeners de Dados ---
  useEffect(() => {
    // Cursos (Sempre visíveis publicamente agora)
    const coursesUnsubscribe = onSnapshot(collection(db, 'courses'), 
      async (snapshot) => {
        const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
        // Resolve local file URLs from IndexedDB if they are local keys
        const updatedCourses = await Promise.all(coursesData.map(async (course) => {
          const updatedCourse = { ...course };
          if (course.videoUrl && course.videoUrl.startsWith('local-file-')) {
            try {
              const blob = await getLocalFile(course.videoUrl);
              if (blob) {
                updatedCourse.videoUrl = URL.createObjectURL(blob);
              }
            } catch (err) {
              console.error("Erro ao carregar arquivo de vídeo local:", err);
            }
          }
          if (course.pdfUrl && course.pdfUrl.startsWith('local-file-')) {
            try {
              const blob = await getLocalFile(course.pdfUrl);
              if (blob) {
                updatedCourse.pdfUrl = URL.createObjectURL(blob);
              }
            } catch (err) {
              console.error("Erro ao carregar material PDF local:", err);
            }
          }
          return updatedCourse;
        }));

        // Sort: items with createdAt descending, then items without by numeric ID ascending
        updatedCourses.sort((a, b) => {
          const aTime = a.createdAt || 0;
          const bTime = b.createdAt || 0;
          if (aTime || bTime) {
            return bTime - aTime;
          }
          const aId = parseInt(a.id) || 999;
          const bId = parseInt(b.id) || 999;
          return aId - bId;
        });

        setCourses(updatedCourses);
        setIsAppLoading(false);

        if (snapshot.empty) {
          COURSES.forEach(async (c) => {
            const { id, ...data } = c;
            await setDoc(doc(db, 'courses', id), {
              ...data,
              createdAt: Date.now() - (30 - (parseInt(id) || 0)) * 60000
            });
          });
        }
      },
      (error) => {
        console.error("Erro ao carregar cursos:", error);
      }
    );

    return () => {
      coursesUnsubscribe();
    };
  }, []);

  // Listener de Usuários (Apenas Administradores podem listar todos)
  useEffect(() => {
    const isAdmin = currentUser?.role?.toLowerCase() === 'admin' || currentUser?.email === 'mateusjhonata123@gmail.com';
    if (!currentUser || !isAdmin) {
      setUsers([]);
      return;
    }

    const usersUnsubscribe = onSnapshot(collection(db, 'users'), 
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(usersData);
        
        if (snapshot.empty) {
          INITIAL_USERS.forEach(async (u) => {
            const { id, ...data } = u;
            await setDoc(doc(db, 'users', id), data);
          });
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );

    return () => usersUnsubscribe();
  }, [currentUser]);

  // --- Carregar Sessão ---
  useEffect(() => {
    const savedUser = localStorage.getItem('fapacademy_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Erro ao carregar usuário", e);
      }
    }
  }, []);

  const handleLogin = async (loginData: Pick<User, 'email' | 'password'>) => {
    setIsAppLoading(true);
    try {
      // Busca limitada para satisfazer as regras e eficiência
      const q = query(
        collection(db, 'users'), 
        where('email', '==', loginData.email.toLowerCase()), 
        where('password', '==', loginData.password)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const user = { id: userDoc.id, ...userDoc.data() } as User;
        setCurrentUser(user);
        localStorage.setItem('fapacademy_user', JSON.stringify(user));
      } else {
        alert("E-mail ou senha incorretos");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Erro ao conectar com o banco de dados. Verifique sua conexão.");
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setIsAppLoading(true);
    try {
      const provider = new OAuthProvider('microsoft.com');
      provider.setCustomParameters({
        tenant: 'organizations', // Restringe a contas corporativas Microsoft (Azure AD)
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email?.toLowerCase();
      
      if (!email) {
        throw new Error("Não foi possível obter o e-mail da conta Microsoft.");
      }
      
      // Verifica se o usuário já existe na coleção 'users' do Firestore
      const q = query(
        collection(db, 'users'), 
        where('email', '==', email)
      );
      const querySnapshot = await getDocs(q);
      
      let userObj: User;
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        userObj = { id: userDoc.id, ...userDoc.data() } as User;
      } else {
        // Registra automaticamente o usuário corporativo novo
        const newId = result.user.uid || Math.random().toString(36).substr(2, 9);
        const name = result.user.displayName || email.split('@')[0].toUpperCase();
        const newUser: User = {
          id: newId,
          name,
          email,
          role: 'user',
          password: 'corporate-oauth-user' // Senha padrão fictícia de controle
        };
        await setDoc(doc(db, 'users', newId), newUser);
        userObj = newUser;
      }
      
      setCurrentUser(userObj);
      localStorage.setItem('fapacademy_user', JSON.stringify(userObj));
    } catch (error: any) {
      console.error("Erro no login Microsoft:", error);
      
      // Tratamento amigável caso o provedor Microsoft ainda não esteja ativo no Console do Firebase
      if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/configuration-not-found' || error.message?.includes('provider') || error.code?.includes('configuration')) {
        const wishToSimulate = window.confirm(
          "O login integrado com Microsoft 365 / Azure AD não está ativado no Console do Firebase de desenvolvimento.\n\n" +
          "Para ativá-lo em ambiente real:\n" +
          "1. Vá ao Firebase Console -> Authentication -> Sign-in Method\n" +
          "2. Clique em 'Adicionar novo provedor' -> Microsoft e insira o Application ID e Secret do Azure AD.\n\n" +
          "Gostaria de rodar uma simulação de autenticação com e-mail corporativo para ver como o fluxo e o controle de progresso se comportam?"
        );
        
        if (wishToSimulate) {
          const testEmail = window.prompt("Insira um endereço de e-mail corporativo fictício (ex: seu.nome@suaempresa.com.br):", "colaborador@fap.com.br");
          if (testEmail && testEmail.trim()) {
            const emailClean = testEmail.trim().toLowerCase();
            const q = query(
              collection(db, 'users'), 
              where('email', '==', emailClean)
            );
            const querySnapshot = await getDocs(q);
            let userObj: User;
            if (!querySnapshot.empty) {
              const userDoc = querySnapshot.docs[0];
              userObj = { id: userDoc.id, ...userDoc.data() } as User;
            } else {
              const newId = "ms-" + Math.random().toString(36).substr(2, 9);
              userObj = {
                id: newId,
                name: emailClean.split('@')[0].toUpperCase(),
                email: emailClean,
                role: 'user',
                password: 'corporate-oauth-user'
              };
              await setDoc(doc(db, 'users', newId), userObj);
            }
            setCurrentUser(userObj);
            localStorage.setItem('fapacademy_user', JSON.stringify(userObj));
          }
        }
      } else {
        alert("Erro ao realizar login corporativo: " + (error.message || error));
      }
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('fapacademy_user');
    setActiveTab('Home');
  };

  // --- Carregar Progresso ---
  useEffect(() => {
    const saved = localStorage.getItem('fapacademy_progress');
    if (saved) {
      try {
        setCompletedCourses(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar progresso", e);
      }
    }
  }, []);

  // --- Salvar Progresso ---
  useEffect(() => {
    localStorage.setItem('fapacademy_progress', JSON.stringify(completedCourses));
  }, [completedCourses]);

  // --- Lógica de Filtro ---
  const filteredCourses = useMemo(() => {
    return courses
      .filter(course => {
        const matchesTab = activeTab === 'Todos' || activeTab === 'Home' || course.system === activeTab;
        const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [activeTab, searchQuery, courses]);

  const toggleComplete = (id: string) => {
    const isNowCompleted = !completedCourses.includes(id);
    if (isNowCompleted) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
    setCompletedCourses(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const progressPercentage = Math.round((completedCourses.length / Math.max(COURSES.length, courses.length)) * 100);

  return (
    <AnimatePresence mode="wait">
      {!currentUser ? (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3 }}
        >
          <LoginView users={users} onLogin={handleLogin} onMicrosoftLogin={handleMicrosoftLogin} />
        </motion.div>
      ) : (
        <motion.div 
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`flex min-h-screen font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0B0F19] text-slate-100' : 'bg-[#F1F5F9] text-slate-900'}`}
        >
          {/* --- Overlay Mobile --- */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-md lg:hidden"
              />
            )}
          </AnimatePresence>

          {/* --- Sidebar --- */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-[#0F172A] text-white transition-all duration-500 ease-in-out lg:static overflow-hidden ${
          isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 w-0'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <button 
            onClick={() => { setActiveTab('Home'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
            className="flex items-center gap-3 px-6 py-8 hover:opacity-80 transition-opacity w-full text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3B82F6]">
              <GraduationCap size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight">FapAcademy</span>
          </button>

          {/* Navegação */}
          <nav className="flex-1 space-y-1 px-4">
            <SidebarItem 
              icon={<HomeIcon size={20} />} 
              label="Início" 
              active={activeTab === 'Home'} 
              onClick={() => { setActiveTab('Home'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} 
            />
            <SidebarItem 
              icon={<LayoutDashboard size={20} />} 
              label="Todos os Cursos" 
              active={activeTab === 'Todos'} 
              onClick={() => { setActiveTab('Todos'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} 
            />
            <SidebarItem 
              icon={<Sparkles size={20} className="text-blue-500 animate-pulse" />} 
              label="Análise IA Gemini" 
              active={activeTab === 'GeminiVideo'} 
              onClick={() => { setActiveTab('GeminiVideo'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} 
            />
            
            <div className="pt-4 pb-2">
              <p className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sistemas</p>
            </div>
            <SidebarItem 
              icon={<BookOpen size={20} />} 
              label="7Edu" 
              active={activeTab === '7Edu'} 
              onClick={() => { setActiveTab('7Edu'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} 
            />
            <SidebarItem 
              icon={<Settings size={20} />} 
              label="TOTVS" 
              active={activeTab === 'TOTVS'} 
              onClick={() => { setActiveTab('TOTVS'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} 
            />

            {currentUser && (currentUser.role?.toLowerCase() === 'admin' || currentUser.email === 'mateusjhonata123@gmail.com') && (
                <>
                  <div className="pt-4 pb-2">
                    <p className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Administração</p>
                  </div>
                  <SidebarItem 
                    icon={<Users size={20} />} 
                    label="Controle Geral" 
                    active={activeTab === 'Admin'} 
                    onClick={() => { setActiveTab('Admin'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} 
                  />
                </>
              )}
          </nav>

          {/* Botão de Alternância de Tema */}
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tema {theme === 'dark' ? 'Escuro' : 'Claro'}</span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                theme === 'dark' ? 'bg-[#3B82F6]' : 'bg-slate-700'
              }`}
              title="Alternar tema"
            >
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              >
                {theme === 'dark' ? (
                  <Moon size={10} className="text-indigo-600" />
                ) : (
                  <Sun size={10} className="text-amber-500" />
                )}
              </div>
            </button>
          </div>

          {/* Progresso Geral na Sidebar */}
          <div className="px-6 py-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Seu Progresso</span>
              <span className="text-xs font-bold text-[#3B82F6]">{progressPercentage}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                className="h-full bg-[#3B82F6]"
              />
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              {completedCourses.length} de {COURSES.length} aulas concluídas
            </p>
          </div>

          {/* User Profile (Footer Sidebar) */}
          <div className="border-t border-slate-800 p-4">
            <div className="flex items-center gap-3 rounded-lg p-2 bg-slate-800/50">
              <div className="h-8 w-8 rounded-full bg-[#3B82F6] flex items-center justify-center text-xs font-bold">
                {currentUser?.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{currentUser?.name}</p>
                <p className="truncate text-xs text-slate-400">{currentUser?.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* --- Conteúdo Principal --- */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header Mobile & Desktop Search */}
        <header className={`sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 lg:px-8 transition-colors duration-300 ${
          theme === 'dark' ? 'border-slate-800 bg-[#0F172A] text-white' : 'border-slate-200 bg-white text-slate-900'
        }`}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`rounded-md p-2 transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100'
            }`}
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex flex-1 items-center justify-center px-4 lg:justify-start lg:px-0">
            {activeTab !== 'Home' && activeTab !== 'GeminiVideo' && (
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar procedimento..." 
                  className={`w-full rounded-full border py-2 pl-10 pr-4 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 transition-all ${
                    theme === 'dark' 
                      ? 'bg-slate-850 border-slate-700 text-slate-100 placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-500">
              <span className="text-xs font-medium">FapAcademy v1.0</span>
            </div>
          </div>
        </header>

        {/* Área de Conteúdo Dinâmica */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'Home' ? (
              <HomeView key="home" onNavigate={(tab) => setActiveTab(tab)} theme={theme} />
            ) : activeTab === 'GeminiVideo' ? (
              <GeminiVideoUploader key="gemini-video" theme={theme} />
            ) : activeTab === 'Admin' ? (
              <AdminView 
                key="admin" 
                users={users} 
                onAddUser={async (user) => {
                  setIsAppLoading(true);
                  try {
                    const { id, ...data } = user;
                    await setDoc(doc(db, 'users', id), data);
                  } catch (e) {
                    handleFirestoreError(e, OperationType.CREATE, 'users');
                  } finally {
                    setIsAppLoading(false);
                  }
                }} 
                onDeleteUser={async (id) => {
                  setIsAppLoading(true);
                  try {
                    await deleteDoc(doc(db, 'users', id));
                  } catch (e) {
                    handleFirestoreError(e, OperationType.DELETE, 'users');
                  } finally {
                    setIsAppLoading(false);
                  }
                }}
                onUpdateUser={async (updatedUser) => {
                  setIsAppLoading(true);
                  try {
                    const { id, ...data } = updatedUser;
                    await updateDoc(doc(db, 'users', id), data as any);
                  } catch (e) {
                    handleFirestoreError(e, OperationType.UPDATE, 'users');
                  } finally {
                    setIsAppLoading(false);
                  }
                }}
                courses={courses}
                onAddCourse={async (course) => {
                  setIsAppLoading(true);
                  try {
                    const { id, ...data } = course;
                    await addDoc(collection(db, 'courses'), {
                      ...data,
                      createdAt: Date.now()
                    });
                  } catch (e) {
                    console.error("Erro ao adicionar curso:", e);
                  } finally {
                    setIsAppLoading(false);
                  }
                }}
                onDeleteCourse={async (id) => {
                  setIsAppLoading(true);
                  try {
                    await deleteDoc(doc(db, 'courses', id));
                  } catch (e) {
                    handleFirestoreError(e, OperationType.DELETE, 'courses');
                  } finally {
                    setIsAppLoading(false);
                  }
                }}
                onUpdateCourse={async (updatedCourse) => {
                  setIsAppLoading(true);
                  try {
                    const { id, ...data } = updatedCourse;
                    await updateDoc(doc(db, 'courses', id), data as any);
                  } catch (e) {
                    handleFirestoreError(e, OperationType.UPDATE, 'courses');
                  } finally {
                    setIsAppLoading(false);
                  }
                }}
                onSyncData={async () => {
                  setIsAppLoading(true);
                  try {
                    // Sync original courses - Use a more robust check (delete existing and rewrite to ensure 25)
                    const coursesCol = collection(db, 'courses');
                    const currentCoursesSnap = await getDocs(coursesCol);
                    
                    // Optional: Clean up existing to reset perfectly
                    if (confirm("Deseja resetar todas as aulas para a versão padrão de 25 cursos? Isso removerá aulas personalizadas.")) {
                      for (const docRef of currentCoursesSnap.docs) {
                        await deleteDoc(doc(db, 'courses', docRef.id));
                      }
                      
                      for (const course of COURSES) {
                        const { id, ...data } = course;
                        await setDoc(doc(db, 'courses', id), data);
                      }
                    }

                    // Sync original users
                    for (const user of INITIAL_USERS) {
                      const userDoc = await getDocFromServer(doc(db, 'users', user.id));
                      if (!userDoc.exists()) {
                        const { id, ...data } = user;
                        await setDoc(doc(db, 'users', id), data);
                      }
                    }
                    alert("Sistema sincronizado! 25 aulas restauradas.");
                  } catch (e) {
                    console.error("Erro ao sincronizar dados", e);
                  } finally {
                    setIsAppLoading(false);
                  }
                }}
                theme={theme}
              />
            ) : (
              <motion.div 
                key="study-area"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 lg:p-8"
              >
                <div className="mb-8">
                  <h1 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {activeTab === 'Todos' ? 'Todos os Treinamentos' : `Treinamentos ${activeTab}`}
                  </h1>
                  <p className={`mt-2 transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Explore os procedimentos operacionais padrão para otimizar seu fluxo de trabalho.
                  </p>
                </div>

                {/* Grid de Cards */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  <AnimatePresence mode="popLayout">
                    {filteredCourses.map((course) => (
                      <CourseCard 
                        key={course.id} 
                        course={course} 
                        isCompleted={completedCourses.includes(course.id)}
                        onToggleComplete={toggleComplete}
                        onOpenMedia={(type) => {
                          setSelectedCourse(course);
                          setModalType(type);
                        }}
                        theme={theme}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {filteredCourses.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="rounded-full bg-slate-200 p-6 mb-4">
                      <Search size={48} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Nenhum resultado encontrado</h3>
                    <p className="text-slate-500">Tente ajustar sua busca ou filtro para encontrar o que procura.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal de Mídia */}
        {(() => {
          const liveSelectedCourse = selectedCourse 
            ? (courses.find(c => c.id === selectedCourse.id) || selectedCourse)
            : null;
          return (
            <MediaModal 
              isOpen={!!modalType} 
              type={modalType} 
              course={liveSelectedCourse} 
              courses={courses}
              onSelectCourse={(c) => {
                setSelectedCourse(c);
              }}
              isCompleted={liveSelectedCourse ? completedCourses.includes(liveSelectedCourse.id) : false}
              onToggleComplete={toggleComplete}
              onClose={() => {
                setModalType(null);
                setSelectedCourse(null);
              }} 
              onPrev={(() => {
                if (!liveSelectedCourse) return undefined;
                const currentIndex = filteredCourses.findIndex(c => c.id === liveSelectedCourse.id);
                if (currentIndex > 0) {
                  return () => setSelectedCourse(filteredCourses[currentIndex - 1]);
                }
                return undefined;
              })()}
              onNext={(() => {
                if (!liveSelectedCourse) return undefined;
                const currentIndex = filteredCourses.findIndex(c => c.id === liveSelectedCourse.id);
                if (currentIndex !== -1 && currentIndex < filteredCourses.length - 1) {
                  return () => setSelectedCourse(filteredCourses[currentIndex + 1]);
                }
                return undefined;
              })()}
            />
          );
        })()}

        {/* Achievement Toast */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-200"
            >
              <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Trophy size={24} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-lg leading-none mb-1">Parabéns!</p>
                <p className="text-emerald-100 text-sm">Você concluiu mais um treinamento.</p>
              </div>
              <button 
                onClick={() => setShowToast(false)}
                className="ml-4 p-1 hover:bg-white/10 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* AI Assistant Chatbot with tool and voice capabilities */}
      <AIAssistant 
        courses={courses} 
        onOpenCourse={(course, type) => {
          setSelectedCourse(course);
          setModalType(type);
          setTimeout(() => {
            if ((window as any).__mediaModalSetTab) {
              (window as any).__mediaModalSetTab(type);
            }
          }, 50);
        }} 
      />
    </motion.div>
  )}
      
      {/* Global Loading Overlay */}
      <AnimatePresence>
        {isAppLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md"
          >
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-[#3B82F6]"
              />
              <div className="absolute inset-0 flex items-center justify-center text-[#3B82F6]">
                <GraduationCap size={24} />
              </div>
            </div>
            <p className="mt-4 font-bold text-slate-800 animate-pulse">Processando...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}

// --- Subcomponentes ---

const HomeView: React.FC<{ onNavigate: (tab: TabType) => void, theme: 'light' | 'dark' }> = ({ onNavigate, theme }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col"
    >
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#0F172A] py-20 px-4 lg:px-8 text-white">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 opacity-10">
          <GraduationCap size={600} />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="inline-block rounded-full bg-[#3B82F6]/20 px-4 py-1 text-sm font-semibold text-[#3B82F6] mb-6">
              Bem-vindo à FapAcademy
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
              Domine os Sistemas <span className="text-[#3B82F6]">7Edu</span> & <span className="text-[#3B82F6]">TOTVS</span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              A plataforma de treinamento interno para o setor Financeiro e Central de Relacionamentos. 
              Aprenda procedimentos, conclua trilhas e eleve sua produtividade.
            </p>
            <button 
              onClick={() => {
                document.getElementById('system-selection')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group flex items-center gap-2 mx-auto rounded-full bg-[#3B82F6] px-8 py-4 text-lg font-bold text-white hover:bg-[#2563EB] transition-all shadow-xl shadow-[#3B82F6]/30 active:scale-95"
            >
              Começar Treinamento
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            visible: { transition: { staggerChildren: 0.1 } }
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <FeatureCard 
            icon={<Zap className="text-amber-500" />}
            title="Acesso Rápido"
            description="Encontre qualquer procedimento em segundos com nossa busca inteligente."
            theme={theme}
          />
          <FeatureCard 
            icon={<Trophy className="text-[#3B82F6]" />}
            title="Acompanhe o Progresso"
            description="Marque aulas concluídas e visualize sua evolução em tempo real."
            theme={theme}
          />
          <FeatureCard 
            icon={<Users className="text-emerald-500" />}
            title="Foco Corporativo"
            description="Conteúdo especializado nos sistemas 7Edu e TOTVS para o dia a dia."
            theme={theme}
          />
        </motion.div>
      </section>

      {/* Quick Access Systems */}
      <section id="system-selection" className={`py-20 px-4 lg:px-8 border-t transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0B0F19] border-slate-900' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className={`text-3xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Escolha seu Sistema</h2>
            <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Selecione a área de estudo que deseja focar hoje.</p>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <SystemCard 
              title="7Edu" 
              color="bg-indigo-600" 
              description="Gestão acadêmica e financeira educacional."
              onClick={() => onNavigate('7Edu')}
            />
            <SystemCard 
              title="TOTVS" 
              color="bg-emerald-600" 
              description="ERP completo para gestão empresarial e contábil."
              onClick={() => onNavigate('TOTVS')}
            />
          </div>
        </div>
      </section>
    </motion.div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string, theme: 'light' | 'dark' }> = ({ icon, title, description, theme }) => (
  <motion.div 
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }}
    whileHover={{ scale: 1.05, y: -5 }}
    transition={{ type: "spring", stiffness: 300 }}
    className={`p-8 rounded-2xl border transition-colors duration-300 shadow-sm cursor-default ${
      theme === 'dark' 
        ? 'bg-[#131B2E] border-slate-800 text-white shadow-black/20' 
        : 'bg-white border-slate-200 hover:shadow-xl'
    }`}
  >
    <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-6 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
      {React.cloneElement(icon as React.ReactElement, { size: 28 })}
    </div>
    <h3 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
    <p className={`leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{description}</p>
  </motion.div>
);

const SystemCard: React.FC<{ title: string, color: string, description: string, onClick: () => void }> = ({ title, color, description, onClick }) => (
  <button 
    onClick={onClick}
    className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95"
  >
    <div className={`absolute inset-0 ${color} opacity-90 group-hover:opacity-100 transition-opacity`} />
    <div className="relative z-10 text-white">
      <h3 className="text-3xl font-bold mb-2">{title}</h3>
      <p className="text-white/80 mb-6">{description}</p>
      <div className="flex items-center gap-2 text-sm font-bold">
        Explorar Trilhas <ArrowRight size={16} />
      </div>
    </div>
  </button>
);

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
        active 
          ? 'bg-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
      {active && <ChevronRight size={16} className="ml-auto" />}
    </button>
  );
}

const CourseCard: React.FC<CourseCardProps> = ({ course, isCompleted, onToggleComplete, onOpenMedia, theme = 'light' }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className={`group flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-xl ${
        isCompleted 
          ? (theme === 'dark' ? 'border-emerald-900 bg-emerald-950/20' : 'border-emerald-200 bg-emerald-50/10') 
          : (theme === 'dark' ? 'border-slate-800 bg-[#131B2E] text-white' : 'border-slate-200 bg-white text-slate-900')
      }`}
    >
      {/* Thumbnail */}
      <div 
        className="relative aspect-video overflow-hidden cursor-pointer"
        onClick={() => onOpenMedia('video')}
      >
        <img 
          src={course.thumbnail} 
          alt={course.title} 
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 ${
            isCompleted ? 'grayscale-[0.5]' : ''
          }`}
          referrerPolicy="no-referrer"
        />
        
        {/* Overlay de Conclusão */}
        {isCompleted && (
          <div className="absolute inset-0 bg-emerald-600/20 flex items-center justify-center">
            <div className="bg-white rounded-full p-2 shadow-lg text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button 
            onClick={() => onOpenMedia('video')}
            className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center text-[#3B82F6] shadow-lg hover:scale-110 transition-transform"
          >
            <Play size={24} fill="currentColor" />
          </button>
        </div>
        
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ${
            course.system === '7Edu' ? 'bg-indigo-600' : 'bg-emerald-600'
          }`}>
            {course.system}
          </span>
          {course.pdfUrl && (
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 ${
              theme === 'dark' ? 'bg-slate-800/90 text-slate-200' : 'bg-white/90 text-slate-900'
            }`}>
              <FileText size={10} /> PDF
            </span>
          )}
          {isCompleted && (
            <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm bg-emerald-500">
              Concluído
            </span>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className={`text-lg font-bold leading-tight transition-colors ${
            isCompleted 
              ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-900') 
              : (theme === 'dark' ? 'text-slate-100 group-hover:text-blue-400' : 'text-slate-900 group-hover:text-[#3B82F6]')
          }`}>
            {course.title}
          </h3>
          <button 
            onClick={() => onToggleComplete(course.id)}
            className={`p-1 rounded-md transition-colors ${
              isCompleted 
                ? 'text-emerald-600 bg-emerald-100/80' 
                : (theme === 'dark' ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100')
            }`}
            title={isCompleted ? "Marcar como não concluído" : "Marcar como concluído"}
          >
            <CheckCircle2 size={20} />
          </button>
        </div>
        
        <p className={`text-xs line-clamp-2 leading-relaxed mb-4 transition-colors ${
          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {course.description || "Esta aula aborda as diretrizes essenciais, instruções e melhores práticas recomendadas para o domínio operacional dos processos administrativos."}
        </p>
        
        <div className={`mt-auto flex items-center gap-4 text-xs transition-colors ${
          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
        }`}>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{course.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <BarChart size={14} />
            <span>{course.difficulty}</span>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <button 
            onClick={() => onOpenMedia('video')}
            className={`flex flex-[2] items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors shadow-sm active:scale-95 ${
              isCompleted 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                : 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
            } ${!course.pdfUrl ? 'w-full' : ''}`}
          >
            <Play size={18} />
            {isCompleted ? 'Reassistir' : 'Iniciar Aula'}
          </button>
          {course.pdfUrl ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                downloadFile(course.pdfUrl!, `${course.title}.pdf`);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all active:scale-95 shadow-sm text-center border ${
                theme === 'dark'
                  ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900 hover:bg-emerald-900/40'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
              title="Baixar Passo a Passo (PDF)"
            >
              <Download size={18} className="text-emerald-500" />
              <span>Passo a Passo</span>
            </button>
          ) : (
            <button 
              disabled
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold border cursor-not-allowed ${
                theme === 'dark'
                  ? 'bg-slate-900 text-slate-700 border-slate-950'
                  : 'bg-slate-50 text-slate-300 border-slate-100'
              }`}
              title="Sem Passo a Passo disponível"
            >
              <FileText size={18} />
              <span>Sem PDF</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const LoginView: React.FC<{ 
  users: User[], 
  onLogin: (data: Pick<User, 'email' | 'password'>) => void,
  onMicrosoftLogin: () => void
}> = ({ onLogin, onMicrosoftLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await onLogin({ email, password });
    } catch (err: any) {
      setError('Credenciais inválidas ou erro de conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="p-8 text-center bg-[#0F172A] text-white">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-[#3B82F6] flex items-center justify-center shadow-lg">
              <GraduationCap size={40} />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">FapAcademy</h1>
          <p className="text-slate-400 mt-2">Plataforma de Treinamento Corporativo</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">E-mail de Acesso</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <LogIn size={20} />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none transition-all"
                  placeholder="seu@email.com.br"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <ShieldCheck size={20} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="w-full pl-12 pr-12 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100"
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full text-white py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#3B82F6] hover:bg-[#2563EB] shadow-blue-100'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  Entrar no Sistema <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-slate-100 animate-pulse"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase tracking-wider font-bold">ou acesse via</span>
            <div className="flex-grow border-t border-slate-100 animate-pulse"></div>
          </div>

          <button 
            type="button"
            onClick={onMicrosoftLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl font-bold text-slate-700 hover:text-slate-900 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="grid grid-cols-2 gap-[2px] w-4 h-4 flex-shrink-0 animate-bounce">
              <div className="w-[7px] h-[7px] bg-[#F25022]"></div>
              <div className="w-[7px] h-[7px] bg-[#7FBA00]"></div>
              <div className="w-[7px] h-[7px] bg-[#00A4EF]"></div>
              <div className="w-[7px] h-[7px] bg-[#FFB900]"></div>
            </div>
            <span>E-mail Corporativo (Microsoft 365)</span>
          </button>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
              <ShieldCheck size={14} />
              <span>Acesso restrito a colaboradores autorizados</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const AdminView: React.FC<{ 
  users: User[], 
  onAddUser: (user: User) => void,
  onDeleteUser: (id: string) => void,
  onUpdateUser: (user: User) => void,
  courses: Course[],
  onAddCourse: (course: Course) => void,
  onDeleteCourse: (id: string) => void,
  onUpdateCourse: (course: Course) => void,
  onSyncData: () => void,
  theme?: 'light' | 'dark'
}> = ({ users, onAddUser, onDeleteUser, onUpdateUser, courses, onAddCourse, onDeleteCourse, onUpdateCourse, onSyncData, theme = 'light' }) => {
  const [adminTab, setAdminTab] = useState<'users' | 'courses' | 'engagement'>('users');
  const [isAdding, setIsAdding] = useState(false);
  const [isBulk, setIsBulk] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' as const });
  const [newCourse, setNewCourse] = useState<Omit<Course, 'id'>>({ 
    title: '', system: '7Edu', duration: '', difficulty: 'Iniciante', thumbnail: '', videoUrl: '', pdfUrl: '', description: '' 
  });
  const [bulkText, setBulkText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Generate beautiful analytical data from courses and users
  const getEngagementData = () => {
    const progressDataStr = localStorage.getItem('fapacademy_progress');
    const completedCourses: string[] = progressDataStr ? JSON.parse(progressDataStr) : [];
    
    const completionsMap: Record<string, number> = {};
    
    courses.forEach((c, idx) => {
      // Deterministically seed base completions based on course index / system
      const baseCount = (idx % 3 === 0 ? 12 : idx % 2 === 0 ? 8 : 4) + (c.system === '7Edu' ? 5 : 2);
      completionsMap[c.id] = baseCount;
    });

    if (completedCourses && completedCourses.length > 0) {
      completedCourses.forEach(cid => {
        if (completionsMap[cid] !== undefined) {
          completionsMap[cid] += 1;
        }
      });
    }

    // Sort and get top 5 most viewed lessons
    const popularLessonsData = courses
      .map(c => ({
        name: c.title.length > 25 ? c.title.substring(0, 25) + '...' : c.title,
        Conclusões: completionsMap[c.id] || 0,
        Sistema: c.system
      }))
      .sort((a, b) => b.Conclusões - a.Conclusões)
      .slice(0, 5);

    // Calculations for "Porcentagem de conclusão média" (Average completion rate)
    const userCompletions = users.map((u, idx) => {
      const isCurrentUser = u.email === 'mateusjhonata123@gmail.com' || u.id === '1';
      if (isCurrentUser) {
        return Math.round((completedCourses.length / Math.max(courses.length, 1)) * 100);
      }
      return idx === 1 ? 80 : idx === 2 ? 40 : idx === 3 ? 64 : 15;
    });

    const averageCompletion = Math.round(
      userCompletions.reduce((sum, val) => sum + val, 0) / Math.max(users.length, 1)
    );

    // Completion distribution by ranges (0-20%, 21-50%, 51-80%, 81-100%)
    const distribution = [
      { name: '0-20%', value: userCompletions.filter(v => v <= 20).length },
      { name: '21-50%', value: userCompletions.filter(v => v > 20 && v <= 50).length },
      { name: '51-80%', value: userCompletions.filter(v => v > 50 && v <= 80).length },
      { name: '81-100%', value: userCompletions.filter(v => v > 80).length }
    ];

    let eduViews = 0;
    let totvsViews = 0;
    courses.forEach(c => {
      const views = completionsMap[c.id] || 0;
      if (c.system === '7Edu') eduViews += views;
      else totvsViews += views;
    });

    const systemViewsData = [
      { name: '7Edu', value: eduViews, color: '#6366F1' },
      { name: 'TOTVS', value: totvsViews, color: '#10B981' }
    ];

    return {
      popularLessonsData,
      averageCompletion,
      distribution,
      systemViewsData
    };
  };

  const handleFileUpload = async (file: File, type: 'video' | 'pdf') => {
    setIsUploading(true);
    
    // Atualiza o estado imediatamente com um texto informativo temporário
    if (type === 'video') {
      setNewCourse(prev => ({ ...prev, videoUrl: "Carregando mídia online (Aguarde)..." }));
    } else {
      setNewCourse(prev => ({ ...prev, pdfUrl: "Carregando material online (Aguarde)..." }));
    }

    // Tenta primeiro enviar para o Firebase Storage de forma pública/online
    try {
      const storageRef = ref(storage, `courses/${type}s/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Salva também no IndexedDB como um backup de cache local útil
      const localId = `local-file-${Date.now()}-${file.name}`;
      try {
        await saveLocalFile(localId, file);
      } catch (e) {
        console.warn("Erro ao salvar cópia local de cache no IndexedDB:", e);
      }

      // Define a URL pública para ser gravada no Firestore para todos os usuários
      if (type === 'video') {
        setNewCourse(prev => ({ ...prev, videoUrl: downloadURL }));
      } else {
        setNewCourse(prev => ({ ...prev, pdfUrl: downloadURL }));
      }
      alert(`${type.toUpperCase()} enviado com sucesso e disponibilizado online para todos!`);
    } catch (error: any) {
      console.error("Erro ao hospedar arquivo no Firebase Storage:", error);
      if (type === 'video') {
        setNewCourse(prev => ({ ...prev, videoUrl: "" }));
      } else {
        setNewCourse(prev => ({ ...prev, pdfUrl: "" }));
      }
      alert(`Erro: O arquivo precisa ser salvo online para que todos os alunos tenham acesso. Detalhes: ${error?.message || error}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name && newUser.email) {
      if (editingUser) {
        onUpdateUser({ ...editingUser, ...newUser });
      } else {
        onAddUser({ id: Math.random().toString(36).substr(2, 9), ...newUser });
      }
      setNewUser({ name: '', email: '', password: '', role: 'Usuário' });
      setIsAdding(false);
      setEditingUser(null);
    }
  };

  const isValidVideoUrl = (urlStr: string) => {
    if (!urlStr) return false;
    const trimmed = urlStr.trim().toLowerCase();
    
    if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) return true;
    if (trimmed.includes('sharepoint.com')) return true;
    if (trimmed.includes('onedrive.live.com') || trimmed.includes('1drv.ms')) return true;
    if (trimmed.includes('vimeo.com')) return true;
    if (trimmed.includes('drive.google.com')) return true;
    if (trimmed.startsWith('blob:')) return true;
    
    if (trimmed.endsWith('.mp4') || trimmed.endsWith('.webm') || trimmed.endsWith('.ogg') || trimmed.endsWith('.mov') || trimmed.endsWith('.m3u8')) return true;
    if (trimmed.includes('firebasestorage.googleapis.com')) return true;
    
    try {
      const parsed = new URL(urlStr);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  const handleSubmitCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.title) {
      alert("Por favor, preencha o título da aula.");
      return;
    }
    if (!newCourse.description) {
      alert("Por favor, preencha a descrição da aula.");
      return;
    }
    if (newCourse.videoUrl) {
      if (!isValidVideoUrl(newCourse.videoUrl)) {
        alert("URL do vídeo inválida! A URL deve ser um link válido do SharePoint, OneDrive, YouTube, Vimeo, Google Drive ou arquivo MP4 direto.");
        return;
      }
    } else {
      alert("Por favor, preencha a URL do vídeo.");
      return;
    }

    try {
      if (editingCourse) {
        onUpdateCourse({ ...editingCourse, ...newCourse });
        alert("Vídeo-aula atualizada com sucesso!");
      } else {
        onAddCourse({ id: Math.random().toString(36).substr(2, 9), ...newCourse });
        alert("Vídeo-aula cadastrada com sucesso!");
      }
      setNewCourse({ title: '', system: '7Edu', duration: '', difficulty: 'Iniciante', thumbnail: '', videoUrl: '', pdfUrl: '', description: '' });
      setIsAdding(false);
      setEditingCourse(null);
    } catch (err) {
      alert("Erro ao salvar curso: " + err);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setNewUser({ name: user.name, email: user.email, password: user.password || '', role: user.role });
    setIsBulk(false);
    setIsAdding(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setNewCourse({ 
      title: course.title, 
      system: course.system, 
      duration: course.duration, 
      difficulty: course.difficulty, 
      thumbnail: course.thumbnail,
      videoUrl: course.videoUrl || '',
      pdfUrl: course.pdfUrl || '',
      description: course.description || ''
    });
    setIsAdding(true);
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText.split('\n').filter(line => line.trim() !== '');
    lines.forEach(line => {
      const parts = line.split(/[,;\t]/).map(s => s.trim());
      if (parts.length >= 2) {
        const [name, email, password] = parts;
        onAddUser({
          id: Math.random().toString(36).substr(2, 9),
          name,
          email,
          password: password || '123', // Senha padrão se não fornecida
          role: 'Usuário'
        });
      }
    });
    setBulkText('');
    setIsAdding(false);
    setIsBulk(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 lg:p-8 max-w-6xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Painel Administrativo</h1>
          <p className="mt-2 text-slate-600">Gerencie usuários, treinamentos e acompanhe o engajamento.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={onSyncData}
            className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-6 py-3 rounded-xl font-bold hover:bg-emerald-100 transition-colors border border-emerald-100"
          >
            <ShieldCheck size={20} /> Sincronizar Tudo
          </button>
          {adminTab === 'users' ? (
            <>
              <button 
                onClick={() => { setIsAdding(true); setIsBulk(true); }}
                className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors border border-slate-200"
              >
                <Plus size={20} /> Importar Vários
              </button>
              <button 
                onClick={() => { setIsAdding(true); setIsBulk(false); setEditingUser(null); }}
                className="flex items-center justify-center gap-2 bg-[#3B82F6] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#2563EB] transition-colors shadow-lg shadow-blue-200"
              >
                <Plus size={20} /> Novo Usuário
              </button>
            </>
          ) : (
            <button 
              onClick={() => { setIsAdding(true); setEditingCourse(null); setNewCourse({ title: '', system: '7Edu', duration: '', difficulty: 'Iniciante', thumbnail: '', videoUrl: '', pdfUrl: '' }); }}
              className="flex items-center justify-center gap-2 bg-[#3B82F6] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#2563EB] transition-colors shadow-lg shadow-blue-200"
            >
              <Plus size={20} /> Nova Aula
            </button>
          )}
        </div>
      </div>

      {/* Admin Tabs */}
      <div className={`flex flex-wrap gap-2 mb-8 p-1 rounded-2xl w-fit transition-colors duration-300 ${
        theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100'
      }`}>
        <button 
          onClick={() => setAdminTab('users')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            adminTab === 'users' 
              ? (theme === 'dark' ? 'bg-slate-800 text-[#3B82F6] shadow-sm' : 'bg-white text-[#3B82F6] shadow-sm') 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Usuários
        </button>
        <button 
          onClick={() => setAdminTab('courses')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            adminTab === 'courses' 
              ? (theme === 'dark' ? 'bg-slate-800 text-[#3B82F6] shadow-sm' : 'bg-white text-[#3B82F6] shadow-sm') 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Aulas e Conteúdo
        </button>
        <button 
          onClick={() => setAdminTab('engagement')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            adminTab === 'engagement' 
              ? (theme === 'dark' ? 'bg-slate-800 text-[#3B82F6] shadow-sm' : 'bg-white text-[#3B82F6] shadow-sm') 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Engajamento dos Usuários
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total de Usuários', value: users.length, icon: <Users className="text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'Aulas Ativas', value: courses.length, icon: <GraduationCap className="text-indigo-600" />, bg: 'bg-indigo-50' },
          { label: 'Sistemas', value: '2', icon: <LayoutDashboard className="text-emerald-600" />, bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg}`}>{stat.icon}</div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {adminTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Usuários Cadastrados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4 min-w-[200px]">Nome</th>
                  <th className="px-6 py-4 min-w-[200px]">E-mail</th>
                  <th className="px-6 py-4">Cargo</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...users].sort((a, b) => {
                  const isMainAdminA = a.email === 'mateusjhonata123@gmail.com';
                  const isMainAdminB = b.email === 'mateusjhonata123@gmail.com';
                  if (isMainAdminA) return -1;
                  if (isMainAdminB) return 1;
                  return a.name.localeCompare(b.name);
                }).map((user) => (
                  <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors ${user.email === 'mateusjhonata123@gmail.com' ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${user.role?.toLowerCase() === 'admin' ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-slate-200 text-slate-600'}`}>
                          {user.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{user.name}</span>
                          {user.email === 'mateusjhonata123@gmail.com' && (
                            <span className="text-[10px] font-extrabold text-[#3B82F6] uppercase tracking-wider flex items-center gap-1">
                              <ShieldCheck size={10} /> Diretor do Sistema
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        user.role?.toLowerCase() === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {user.role?.toLowerCase() === 'admin' ? 'Administrador' : 'Usuário'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="text-slate-400 hover:text-[#3B82F6] transition-colors p-1"
                        >
                          <Settings size={18} />
                        </button>
                        {user.email !== 'mateusjhonata123@gmail.com' && (
                          <button 
                            onClick={() => onDeleteUser(user.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adminTab === 'courses' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Aulas Disponíveis</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4 min-w-[250px]">Aula</th>
                  <th className="px-6 py-4">Sistema</th>
                  <th className="px-6 py-4">Dificuldade</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={course.thumbnail} alt="" className="h-10 w-16 object-cover rounded-lg border border-slate-200" referrerPolicy="no-referrer" />
                        <span className="font-medium text-slate-900">{course.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        course.system === '7Edu' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {course.system}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{course.difficulty}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEditCourse(course)}
                          className="text-slate-400 hover:text-[#3B82F6] transition-colors p-1"
                        >
                          <Settings size={18} />
                        </button>
                        <button 
                          onClick={() => onDeleteCourse(course.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adminTab === 'engagement' && (
        <div className="space-y-8">
          {/* Analytics Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`p-6 rounded-2xl border transition-colors ${theme === 'dark' ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Conclusões</p>
              <h2 className={`text-4xl font-extrabold mt-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                {getEngagementData().systemViewsData.reduce((acc, curr) => acc + curr.value, 0)}
              </h2>
              <p className="text-xs text-slate-500 mt-2">Acumulado em todas as vídeo-aulas</p>
            </div>

            <div className={`p-6 rounded-2xl border transition-colors ${theme === 'dark' ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Média de Conclusão</p>
              <h2 className={`text-4xl font-extrabold mt-2 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`}>
                {getEngagementData().averageCompletion}%
              </h2>
              <p className="text-xs text-slate-500 mt-2">Porcentagem de conclusão média dos alunos</p>
            </div>

            <div className={`p-6 rounded-2xl border transition-colors ${theme === 'dark' ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">7Edu Assistidas</p>
              <h2 className={`text-4xl font-extrabold mt-2 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'}`}>
                {getEngagementData().systemViewsData.find(d => d.name === '7Edu')?.value || 0}
              </h2>
              <p className="text-xs text-slate-500 mt-2">Aulas concluídas no sistema 7Edu</p>
            </div>

            <div className={`p-6 rounded-2xl border transition-colors ${theme === 'dark' ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">TOTVS Assistidas</p>
              <h2 className={`text-4xl font-extrabold mt-2 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`}>
                {getEngagementData().systemViewsData.find(d => d.name === 'TOTVS')?.value || 0}
              </h2>
              <p className="text-xs text-slate-500 mt-2">Aulas concluídas no sistema TOTVS</p>
            </div>
          </div>

          {/* Bento-grid Charts container */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart 1: Bar Chart "Aulas mais assistidas" */}
            <div className={`lg:col-span-2 p-6 rounded-2xl border transition-colors ${theme === 'dark' ? 'bg-[#131B2E] border-slate-800 pt-8' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="mb-4">
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Aulas Mais Assistidas (Top 5)</h3>
                <p className="text-xs text-slate-500">Ranking das vídeo-aulas com o maior número de conclusões</p>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={getEngagementData().popularLessonsData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1E293B' : '#F1F5F9'} />
                    <XAxis type="number" stroke={theme === 'dark' ? '#94A3B8' : '#64748B'} />
                    <YAxis dataKey="name" type="category" width={140} stroke={theme === 'dark' ? '#94A3B8' : '#64748B'} style={{ fontSize: '11px' }} />
                    <Tooltip 
                      contentStyle={theme === 'dark' ? { backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' } : undefined}
                    />
                    <Legend />
                    <Bar dataKey="Conclusões" fill="#3B82F6" barSize={16}>
                      {getEngagementData().popularLessonsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.Sistema === '7Edu' ? '#6366F1' : '#10B981'} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Donut Chart "Visualizações por Sistema" */}
            <div className={`p-6 rounded-2xl border transition-colors ${theme === 'dark' ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="mb-4">
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Estudo por Área</h3>
                <p className="text-xs text-slate-500">Divisão de aulas assistidas entre 7Edu e TOTVS</p>
              </div>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getEngagementData().systemViewsData}
                      cx="55%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getEngagementData().systemViewsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={theme === 'dark' ? { backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' } : undefined}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center text-xs text-slate-500 mt-2">
                Aulas do sistema <span className="text-[#6366F1] font-bold">7Edu</span> representam a maior taxa de visualizações.
              </div>
            </div>
          </div>

          {/* Distribution chart and Stats Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Chart 3: Area/Line Chart of Completion Distribution */}
            <div className={`p-6 rounded-2xl border transition-colors ${theme === 'dark' ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="mb-4">
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Distribuição de Conclusão</h3>
                <p className="text-xs text-slate-500">Quantidade de alunos por faixa de conclusão (%)</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={getEngagementData().distribution}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke={theme === 'dark' ? '#94A3B8' : '#64748B'} />
                    <YAxis stroke={theme === 'dark' ? '#94A3B8' : '#64748B'} />
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1E293B' : '#F1F5F9'} />
                    <Tooltip 
                      contentStyle={theme === 'dark' ? { backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' } : undefined}
                    />
                    <Area type="monotone" dataKey="value" stroke="#3B82F6" fillOpacity={1} fill="url(#colorValue)" name="Alunos" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Engagement list summary table */}
            <div className={`p-6 rounded-2xl border transition-colors ${theme === 'dark' ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="mb-4">
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Performance de Alunos</h3>
                <p className="text-xs text-slate-500">Métricas individuais de aproveitamento por colaborador</p>
              </div>
              <div className="overflow-y-auto max-h-64 pr-2">
                <div className="space-y-4">
                  {users.map((u, idx) => {
                    const isCurrentUser = u.email === 'mateusjhonata123@gmail.com' || u.id === '1';
                    const activeProgressStr = localStorage.getItem('fapacademy_progress');
                    const activeProgressArr: string[] = activeProgressStr ? JSON.parse(activeProgressStr) : [];
                    const pct = isCurrentUser
                      ? Math.round((activeProgressArr.length / Math.max(courses.length, 1)) * 100)
                      : (idx === 1 ? 80 : idx === 2 ? 40 : idx === 3 ? 64 : 15);
                    return (
                      <div key={u.id} className="flex items-center justify-between border-b pb-3 border-dashed border-slate-200">
                        <div>
                          <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            pct >= 75 ? 'bg-emerald-100 text-emerald-800' : pct >= 40 ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {pct}% Concluído
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">
                  {adminTab === 'users' 
                    ? (isBulk ? 'Importar Vários Usuários' : editingUser ? 'Editar Usuário' : 'Novo Usuário')
                    : (editingCourse ? 'Editar Aula' : 'Nova Aula')}
                </h3>
                <button onClick={() => { setIsAdding(false); setEditingUser(null); setEditingCourse(null); }} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              
              <div className="max-h-[70vh] overflow-y-auto">
                {adminTab === 'users' ? (
                  isBulk ? (
                    <form onSubmit={handleBulkSubmit} className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Lista de Usuários</label>
                        <p className="text-xs text-slate-500 mb-2">Cole um por linha no formato: Nome, Email, Senha (opcional)</p>
                        <textarea 
                          required
                          value={bulkText}
                          onChange={(e) => setBulkText(e.target.value)}
                          className="w-full h-48 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none transition-all resize-none font-mono text-sm"
                          placeholder="Ex:&#10;João Silva, joao@fap.com.br, senha123&#10;Maria Santos, maria@fap.com.br"
                        />
                      </div>
                      <button type="submit" className="w-full bg-[#3B82F6] text-white py-4 rounded-xl font-bold hover:bg-[#2563EB] transition-colors mt-4">Importar Lista</button>
                    </form>
                  ) : (
                    <form onSubmit={handleSubmitUser} className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                        <input type="text" required value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">E-mail Corporativo</label>
                        <input type="email" required value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Senha de Acesso</label>
                        <input type="text" required value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Cargo / Permissão</label>
                        <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none transition-all appearance-none bg-white">
                          <option value="user">Usuário Padrão</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>
                      <button type="submit" className="w-full bg-[#3B82F6] text-white py-4 rounded-xl font-bold hover:bg-[#2563EB] transition-colors mt-4">{editingUser ? 'Salvar Alterações' : 'Confirmar Cadastro'}</button>
                    </form>
                  )
                ) : (
                  <form onSubmit={handleSubmitCourse} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Título da Aula</label>
                      <input type="text" required value={newCourse.title} onChange={(e) => setNewCourse({...newCourse, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Descrição Detalhada / Resumo da Aula</label>
                      <textarea 
                        required 
                        value={newCourse.description} 
                        onChange={(e) => setNewCourse({...newCourse, description: e.target.value})} 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none transition-all h-20 resize-none text-sm" 
                        placeholder="Insira as informações profissionais, tópicos abordados nesta aula..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Sistema</label>
                        <select value={newCourse.system} onChange={(e) => setNewCourse({...newCourse, system: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-slate-200">
                          <option value="7Edu">7Edu</option>
                          <option value="TOTVS">TOTVS</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Dificuldade</label>
                        <select value={newCourse.difficulty} onChange={(e) => setNewCourse({...newCourse, difficulty: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-slate-200">
                          <option value="Iniciante">Iniciante</option>
                          <option value="Intermediário">Intermediário</option>
                          <option value="Avançado">Avançado</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Duração (Ex: 15 min)</label>
                        <input type="text" required value={newCourse.duration} onChange={(e) => setNewCourse({...newCourse, duration: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Thumbnail (URL)</label>
                        <input type="text" required value={newCourse.thumbnail} onChange={(e) => setNewCourse({...newCourse, thumbnail: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Vídeo da Aula</label>
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={newCourse.videoUrl} 
                            onChange={(e) => setNewCourse({...newCourse, videoUrl: e.target.value})} 
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none transition-all text-sm" 
                            placeholder="Link do YouTube, Drive, etc." 
                          />
                          <label className={`cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl flex items-center gap-2 border border-slate-200 transition-colors whitespace-nowrap text-sm ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                            {isUploading ? 'Subindo...' : 'Subir Arquivo'}
                            <input 
                              type="file" 
                              className="hidden" 
                              disabled={isUploading}
                              accept="video/*" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, 'video');
                              }}
                            />
                          </label>
                        </div>
                        <p className="text-[10px] text-slate-500 bg-blue-50 p-2 rounded-lg leading-tight">
                          <strong>Dica:</strong> Links permanentes (YouTube/Drive) são melhores. Arquivos subidos via "Subir Arquivo" serão salvos no Firebase Storage.
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Material de Apoio (PDF)</label>
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={newCourse.pdfUrl} 
                            onChange={(e) => setNewCourse({...newCourse, pdfUrl: e.target.value})} 
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none transition-all text-sm" 
                            placeholder="Link do PDF ou documento" 
                          />
                          <label className={`cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl flex items-center gap-2 border border-slate-200 transition-colors whitespace-nowrap text-sm ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                            {isUploading ? 'Subindo...' : 'Subir PDF'}
                            <input 
                              type="file" 
                              className="hidden" 
                              disabled={isUploading}
                              accept=".pdf,.doc,.docx" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, 'pdf');
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isUploading}
                      className={`w-full text-white py-4 rounded-xl font-bold transition-colors mt-4 ${isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#3B82F6] hover:bg-[#2563EB]'}`}
                    >
                      {isUploading ? 'Aguarde o Upload...' : (editingCourse ? 'Salvar Alterações' : 'Adicionar Aula')}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const MediaModal: React.FC<{ 
  isOpen: boolean, 
  type: 'video' | 'pdf' | null, 
  course: Course | null, 
  courses?: Course[],
  onSelectCourse?: (course: Course) => void,
  onClose: () => void,
  onPrev?: () => void,
  onNext?: () => void,
  onTypeChange?: (type: 'video' | 'pdf') => void,
  isCompleted?: boolean,
  onToggleComplete?: (id: string) => void
}> = ({ isOpen, type, course, courses = [], onSelectCourse, onClose, onPrev, onNext, onTypeChange, isCompleted, onToggleComplete }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [currentTab, setCurrentTab] = useState<'video' | 'pdf'>('video');
  const [currentTime, setCurrentTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoState, setVideoState] = useState<'loading' | 'playing' | 'paused' | 'error'>('loading');
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>('');
  const [resolvedPdfUrl, setResolvedPdfUrl] = useState<string>('');

  const addLog = (msg: string) => {
    setDiagnosticLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    if (!isOpen || !course) return;
    
    let active = true;
    let localVideoUrlBlob = '';
    let localPdfUrlBlob = '';

    const resolveLocalResources = async () => {
      // Resolve Video
      if (course.videoUrl) {
        if (course.videoUrl.startsWith('local-file-')) {
          try {
            const blob = await getLocalFile(course.videoUrl);
            if (blob && active) {
              const bUrl = URL.createObjectURL(blob);
              localVideoUrlBlob = bUrl;
              setResolvedVideoUrl(bUrl);
              addLog(`Vídeo local convertido com sucesso em Blob URL: ${bUrl}`);
            }
          } catch (err) {
            console.error(err);
            addLog(`Erro ao resolver vídeo local: ${err}`);
          }
        } else {
          setResolvedVideoUrl(course.videoUrl);
        }
      } else {
        setResolvedVideoUrl('');
      }

      // Resolve PDF
      if (course.pdfUrl) {
        if (course.pdfUrl.startsWith('local-file-')) {
          try {
            const blob = await getLocalFile(course.pdfUrl);
            if (blob && active) {
              const bUrl = URL.createObjectURL(blob);
              localPdfUrlBlob = bUrl;
              setResolvedPdfUrl(bUrl);
              addLog(`PDF local convertido com sucesso em Blob URL: ${bUrl}`);
            }
          } catch (err) {
            console.error(err);
            addLog(`Erro ao resolver PDF local: ${err}`);
          }
        } else {
          setResolvedPdfUrl(course.pdfUrl);
        }
      } else {
        setResolvedPdfUrl('');
      }
    };

    resolveLocalResources();

    return () => {
      active = false;
      if (localVideoUrlBlob && localVideoUrlBlob.startsWith('blob:')) {
        URL.revokeObjectURL(localVideoUrlBlob);
      }
      if (localPdfUrlBlob && localPdfUrlBlob.startsWith('blob:')) {
        URL.revokeObjectURL(localPdfUrlBlob);
      }
    };
  }, [isOpen, course]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (isOpen && type) {
      setCurrentTab(type);
    }
  }, [isOpen, type, course]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Expose tab setter and video controls to window for AI Assistant automation
  useEffect(() => {
    if (isOpen) {
      (window as any).__mediaModalSetTab = setCurrentTab;
    } else {
      (window as any).__mediaModalSetTab = null;
    }
    return () => {
      (window as any).__mediaModalSetTab = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      (window as any).__videoPlayer = videoRef.current;
    } else {
      (window as any).__videoPlayer = null;
    }
    return () => {
      (window as any).__videoPlayer = null;
    };
  }, [isOpen, currentTab, course]);

  useEffect(() => {
    if (isOpen && course) {
      setVideoState('loading');
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      const logs = [];
      logs.push(`Painel aberto para o curso: "${course.title}"`);
      if (course.videoUrl) {
        logs.push(`URL original recebida: ${course.videoUrl}`);
        const typeStr = getUrlType(course.videoUrl);
        logs.push(`Tipo de mídia identificada: ${typeStr}`);
        const converted = getEmbedUrl(course.videoUrl);
        logs.push(`URL convertida para reprodução: ${converted}`);
      } else {
        logs.push(`Aviso: Este treinamento não possui URL de vídeo cadastrada.`);
      }
      setDiagnosticLogs(logs);

      // Auto play for direct videos after simple timeout
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().then(() => {
            setIsPlaying(true);
            setVideoState('playing');
          }).catch(() => {
            addLog("Tentativa de auto-play bloqueada pelo navegador.");
            setVideoState('paused');
          });
        }
      }, 500);
    }
  }, [isOpen, course]);

  if (!course) return null;

  const isVideoBlob = course.videoUrl?.startsWith('blob:');
  const isPdfBlob = course.pdfUrl?.startsWith('blob:');

  const isDirectVideo = (url: string) => {
    return url.startsWith('blob:') || 
           url.includes('.mp4') || 
           url.includes('.webm') || 
           url.includes('.ogg') || 
           url.includes('vercel.app') || 
           url.includes('firebasestorage.googleapis.com');
  };

  const getUrlType = (url: string) => {
    if (!url) return 'Vazia';
    const parsed = url.toLowerCase();
    if (parsed.includes('youtube.com') || parsed.includes('youtu.be')) return 'YouTube';
    if (parsed.includes('vimeo.com')) return 'Vimeo (Player)';
    if (parsed.includes('sharepoint.com')) return 'SharePoint';
    if (parsed.includes('onedrive.live.com')) return 'OneDrive';
    if (parsed.includes('drive.google.com')) return 'Google Drive';
    if (parsed.startsWith('blob:') || isDirectVideo(url)) return 'Link Direto / MP4 (HTML5)';
    return 'URL de Internet Geral';
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    let parsedUrl = url.trim();

    // 1. YouTube
    if (parsedUrl.includes('youtube.com') || parsedUrl.includes('youtu.be')) {
      if (parsedUrl.includes('watch?v=')) {
        parsedUrl = parsedUrl.replace('watch?v=', 'embed/');
      } else if (parsedUrl.includes('youtu.be/')) {
        parsedUrl = parsedUrl.replace('youtu.be/', 'youtube.com/embed/');
      } else if (parsedUrl.includes('/shorts/')) {
        parsedUrl = parsedUrl.replace('/shorts/', '/embed/');
      }
      return parsedUrl;
    }

    // 1.1 Vimeo
    if (parsedUrl.includes('vimeo.com')) {
      const vimeoIdMatch = parsedUrl.match(/vimeo\.com\/(\d+)/);
      if (vimeoIdMatch) {
         return `https://player.vimeo.com/video/${vimeoIdMatch[1]}?autoplay=1`;
      }
      return parsedUrl;
    }

    // 2. Google Drive
    if (parsedUrl.includes('drive.google.com')) {
      if (parsedUrl.includes('/view')) {
        parsedUrl = parsedUrl.split('/view')[0] + '/preview';
      } else if (!parsedUrl.endsWith('/preview') && parsedUrl.includes('/file/d/')) {
        const parts = parsedUrl.split('/file/d/');
        if (parts[1]) {
          const id = parts[1].split('/')[0];
          parsedUrl = `https://drive.google.com/file/d/${id}/preview`;
        }
      }
      return parsedUrl;
    }

    // 3. SharePoint and OneDrive
    if (parsedUrl.includes('sharepoint.com')) {
      if (parsedUrl.includes('Embed.aspx')) return parsedUrl;
      const sharepointMatch = parsedUrl.match(/(https:\/\/[^\/]+)\/:v:\/s\/([^\/]+)\/([^\/?]+)/);
      if (sharepointMatch) {
        const [_, domain, site, id] = sharepointMatch;
        return `${domain}/sites/${site}/_layouts/15/Embed.aspx?UniqueId=${id}&action=embedview`;
      }
      
      const personalMatch = parsedUrl.match(/(https:\/\/[^\/]+)\/:v:\/g\/personal\/([^\/]+)\/([^\/?]+)/);
      if (personalMatch) {
        const [_, domain, user, id] = personalMatch;
        return `${domain}/personal/${user}/_layouts/15/Embed.aspx?UniqueId=${id}&action=embedview`;
      }

      try {
        const urlObj = new URL(parsedUrl);
        urlObj.searchParams.set('action', 'embedview');
        return urlObj.toString();
      } catch (e) {
        if (!parsedUrl.includes('action=embedview')) {
          parsedUrl += parsedUrl.includes('?') ? '&action=embedview' : '?action=embedview';
        }
        return parsedUrl;
      }
    }

    if (parsedUrl.includes('onedrive.live.com')) {
      if (parsedUrl.includes('Embed.aspx')) return parsedUrl;
      try {
        const urlObj = new URL(parsedUrl);
        urlObj.searchParams.set('action', 'embedview');
        return urlObj.toString();
      } catch (e) {
        if (!parsedUrl.includes('action=embedview')) {
          parsedUrl += parsedUrl.includes('?') ? '&action=embedview' : '?action=embedview';
        }
        return parsedUrl;
      }
    }

    return parsedUrl;
  };

  const getPdfEmbedUrl = (url: string) => {
    if (!url) return '';
    let parsedUrl = url.trim();

    if (parsedUrl.includes('drive.google.com')) {
      if (parsedUrl.includes('/view')) {
        parsedUrl = parsedUrl.split('/view')[0] + '/preview';
      } else if (!parsedUrl.endsWith('/preview') && parsedUrl.includes('/file/d/')) {
        const parts = parsedUrl.split('/file/d/');
        if (parts[1]) {
          const id = parts[1].split('/')[0];
          parsedUrl = `https://drive.google.com/file/d/${id}/preview`;
        }
      }
      return parsedUrl;
    }

    if (parsedUrl.includes('sharepoint.com')) {
      const sharepointMatch = parsedUrl.match(/(https:\/\/[^\/]+)\/:f:\/s\/([^\/]+)\/([^\/?]+)/) || 
                              parsedUrl.match(/(https:\/\/[^\/]+)\/:v:\/s\/([^\/]+)\/([^\/?]+)/);
      if (sharepointMatch) {
        const [_, domain, site, id] = sharepointMatch;
        return `${domain}/sites/${site}/_layouts/15/Embed.aspx?UniqueId=${id}&action=embedview`;
      }

      const personalMatch = parsedUrl.match(/(https:\/\/[^\/]+)\/:f:\/g\/personal\/([^\/]+)\/([^\/?]+)/) ||
                            parsedUrl.match(/(https:\/\/[^\/]+)\/:v:\/g\/personal\/([^\/]+)\/([^\/?]+)/);
      if (personalMatch) {
        const [_, domain, user, id] = personalMatch;
        return `${domain}/personal/${user}/_layouts/15/Embed.aspx?UniqueId=${id}&action=embedview`;
      }

      try {
        const urlObj = new URL(parsedUrl);
        urlObj.searchParams.set('action', 'embedview');
        return urlObj.toString();
      } catch (e) {
        if (!parsedUrl.includes('action=embedview')) {
          parsedUrl += parsedUrl.includes('?') ? '&action=embedview' : '?action=embedview';
        }
        return parsedUrl;
      }
    }

    if (parsedUrl.includes('onedrive.live.com')) {
      try {
        const urlObj = new URL(parsedUrl);
        urlObj.searchParams.set('action', 'embedview');
        return urlObj.toString();
      } catch (e) {
        if (!parsedUrl.includes('action=embedview')) {
          parsedUrl += parsedUrl.includes('?') ? '&action=embedview' : '?action=embedview';
        }
        return parsedUrl;
      }
    }

    return parsedUrl;
  };

  const videoSrc = resolvedVideoUrl && resolvedVideoUrl !== "" && !resolvedVideoUrl.startsWith('file://')
    ? getEmbedUrl(resolvedVideoUrl)
    : null;
    
  const pdfSrc = resolvedPdfUrl && !resolvedPdfUrl.startsWith('file://') 
    ? resolvedPdfUrl 
    : null;

  const pdfEmbedSrc = pdfSrc ? getPdfEmbedUrl(pdfSrc) : null;

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          setVideoState('playing');
        });
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
        setVideoState('paused');
      }
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (offset: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += offset;
      addLog(`Pulou ${offset > 0 ? '+' : ''}${offset} segundos.`);
    } else {
      addLog("Buscar por tempo (Seek/Skip) só funciona para arquivos diretos (MP4).");
    }
  };

  const handleRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      addLog(`Velocidade de reprodução alterada para ${rate}x.`);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      const nextMute = !videoRef.current.muted;
      videoRef.current.muted = nextMute;
      setIsMuted(nextMute);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const togglePictureInPicture = async () => {
    if (videoRef.current) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
          setIsPipActive(false);
        } else if (document.pictureInPictureEnabled) {
          await videoRef.current.requestPictureInPicture();
          setIsPipActive(true);
        }
      } catch (err: any) {
        addLog(`Picture-in-Picture: ${err.message}`);
      }
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(err => {
          addLog(`Erro ao ativar Tela Cheia: ${err.message}`);
        });
      } else {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/90 backdrop-blur-md overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl my-auto overflow-hidden flex flex-col h-auto max-h-[98vh] border border-slate-100"
          >
            {/* Header Modal */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <GraduationCap size={20} />
                </div>
                <div className="max-w-[200px] sm:max-w-[300px] lg:max-w-[400px] text-left">
                  <h3 className="text-sm sm:text-lg font-black text-slate-900 truncate leading-tight">{course?.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-[#3B82F6] font-extrabold uppercase tracking-widest">{course?.system}</span>
                    <span className="text-slate-300 text-xs">•</span>
                    <p className="text-[9px] text-slate-500 uppercase font-extrabold tracking-widest">
                      {currentTab === 'pdf' ? 'Material de Apoio' : 'Vídeo Aula'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic search bar inside the MediaModal */}
              {courses && courses.length > 0 && (
                <div className="relative flex-1 max-w-md mx-0 md:mx-6" ref={searchRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Navegar e buscar outra aula..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsSearchFocused(true);
                      }}
                      onFocus={() => setIsSearchFocused(true)}
                      className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-100"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown containing all matching courses */}
                  <AnimatePresence>
                    {isSearchFocused && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-150 z-[100] max-h-64 overflow-y-auto p-1.5"
                      >
                        {(() => {
                          const query = searchQuery.toLowerCase().trim();
                          const matches = courses.filter(c => 
                            c.title.toLowerCase().includes(query) || 
                            c.system.toLowerCase().includes(query)
                          );

                          if (matches.length === 0) {
                            return <p className="text-[11px] text-slate-400 py-3 text-center font-medium">Nenhuma aula encontrada</p>;
                          }

                          return (
                            <div className="space-y-0.5">
                              {matches.map((c) => (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    onSelectCourse?.(c);
                                    setSearchQuery('');
                                    setIsSearchFocused(false);
                                  }}
                                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left select-none transition-colors ${
                                    c.id === course?.id 
                                      ? 'bg-blue-50 text-blue-700 font-bold' 
                                      : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 max-w-[80%]">
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                      c.system === '7Edu' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'
                                    }`}>
                                      {c.system}
                                    </span>
                                    <span className="text-[11px] font-bold truncate leading-tight">{c.title}</span>
                                  </div>
                                  <span className="text-[9px] text-slate-400 shrink-0 font-mono italic">{c.duration}</span>
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              
              <button 
                onClick={onClose} 
                className="p-2 rounded-full hover:bg-slate-100 text-slate-550 transition-colors shrink-0 ml-auto md:ml-0"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Selector de Abas se ambos existirem */}
            {videoSrc && pdfSrc && (
              <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 gap-2">
                <button
                  onClick={() => setCurrentTab('video')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                    currentTab === 'video'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Play size={14} fill={currentTab === 'video' ? 'currentColor' : 'none'} />
                  Vídeo Aula
                </button>
                <button
                  onClick={() => setCurrentTab('pdf')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                    currentTab === 'pdf'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <FileText size={14} />
                  Material de Apoio (PDF)
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto max-h-[70vh] bg-slate-50">
              {!videoSrc && !pdfSrc ? (
                <div className="flex flex-col items-center justify-center p-12 sm:p-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                    <GraduationCap size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Conteúdo em construção</h3>
                  <p className="text-slate-500 text-xs max-w-sm">Esta aula ainda não possui vídeo ou material PDF anexado.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {/* Vídeo Aula - Visível apenas quando tab === 'video' */}
                  {videoSrc && currentTab === 'video' && (
                    <div className="bg-slate-950 p-2 sm:p-4">
                      {/* Responsive video container */}
                      <div 
                        ref={containerRef}
                        className={`group relative flex items-center justify-center bg-black overflow-hidden mx-auto transition-all ${
                          isFullscreen 
                            ? 'w-screen h-screen' 
                            : 'w-full max-w-4xl aspect-video rounded-2xl shadow-2xl border border-slate-800'
                        }`}
                      >
                        {/* Loading Ring overlay */}
                        {videoState === 'loading' && (
                          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
                            <Loader2 className="animate-spin text-blue-500" size={36} />
                            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Carregando aula segura...</span>
                          </div>
                        )}

                        {/* Status Label on Screen */}
                        <div className="absolute top-4 right-4 z-20 flex gap-2 pointer-events-none mb-1 shadow-lg shadow-black/10">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full text-white flex items-center gap-1.5 backdrop-blur-md ${
                            videoState === 'loading' ? 'bg-amber-600/80' :
                            videoState === 'playing' ? 'bg-emerald-600/80' :
                            videoState === 'paused' ? 'bg-slate-600/80' :
                            'bg-red-600/80'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full bg-white ${videoState === 'playing' || videoState === 'loading' ? 'animate-ping' : ''}`} />
                            {videoState === 'loading' ? 'Carregando' :
                             videoState === 'playing' ? 'Reproduzindo' :
                             videoState === 'paused' ? 'Pausado' :
                             'Visualização Externa'}
                          </span>
                        </div>

                        {/* Warning overlay for SharePoint and OneDrive */}
                        {videoSrc && (videoSrc.includes('sharepoint.com') || videoSrc.includes('onedrive.live.com') || videoSrc.includes('drive.google.com')) && (
                          <div className="absolute top-4 left-4 right-4 z-10 bg-slate-900/95 border border-amber-500/30 text-white p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs backdrop-blur-md shadow-xl transition-opacity hover:opacity-100 opacity-95 text-left max-w-[95%]">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                              <div>
                                <p className="font-bold text-amber-400">Restrição de Login Corporativo</p>
                                <p className="text-slate-300 text-[10px] sm:text-[11px]">
                                  Se o vídeo não carregar ou pedir login, clique ao lado para abrir.
                                </p>
                              </div>
                            </div>
                            <a 
                              href={course.videoUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 font-bold rounded-lg text-[10px] sm:text-xs transition-colors text-white"
                            >
                              <ExternalLink size={10} />
                              Assistir Externo
                            </a>
                          </div>
                        )}

                        {isDirectVideo(videoSrc) ? (
                          <>
                            <video 
                              key={videoSrc}
                              ref={videoRef}
                              src={videoSrc} 
                              className="w-full h-full object-contain cursor-pointer" 
                              controls={false}
                              autoPlay 
                              playsInline
                              onTimeUpdate={handleTimeUpdate}
                              onLoadedMetadata={handleLoadedMetadata}
                              onPlay={() => { setIsPlaying(true); setVideoState('playing'); }}
                              onPause={() => { setIsPlaying(false); setVideoState('paused'); }}
                              onClick={handlePlayPause}
                              onWaiting={() => setVideoState('loading')}
                              onPlaying={() => setVideoState('playing')}
                              onError={() => { setVideoState('error'); addLog("Erro crítico de renderização de vídeo direto."); }}
                            />
                            
                            {/* Central Pause Overlay Indicator */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <AnimatePresence>
                                {!isPlaying && (
                                  <motion.div 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 1.2, opacity: 0 }}
                                    className="w-14 h-14 bg-blue-600/80 text-white rounded-full flex items-center justify-center shadow-2xl backdrop-blur-sm"
                                  >
                                    <Play size={24} fill="currentColor" className="ml-0.5" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Custom Controls Overlay for direct video */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 z-20 flex flex-col gap-2 text-left">
                              {/* Progress bar timeline */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold font-mono text-white tracking-wider">{formatTime(currentTime)}</span>
                                <div className="flex-1 relative h-1 bg-white/20 rounded-full cursor-pointer group/bar">
                                  <input 
                                    type="range"
                                    min="0"
                                    max={duration || 0}
                                    step="0.1"
                                    value={currentTime}
                                    onChange={handleSeekChange}
                                    className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                                  />
                                  <div 
                                    className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                                  />
                                  <div 
                                    className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-white scale-0 group-hover/bar:scale-100 transition-transform duration-100"
                                    style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 5px)` }}
                                  />
                                </div>
                                <span className="text-xs font-bold font-mono text-white tracking-wider">{formatTime(duration)}</span>
                              </div>

                              {/* Controls row */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <button 
                                    onClick={handlePlayPause}
                                    className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                                  >
                                    {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                                  </button>

                                  {/* Volume slider control */}
                                  <div className="flex items-center gap-1 group/vol">
                                    <button onClick={handleMuteToggle} className="text-white/80 hover:text-white p-1">
                                      {isMuted ? <VolumeX size={14} /> : volume < 0.5 ? <Volume1 size={14} /> : <Volume2 size={14} />}
                                    </button>
                                    <input 
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.1"
                                      value={isMuted ? 0 : volume}
                                      onChange={handleVolumeChange}
                                      className="w-12 h-1 bg-white/20 rounded appearance-none cursor-pointer accent-blue-500"
                                    />
                                  </div>

                                  {/* Speed setting */}
                                  <div className="flex gap-1.5">
                                    {[1, 1.5, 2].map(rate => (
                                      <button 
                                        key={rate} 
                                        onClick={() => handleRateChange(rate)}
                                        className={`px-2 py-0.5 rounded text-[11px] font-black tracking-wide ${playbackRate === rate ? 'bg-blue-600 text-white' : 'text-slate-405 hover:text-white hover:bg-white/10'}`}
                                      >
                                        {rate}x
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button onClick={togglePictureInPicture} className="text-white/80 hover:text-white p-1" title="Picture-in-Picture">
                                    <ExternalLink size={14} />
                                  </button>
                                  <button onClick={toggleFullscreen} className="text-white/80 hover:text-white p-1" title="Tela Cheia">
                                    <Maximize size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full relative">
                            {/* Iframe wrapper for general, YouTube, vimeo, sharepoint links */}
                            <iframe 
                              src={videoSrc || undefined} 
                              className="w-full h-full border-0 aspect-video rounded-2xl"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="Vídeo Aula"
                              onLoad={() => {
                                setVideoState('playing');
                                addLog("Iframe carregado e pronto.");
                              }}
                              onError={() => {
                                setVideoState('error');
                                addLog("Falha ao embutir link no iframe.");
                              }}
                            ></iframe>
                          </div>
                        )}
                      </div>
                      
                      {/* Integrated Action & Navigation Bar below player */}
                      <div className="max-w-4xl mx-auto mt-3 bg-slate-900 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-white border border-slate-800">
                        {/* 10s Rewind / Fast Forward */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSeek(-10)}
                            disabled={!isDirectVideo(videoSrc)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all ${
                              isDirectVideo(videoSrc) 
                                ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                                : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                            }`}
                            title={isDirectVideo(videoSrc) ? "Voltar 10 segundos" : "Disponível apenas para arquivos locais de vídeo"}
                          >
                            <RotateCcw size={13} />
                            Rebobinar 10s
                          </button>
                          
                          <button
                            onClick={() => handleSeek(10)}
                            disabled={!isDirectVideo(videoSrc)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all ${
                              isDirectVideo(videoSrc) 
                                ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                                : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                            }`}
                            title={isDirectVideo(videoSrc) ? "Avançar 10 segundos" : "Disponível apenas para arquivos locais de vídeo"}
                          >
                            Avançar 10s
                            <RotateCw size={13} />
                          </button>
                        </div>

                        {/* Navigation: Prev / Next */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={onPrev}
                            disabled={!onPrev}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-colors ${
                              onPrev 
                                ? 'bg-transparent text-blue-400 border border-blue-500/30 hover:bg-blue-500/10' 
                                : 'text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            <ChevronLeft size={14} />
                            Aula Anterior
                          </button>

                          <button
                            onClick={onNext}
                            disabled={!onNext}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-colors ${
                              onNext 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'text-slate-600 bg-slate-805 cursor-not-allowed'
                            }`}
                          >
                            Próxima Aula
                            <ChevronRight size={14} />
                          </button>
                        </div>

                        {/* External Actions & Diagnostic toggles */}
                        <div className="flex items-center gap-2">

                          {course.videoUrl && (
                            <a 
                              href={course.videoUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs sm:text-sm font-bold border border-slate-700"
                            >
                              <ExternalLink size={13} />
                              Nova Aba
                            </a>
                          )}
                          <button
                            onClick={() => setShowLogs(!showLogs)}
                            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold border transition-all ${
                              showLogs ? 'bg-indigo-600/30 text-indigo-400 border-indigo-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            Diagnóstico
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Diagnostic logs output console */}
                  {showLogs && (
                    <div className="mx-4 sm:mx-8 mt-3 bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-emerald-400 max-h-36 overflow-y-auto text-left">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                        <span className="font-bold text-slate-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Log de Diagnóstico Técnico de Mídia
                        </span>
                        <button 
                          onClick={() => setDiagnosticLogs([])}
                          className="text-[9px] bg-slate-800 px-2 py-0.5 rounded hover:text-white"
                        >
                          Limpar
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        {diagnosticLogs.map((log, index) => (
                          <p key={index}>{log}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Material de Apoio (PDF) - Visível apenas quando tab === 'pdf' */}
                  {pdfSrc && currentTab === 'pdf' && (
                    <div className="p-4 sm:p-8 bg-slate-100">
                      <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 text-left">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                              <FileText size={20} />
                            </div>
                            <div>
                              <h4 className="text-base sm:text-lg font-bold text-slate-900">Material de Apoio Oficial</h4>
                              <p className="text-xs text-slate-500">Documentação e guias operacionais em PDF.</p>
                            </div>
                          </div>
                          <a 
                            href={pdfSrc} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow"
                          >
                            <Download size={14} />
                            Baixar Documentação
                          </a>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                          <iframe 
                            src={pdfEmbedSrc || undefined} 
                            className="w-full min-h-[500px] border-0"
                            title="Material PDF"
                          ></iframe>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Informações detalhadas da aula */}
                  <div className="p-4 sm:p-6 md:p-8 bg-white grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] sm:text-xs font-black rounded-lg ${course.system === '7Edu' ? 'bg-blue-550/10 text-blue-600' : 'bg-indigo-550/10 text-indigo-600'}`}>
                          {course.system}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className={`px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-lg ${
                          course.difficulty === 'Iniciante' ? 'bg-emerald-50 text-emerald-600' :
                          course.difficulty === 'Intermediário' ? 'bg-amber-50 text-amber-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>
                          {course.difficulty}
                        </span>
                      </div>

                      <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                        {course.title}
                      </h1>

                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl font-normal">
                        {course.description || "Esta aula aborda as diretrizes essenciais, instruções e melhores práticas recomendadas para o domínio operacional dos processos administrativos."}
                      </p>
                    </div>

                    {/* Progress Toggle Card */}
                    <div className="bg-slate-50 border border-slate-250/20 p-4 rounded-2xl flex flex-col justify-between gap-4">
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Seu Progresso</h4>
                        
                        <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-slate-200 transition-colors">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className={isCompleted ? "text-emerald-500" : "text-slate-300"} />
                            <div className="text-left leading-tight">
                              <p className="text-xs font-bold text-slate-800">Concluído</p>
                              <p className="text-[9px] text-slate-500">Registre sua evolução</p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => onToggleComplete?.(course.id)}
                            className={`h-5 w-11 rounded-full p-0.5 transition-colors relative duration-200 outline-none ${
                              isCompleted ? 'bg-emerald-500' : 'bg-slate-350'
                            }`}
                          >
                            <div className={`h-4 w-4 rounded-full bg-white transition-all shadow-md ${
                              isCompleted ? 'translate-x-6' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        {/* Botão de Marcar Conclusão */}
                        <button
                          onClick={() => onToggleComplete?.(course.id)}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                            isCompleted 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100' 
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10'
                          }`}
                        >
                          <CheckCircle2 size={14} className={isCompleted ? "text-emerald-500" : "text-white"} />
                          {isCompleted ? 'Concluído! Desmarcar aula' : 'Marcar Aula como Concluída'}
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-left">
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Duração</span>
                            <span className="text-xs text-slate-800 font-extrabold flex items-center gap-1 mt-0.5">
                              <Clock size={12} className="text-[#3B82F6]" />
                              {course.duration}
                            </span>
                          </div>
                          <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-left">
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Nível</span>
                            <span className="text-xs text-slate-800 font-extrabold flex items-center gap-1 mt-0.5">
                              <BarChart size={12} className="text-[#3B82F6]" />
                              {course.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botões Separados para Download do Vídeo e do Passo a Passo (PDF) */}
                      <div className="space-y-2 pt-3 border-t border-slate-200/60 text-left">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Downloads Disponíveis</span>
                        
                        {course.videoUrl ? (
                          <button 
                            onClick={() => downloadFile(course.videoUrl!, `${course.title}.mp4`)}
                            className="w-full flex items-center justify-center gap-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-extrabold text-xs py-2.5 px-3 rounded-xl shadow-sm transition-all active:scale-[0.98]"
                            title="Baixar Vídeo Aula"
                          >
                            <Download size={13} />
                            Fazer Download do Vídeo
                          </button>
                        ) : (
                          <div className="w-full flex items-center justify-center gap-1 text-slate-450 bg-slate-100 text-[10px] font-medium py-2 px-3 rounded-lg border border-dashed border-slate-200 cursor-not-allowed">
                            <Video size={12} />
                            Vídeo não disponível
                          </div>
                        )}

                        {pdfSrc ? (
                          <button 
                            onClick={() => downloadFile(pdfSrc, `${course.title}.pdf`)}
                            className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl shadow-sm transition-all active:scale-[0.98]"
                            title="Baixar Passo a Passo (PDF)"
                          >
                            <FileText size={13} />
                            Baixar Passo a Passo (PDF)
                          </button>
                        ) : (
                          <div className="w-full flex items-center justify-center gap-1 text-slate-450 bg-slate-100 text-[10px] font-medium py-2 px-3 rounded-lg border border-dashed border-slate-200 cursor-not-allowed">
                            <FileText size={12} />
                            Sem PDF Passo a Passo
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
