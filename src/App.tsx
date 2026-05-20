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
  Upload,
  LogIn,
  ShieldCheck,
  LogOut,
  Loader2,
  Rewind,
  FastForward,
  RotateCcw,
  RotateCw,
  Pause,
  Maximize,
  ArrowBigLeft,
  ArrowBigRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AIAssistant } from './components/AIAssistant';
import { 
  signInAnonymously,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
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
}

type TabType = 'Home' | '7Edu' | 'TOTVS' | 'Todos' | 'Admin';

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
          <LoginView users={users} onLogin={handleLogin} />
        </motion.div>
      ) : (
        <motion.div 
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-900"
        >
          {/* --- Overlay Mobile --- */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
              />
            )}
          </AnimatePresence>

          {/* --- Sidebar --- */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-white transition-all duration-300 lg:static ${
          isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-md p-2 hover:bg-slate-100"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex flex-1 items-center justify-center px-4 lg:justify-start lg:px-0">
            {activeTab !== 'Home' && (
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar procedimento..." 
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
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
              <HomeView key="home" onNavigate={(tab) => setActiveTab(tab)} />
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
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    {activeTab === 'Todos' ? 'Todos os Treinamentos' : `Treinamentos ${activeTab}`}
                  </h1>
                  <p className="mt-2 text-slate-600">
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
        <MediaModal 
          isOpen={!!modalType} 
          type={modalType} 
          course={selectedCourse} 
          onClose={() => {
            setModalType(null);
            setSelectedCourse(null);
          }} 
          onPrev={(() => {
            if (!selectedCourse) return undefined;
            const currentIndex = filteredCourses.findIndex(c => c.id === selectedCourse.id);
            if (currentIndex > 0) {
              return () => setSelectedCourse(filteredCourses[currentIndex - 1]);
            }
            return undefined;
          })()}
          onNext={(() => {
            if (!selectedCourse) return undefined;
            const currentIndex = filteredCourses.findIndex(c => c.id === selectedCourse.id);
            if (currentIndex !== -1 && currentIndex < filteredCourses.length - 1) {
              return () => setSelectedCourse(filteredCourses[currentIndex + 1]);
            }
            return undefined;
          })()}
        />

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

const HomeView: React.FC<{ onNavigate: (tab: TabType) => void }> = ({ onNavigate }) => {
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
          />
          <FeatureCard 
            icon={<Trophy className="text-[#3B82F6]" />}
            title="Acompanhe o Progresso"
            description="Marque aulas concluídas e visualize sua evolução em tempo real."
          />
          <FeatureCard 
            icon={<Users className="text-emerald-500" />}
            title="Foco Corporativo"
            description="Conteúdo especializado nos sistemas 7Edu e TOTVS para o dia a dia."
          />
        </motion.div>
      </section>

      {/* Quick Access Systems */}
      <section id="system-selection" className="bg-white py-20 px-4 lg:px-8 border-t border-slate-200">
        <div className="max-w-7xl mx-auto w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Escolha seu Sistema</h2>
            <p className="text-slate-600">Selecione a área de estudo que deseja focar hoje.</p>
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

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
  <motion.div 
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }}
    whileHover={{ scale: 1.05, y: -5 }}
    transition={{ type: "spring", stiffness: 300 }}
    className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-default"
  >
    <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center mb-6">
      {React.cloneElement(icon as React.ReactElement, { size: 28 })}
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
    <p className="text-slate-600 leading-relaxed">{description}</p>
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

const CourseCard: React.FC<CourseCardProps> = ({ course, isCompleted, onToggleComplete, onOpenMedia }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className={`group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm border transition-all hover:shadow-xl ${
        isCompleted ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200'
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
            <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/90 text-slate-900 shadow-sm flex items-center gap-1">
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
            isCompleted ? 'text-emerald-900' : 'text-slate-900 group-hover:text-[#3B82F6]'
          }`}>
            {course.title}
          </h3>
          <button 
            onClick={() => onToggleComplete(course.id)}
            className={`p-1 rounded-md transition-colors ${
              isCompleted ? 'text-emerald-600 bg-emerald-100' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
            }`}
            title={isCompleted ? "Marcar como não concluído" : "Marcar como concluído"}
          >
            <CheckCircle2 size={20} />
          </button>
        </div>
        
        <div className="mt-auto flex items-center gap-4 text-xs text-slate-500">
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
              onClick={() => onOpenMedia('pdf')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 py-3 text-sm font-semibold text-emerald-700 transition-colors active:scale-95 shadow-sm"
              title="Ver e Baixar Material de Apoio (PDF)"
            >
              <FileText size={18} className="text-emerald-600" />
              <span>Material</span>
            </button>
          ) : (
            <button 
              disabled
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-50 border border-slate-100 py-3 text-sm font-semibold text-slate-300 cursor-not-allowed"
              title="Sem material de apoio disponível"
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
  onLogin: (data: Pick<User, 'email' | 'password'>) => void 
}> = ({ onLogin }) => {
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

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
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
  onSyncData: () => void
}> = ({ users, onAddUser, onDeleteUser, onUpdateUser, courses, onAddCourse, onDeleteCourse, onUpdateCourse, onSyncData }) => {
  const [adminTab, setAdminTab] = useState<'users' | 'courses'>('users');
  const [isAdding, setIsAdding] = useState(false);
  const [isBulk, setIsBulk] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' as const });
  const [newCourse, setNewCourse] = useState<Omit<Course, 'id'>>({ 
    title: '', system: '7Edu', duration: '', difficulty: 'Iniciante', thumbnail: '', videoUrl: '', pdfUrl: '' 
  });
  const [bulkText, setBulkText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File, type: 'video' | 'pdf') => {
    setIsUploading(true);
    
    // 1. Salva localmente no IndexedDB e atualiza o estado imediatamente para uso instantâneo offline/local
    const localId = `local-file-${Date.now()}-${file.name}`;
    try {
      await saveLocalFile(localId, file);
      
      if (type === 'video') {
        setNewCourse(prev => ({ ...prev, videoUrl: localId }));
      } else {
        setNewCourse(prev => ({ ...prev, pdfUrl: localId }));
      }
    } catch (e) {
      console.warn("Erro ao salvar localmente no IndexedDB:", e);
    }

    // 2. Tenta fazer o upload em segundo plano para o Firebase Storage
    try {
      const storageRef = ref(storage, `courses/${type}s/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Sincroniza com a URL na nuvem se o upload deu certo
      if (type === 'video') {
        setNewCourse(prev => ({ ...prev, videoUrl: downloadURL }));
      } else {
        setNewCourse(prev => ({ ...prev, pdfUrl: downloadURL }));
      }
      alert(`${type.toUpperCase()} enviado e hospedado com sucesso na nuvem!`);
    } catch (error) {
      console.warn("Firebase Storage indisponível, utilizando cópia local do IndexedDB:", error);
      alert(`${type.toUpperCase()} carregado localmente com sucesso no navegador!`);
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

  const handleSubmitCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCourse.title) {
      if (editingCourse) {
        onUpdateCourse({ ...editingCourse, ...newCourse });
      } else {
        onAddCourse({ id: Math.random().toString(36).substr(2, 9), ...newCourse });
      }
      setNewCourse({ title: '', system: '7Edu', duration: '', difficulty: 'Iniciante', thumbnail: '', videoUrl: '', pdfUrl: '' });
      setIsAdding(false);
      setEditingCourse(null);
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
      pdfUrl: course.pdfUrl || ''
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
      <div className="flex gap-4 mb-8 bg-slate-100 p-1 rounded-2xl w-fit">
        <button 
          onClick={() => setAdminTab('users')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${adminTab === 'users' ? 'bg-white text-[#3B82F6] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Usuários
        </button>
        <button 
          onClick={() => setAdminTab('courses')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${adminTab === 'courses' ? 'bg-white text-[#3B82F6] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Aulas e Conteúdo
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

      {adminTab === 'users' ? (
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
      ) : (
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

      {/* Add Modal */}
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
                      <input type="text" required value={newCourse.title} onChange={(e) => setNewCourse({...newCourse, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
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
  onClose: () => void,
  onPrev?: () => void,
  onNext?: () => void,
  onTypeChange?: (type: 'video' | 'pdf') => void
}> = ({ isOpen, type, course, onClose, onPrev, onNext, onTypeChange }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [currentTab, setCurrentTab] = useState<'video' | 'pdf'>('video');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (isOpen && type) {
      setCurrentTab(type);
    }
  }, [isOpen, type, course]);

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

  if (!course) return null;

  const isVideoBlob = course.videoUrl?.startsWith('blob:');
  const isPdfBlob = course.pdfUrl?.startsWith('blob:');

  // Detecção robusta para links diretos (Vercel, MP4, etc)
  const isDirectVideo = (url: string) => {
    return url.startsWith('blob:') || 
           url.includes('.mp4') || 
           url.includes('.webm') || 
           url.includes('.ogg') || 
           url.includes('vercel.app') || 
           url.includes('firebasestorage.googleapis.com');
  };

  const videoSrc = course.videoUrl && course.videoUrl !== "" && !course.videoUrl.startsWith('file://')
    ? (course.videoUrl.includes('youtube.com') || course.videoUrl.includes('youtu.be')
        ? course.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')
        : course.videoUrl)
    : null;
    
  const pdfSrc = course.pdfUrl && !course.pdfUrl.startsWith('file://') 
    ? course.pdfUrl 
    : null;

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
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
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
    }
  };

  const handleRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-full sm:max-w-[95vw] lg:max-w-[90vw] overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[95vh]"
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <GraduationCap size={20} />
                </div>
                <div className="max-w-[150px] sm:max-w-[300px] lg:max-w-none">
                  <h3 className="text-base sm:text-xl font-bold text-slate-900 truncate">{course.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[#3B82F6] font-bold uppercase tracking-wider">{course.system}</span>
                    <span className="text-slate-300">•</span>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      {currentTab === 'pdf' ? 'Material de Apoio' : 'Vídeo Aula'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={onClose} 
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                  aria-label="Fechar"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Selector de Abas se ambos existirem */}
            {videoSrc && pdfSrc && (
              <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 gap-2">
                <button
                  onClick={() => setCurrentTab('video')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all ${
                    currentTab === 'video'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Play size={16} />
                  Vídeo Aula
                </button>
                <button
                  onClick={() => setCurrentTab('pdf')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all ${
                    currentTab === 'pdf'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <FileText size={16} />
                  Material de Apoio (PDF)
                </button>
              </div>
            )}

            <div className="flex-1 bg-white overflow-hidden relative flex flex-col h-full">
              <div className="flex-1 overflow-y-auto scroll-smooth">
                {!videoSrc && !pdfSrc ? (
                  <div className="flex flex-col items-center justify-center p-12 sm:p-20 text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-6">
                      <GraduationCap size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Conteúdo em construção</h3>
                    <p className="text-slate-500 max-w-md">Esta aula ainda não possui vídeo ou material PDF anexado.</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {/* Vídeo Aula - Visível apenas quando tab === 'video' */}
                    {videoSrc && currentTab === 'video' && (
                      <div className="bg-slate-900 w-full">
                        <div className="max-w-6xl mx-auto w-full aspect-video relative group flex items-center justify-center bg-black">
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
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onClick={handlePlayPause}
                              />
                              
                              {/* Central Play/Pause Hint */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <AnimatePresence>
                                  {!isPlaying && (
                                    <motion.div 
                                      initial={{ scale: 0.8, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 1.2, opacity: 0 }}
                                      className="w-20 h-20 bg-blue-600/80 text-white rounded-full flex items-center justify-center shadow-2xl backdrop-blur-sm"
                                    >
                                      <Play size={40} fill="currentColor" className="ml-1" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* Custom Controls Overlay */}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-4 sm:p-8 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
                                {/* Progress Bar */}
                                <div className="mb-6 group/timeline relative">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] sm:text-xs font-mono text-white/70">{formatTime(currentTime)}</span>
                                    <span className="text-[10px] sm:text-xs font-mono text-white/70">{formatTime(duration)}</span>
                                  </div>
                                  <div className="relative h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer">
                                    <input 
                                      type="range"
                                      min="0"
                                      max={duration || 0}
                                      step="0.1"
                                      value={currentTime}
                                      onChange={handleSeekChange}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div 
                                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-100"
                                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                                    />
                                    <div 
                                      className="absolute top-0 h-full w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-100"
                                      style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 sm:gap-6">
                                    <button 
                                      onClick={handlePlayPause}
                                      className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all text-white backdrop-blur-md"
                                    >
                                      {isPlaying ? (
                                        <Pause size={24} fill="currentColor" />
                                      ) : (
                                        <Play size={24} fill="currentColor" className="ml-1" />
                                      )}
                                    </button>

                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => handleSeek(-10)}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                                        title="Voltar 10s"
                                      >
                                        <RotateCcw size={20} />
                                      </button>
                                      
                                      <button 
                                        onClick={() => handleSeek(10)}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                                        title="Avançar 10s"
                                      >
                                        <RotateCw size={20} />
                                      </button>
                                    </div>

                                    <div className="hidden sm:flex items-center gap-1.5 ml-4 p-1 bg-white/5 rounded-xl border border-white/10">
                                      {[1, 1.25, 1.5, 2].map(rate => (
                                        <button
                                          key={rate}
                                          onClick={() => handleRateChange(rate)}
                                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                            playbackRate === rate 
                                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                              : 'text-white/40 hover:text-white hover:bg-white/10'
                                          }`}
                                        >
                                          {rate}x
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    <button 
                                      onClick={() => {
                                        if (videoRef.current) {
                                          if (videoRef.current.requestFullscreen) {
                                            videoRef.current.requestFullscreen();
                                          }
                                        }
                                      }}
                                      className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
                                      title="Tela Cheia"
                                    >
                                      <Maximize size={20} />
                                    </button>
                                    <a 
                                      href={videoSrc || '#'}
                                      download={`${course.title}.mp4`}
                                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                                      title="Baixar Vídeo"
                                    >
                                      <Download size={16} />
                                      <span className="hidden sm:inline">Baixar</span>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <iframe 
                              src={videoSrc} 
                              className="w-full h-full border-0 aspect-video"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="Vídeo Aula"
                            ></iframe>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Material de Apoio (PDF) - Visível apenas quando tab === 'pdf' */}
                    {pdfSrc && currentTab === 'pdf' && (
                      <div className="p-6 sm:p-12 bg-slate-50">
                        <div className="max-w-4xl mx-auto">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                                <FileText size={24} />
                              </div>
                              <div>
                                <h4 className="text-xl font-bold text-slate-900">Material de Apoio</h4>
                                <p className="text-sm text-slate-500">Documentação técnica e guias em PDF.</p>
                              </div>
                            </div>
                            <a 
                              href={pdfSrc} 
                              download={`${course.title}.pdf`}
                              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100/50"
                            >
                              <Download size={18} />
                              Baixar Manual
                            </a>
                          </div>

                          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                            <iframe 
                              src={pdfSrc} 
                              className="w-full min-h-[800px] border-0"
                              title="Material PDF"
                            ></iframe>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-white border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={onPrev}
                  disabled={!onPrev}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold transition-all border text-sm ${
                    onPrev 
                      ? 'text-[#3B82F6] border-blue-200 bg-white hover:bg-blue-50 hover:border-blue-300' 
                      : 'text-slate-300 border-slate-100 bg-slate-50 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft size={18} />
                  Anterior
                </button>
                <button 
                  onClick={onNext}
                  disabled={!onNext}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold transition-all text-sm ${
                    onNext 
                      ? 'bg-[#3B82F6] text-white hover:bg-[#2563EB] shadow-lg shadow-[#3B82F6]/20' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Próximo
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="hidden lg:flex items-center gap-4 text-slate-400 text-sm">
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart size={16} />
                  <span>{course.difficulty}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {currentTab === 'video' && pdfSrc && (
                  <button 
                    onClick={() => setCurrentTab('pdf')}
                    className="flex-1 sm:flex-none px-4 py-3 rounded-xl font-bold transition-all border border-emerald-100 text-emerald-600 hover:bg-emerald-50 text-xs flex items-center gap-2"
                  >
                    <FileText size={14} />
                    Ver Material PDF
                  </button>
                )}
                {currentTab === 'pdf' && videoSrc && (
                  <button 
                    onClick={() => setCurrentTab('video')}
                    className="flex-1 sm:flex-none px-4 py-3 rounded-xl font-bold transition-all border border-blue-100 text-[#3B82F6] hover:bg-blue-50 text-xs flex items-center gap-2"
                  >
                    <Play size={14} />
                    Assistir Vídeo Aula
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
