import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { List, useListRef } from 'react-window';
import type { CSSProperties } from 'react';
import { PaperSheet } from './components/PaperSheet';
import { FALLBACK_SOLUTIONS } from './constants';
import { 
  RotateCcw, Scan, Eye, Pen, Minus, Plus, Upload, FileText, Loader2, 
  ArrowLeft, Sparkles, ChevronLeft, ChevronRight, ChevronDown, Search, ZoomIn, ZoomOut, 
  Keyboard, X, Menu, User, LayoutDashboard, Sliders, CircleHelp, FolderUp, TypeOutline, 
  Layers2, CheckCircle2, History, Bolt, BarChart2, ArrowDownToLine, Wand, ImageIcon, Hash, FileDigit, BrainCircuit,
  PanelLeft, Grid3X3, ScanText, FileOutput, Pencil, Brain
} from 'lucide-react';
import { AppState, UploadedFile, QuestionSolution, PreviewData, ExtractionStats, LinePlan, WritingPlan, PagePlan } from './types';
import { extractPreviewData, processPreviewToSolutions, terminateWorker, OCRProgress } from './services/ocrService';

import { ScanningAnimation } from './components/ScanningAnimation';
import { AIPlannerDemo } from './components/AIPlannerDemo';
import { EditorToolbar } from './components/EditorToolbar';

// Processing modes for document handling
type ProcessingMode = 'ai_planning' | 'direct_ocr';

const COLORS = {
  bgDark: '#0F0F12', // Deep charcoal
  bgCard: '#18181B', // Zinc dark
  bgInput: '#1F1F24',
  border: '#27272A',
  primaryGreen: '#71717A', // Neutral zinc accent
  primaryGreenBright: '#A1A1AA',
  accentBlue: '#52525B', // Muted slate
  accentTeal: '#3F3F46',
  textPrimary: '#FAFAFA',
  textSecondary: '#71717A',
  danger: '#DC2626',
  success: '#16A34A',
  accent: '#E4E4E7', // Light accent for highlights
  cardHover: '#1C1C21',
};

const HANDWRITING_STYLES = {
  cursive: {
    name: 'Cursive',
    description: 'Connected flowing letters',
    fontFamily: "'Dancing Script', 'Satisfy', cursive",
    letterSpacing: '-0.5px',
    slantBias: -3,
  },
  semiCursive: {
    name: 'Semi-Cursive',
    description: 'Partially connected, natural',
    fontFamily: "'Kalam', 'Caveat', cursive",
    letterSpacing: '0.2px',
    slantBias: -1.5,
  },
  casual: {
    name: 'Casual',
    description: 'Relaxed print style',
    fontFamily: "'Caveat', 'Patrick Hand', cursive",
    letterSpacing: '0.5px',
    slantBias: -0.5,
  },
  messy: {
    name: 'Messy',
    description: 'Quick rushed writing',
    fontFamily: "'Indie Flower', 'Gloria Hallelujah', cursive",
    letterSpacing: '0.8px',
    slantBias: -2,
  },
  neat: {
    name: 'Neat Print',
    description: 'Clean separate letters',
    fontFamily: "'Patrick Hand', 'Shadows Into Light', cursive",
    letterSpacing: '1px',
    slantBias: 0,
  },
} as const;

type HandwritingStyle = keyof typeof HANDWRITING_STYLES;

const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

const randomRange = (seed: number, min: number, max: number) => {
  return min + seededRandom(seed) * (max - min);
};

const gaussianRandom = (seed: number, mean: number = 0, stdDev: number = 1) => {
  const u1 = seededRandom(seed);
  const u2 = seededRandom(seed + 1);
  const z = Math.sqrt(-2 * Math.log(u1 + 0.001)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
};

interface CharStyle {
  rotation: number;     
  yOffset: number;      
  scale: number;        
  skew: number;        
  opacity: number;      
  marginRight: number;
  strokeWidth: number;
  fontFamily: string;
}

const getFontForType = (char: string, seed: number) => {
  const isNumber = /[0-9]/.test(char);
  const isSymbol = /[=+\-×÷∝]/.test(char);
  if (isNumber || isSymbol) return seededRandom(seed) < 0.6 ? 'Caveat' : 'Shadows Into Light';
  return seededRandom(seed) < 0.70 ? 'Cedarville Cursive' : 'Caveat'; 
};

const generateCharStyle = (char: string, seed: number, baseThickness: number, variation: number = 1): CharStyle => {
  const isMath = /[0-9=+\-×÷∝]/.test(char);
  const v = variation; // Variation multiplier (0-1)
  return {
    rotation: randomRange(seed, -0.6, 0.6) * v,         
    yOffset: randomRange(seed + 1, -0.15, 0.15) * v,      
    scale: 1 + (randomRange(seed + 2, -0.02, 0.02) * v),       
    skew: isMath ? randomRange(seed + 3, -0.3, 0.3) * v : -2 * v + randomRange(seed + 3, -0.5, 0.5) * v,  
    opacity: 1 - (randomRange(seed + 4, 0, 0.1) * v),     
    marginRight: randomRange(seed + 5, -0.15, 0.15) * v,  
    strokeWidth: baseThickness + randomRange(seed + 6, -0.02, 0.02) * v,     
    fontFamily: getFontForType(char, seed + 7),
  };
};

const HandwrittenChar: React.FC<{ char: string; seed: number; isMath?: boolean; thickness: number; delayIndex: number; textColor?: string; variation?: number; wordSpacing?: number }> = ({ char, seed, isMath = false, thickness, delayIndex, textColor = '#0a2472', variation = 1, wordSpacing = 4 }) => {
  const style = useMemo(() => generateCharStyle(char, seed, thickness, variation), [char, seed, thickness, variation]);
  if (char === ' ') return <span className="inline-block" style={{ width: `${wordSpacing}px` }}></span>;
  const delay = Math.min(delayIndex * 15, 3000);

  return (
    <span 
      className="inline-block relative select-none"
      style={{
        '--target-opacity': style.opacity,
        '--target-y': `${style.yOffset}px`,
        '--target-scale': style.scale,
        '--target-rot': `${style.rotation}deg`,
        marginRight: `${style.marginRight}px`,
        fontFamily: style.fontFamily,
        fontWeight: isMath || style.strokeWidth > 0.6 ? 500 : 400,
        color: textColor, 
        fontSize: isMath ? '1.1em' : '1em',
        filter: 'contrast(1.1)',
        animation: `writeIn 0.25s ease-out forwards`,
        animationDelay: `${delay}ms`,
        opacity: 0,
      } as React.CSSProperties}
    >
      {char}
    </span>
  );
};

const HandwrittenLineSVG: React.FC<{ width: string; seed: number; thickness: number; textColor?: string }> = ({ width, seed, thickness, textColor = '#0a2472' }) => {
  const yStart = 2;
  const yEnd = 2 + randomRange(seed, -0.5, 0.5);
  const midPointX = 50 + randomRange(seed + 1, -10, 10);
  const midPointY = 2 + randomRange(seed + 2, -1, 1);

  return (
    <div className="w-full h-[6px] relative overflow-visible" style={{ width }}>
      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 5">
        <path 
          d={`M0,${yStart} Q${midPointX},${midPointY} 100,${yEnd}`} 
          stroke={textColor} 
          strokeWidth={thickness * 1.5} 
          fill="none" 
          opacity="0.85" 
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

const PencilText: React.FC<{ x: number; y: number; text: string; seed: number; fontSize?: number }> = ({ x, y, text, seed, fontSize = 14 }) => (
  <text x={x} y={y} fontFamily="'Shadows Into Light', cursive" fontSize={fontSize} fill="#2d2d2d" transform={`rotate(${randomRange(seed, -2, 2)}, ${x}, ${y})`} style={{ letterSpacing: '0.5px' }}>{text}</text>
);

const HandwrittenDiagram: React.FC<{ type: string; seed: number }> = ({ type, seed }) => (
  <div className="w-full my-6 flex justify-center">
    <div className="relative p-2 w-full flex justify-center" style={{ transform: `rotate(${randomRange(seed, -1.5, 1.5)}deg)` }}>
      <svg width="100%" height="auto" viewBox="0 0 350 180" className="overflow-visible max-w-2xl" style={{ minHeight: "180px" }}>
        <rect x="20" y="20" width="310" height="140" fill="none" stroke="#2d2d2d" strokeWidth="1" strokeDasharray="5,5" />
        <PencilText x={175} y={90} text={`[Diagram: ${type}]`} seed={seed} fontSize={16} />
        <PencilText x={175} y={115} text="(Refer to textbook)" seed={seed + 1} fontSize={12} />
      </svg>
    </div>
  </div>
);

const HandwrittenStrike: React.FC<{ content: string; seed: number; thickness: number; delayIndex: number; variation?: number; wordSpacing?: number; textColor?: string }> = ({ content, seed, thickness, delayIndex, variation = 1, wordSpacing = 4, textColor = '#0a2472' }) => (
  <div className="relative inline-block" style={{ marginLeft: `${wordSpacing * 0.25}px`, marginRight: `${wordSpacing * 0.25}px` }}>
    <span className="opacity-80">
      {content.split('').map((c, i) => <HandwrittenChar key={i} char={c} seed={seed + i} thickness={thickness} delayIndex={delayIndex + i} variation={variation} wordSpacing={wordSpacing} textColor={textColor} />)}
    </span>
    <svg className="absolute inset-0 w-[110%] h-full -left-[5%] pointer-events-none overflow-visible">
      <line x1="0" y1="60%" x2="100%" y2="40%" stroke={textColor} strokeWidth={thickness * 1.8} opacity="0.9" strokeLinecap="round" transform={`rotate(${randomRange(seed, -2, 2) * variation})`} 
        style={{ animation: `writeIn 0.2s ease forwards`, animationDelay: `${(delayIndex + content.length) * 30}ms`, opacity: 0 }}
      />
    </svg>
  </div>
);

const HandwrittenFraction: React.FC<{ num: string; den: string; seed: number; thickness: number; delayIndex: number; variation?: number; wordSpacing?: number; textColor?: string }> = ({ num, den, seed, thickness, delayIndex, variation = 1, wordSpacing = 4, textColor = '#0a2472' }) => (
  <div className="inline-flex flex-col items-center align-middle -my-4 align-baseline relative top-3" style={{ marginLeft: `${wordSpacing * 0.5}px`, marginRight: `${wordSpacing * 0.5}px` }}>
    <div className="mb-0.5 text-[0.95em]">
      {num.split('').map((c, i) => <HandwrittenChar key={i} char={c} seed={seed + i} isMath thickness={thickness} delayIndex={delayIndex + i} variation={variation} wordSpacing={wordSpacing} textColor={textColor} />)}
    </div>
    <HandwrittenLineSVG width="100%" seed={seed + 50} thickness={thickness} textColor={textColor} />
    <div className="mt-0.5 text-[0.95em]">
      {den.split('').map((c, i) => <HandwrittenChar key={i} char={c} seed={seed + 100 + i} isMath thickness={thickness} delayIndex={delayIndex + num.length + i} variation={variation} wordSpacing={wordSpacing} textColor={textColor} />)}
    </div>
  </div>
);

const HandwrittenSqrt: React.FC<{ content: string; seed: number; thickness: number; delayIndex: number; variation?: number; wordSpacing?: number; textColor?: string }> = ({ content, seed, thickness, delayIndex, variation = 1, wordSpacing = 4, textColor = '#0a2472' }) => (
  <div className="inline-flex items-center relative" style={{ marginLeft: `${wordSpacing * 0.25}px`, marginRight: `${wordSpacing * 0.25}px` }}>
    <span className="text-2xl font-[Caveat] relative -top-0.5 mr-0.5" style={{ fontWeight: thickness > 0.6 ? 700 : 400, color: textColor }}>√</span>
    <div className="flex flex-col">
      <HandwrittenLineSVG width="100%" seed={seed + 99} thickness={thickness} textColor={textColor} />
      <span className="pt-0.5 pb-1 px-1">
        {content.split(' ').map((word, i) => (
          <span key={i} className="inline-block whitespace-nowrap">
            {word.split('').map((char, j) => <HandwrittenChar key={j} char={char} seed={seed + 200 + i*10 + j} isMath thickness={thickness} delayIndex={delayIndex + i*5 + j} variation={variation} wordSpacing={wordSpacing} textColor={textColor} />)}
            <span style={{ width: `${wordSpacing}px`, display: 'inline-block' }}></span>
          </span>
        ))}
      </span>
    </div>
  </div>
);

const HandwrittenLineParser: React.FC<{ text: string; seed: number; thickness: number; globalDelayOffset: number; lineIndex?: number; textColor?: string; lineSpacing?: number; variation?: number; wordSpacing?: number; alignment?: 'left' | 'center' | 'right' }> = ({ text, seed, thickness, globalDelayOffset, lineIndex = 0, textColor = '#0a2472', lineSpacing = 2.4, variation = 1, wordSpacing = 4, alignment = 'left' }) => {
  const diagramMatch = text.trim().match(/^DIAGRAM\[(.*?)\]$/);
  const genAiMatch = text.trim().match(/^GENAI_IMAGE\[(.*?)\]$/); 
  if (diagramMatch) return <HandwrittenDiagram type={diagramMatch[1]} seed={seed} />;
  if (genAiMatch) return <HandwrittenDiagram type={`GENAI_IMAGE_${genAiMatch[1]}`} seed={seed} />;

  const parts: { type: string; content?: string; num?: string; den?: string }[] = [];
  let lastIndex = 0;
  const regex = /(FRAC\[(.*?)\|(.*?)\])|(SQRT\[(.*?)\])|(STRIKE\[(.*?)\])/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    if (match[1]) parts.push({ type: 'frac', num: match[2], den: match[3] });
    else if (match[4]) parts.push({ type: 'sqrt', content: match[5] });
    else if (match[6]) parts.push({ type: 'strike', content: match[7] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push({ type: 'text', content: text.substring(lastIndex) });

  let charIndexCounter = 0;
  return (
    <div className="flex flex-wrap items-baseline" style={{ lineHeight: `${lineSpacing}rem`, justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start' }}>
      {parts.map((part, pIdx) => {
        const startIdx = charIndexCounter;
        if (part.type === 'text') {
          const words = part.content!.split(' ');
          return words.map((word, wIdx) => {
            const wordEl = (
              <span key={`p-${pIdx}-w-${wIdx}`} className="inline-block whitespace-nowrap" style={{ marginRight: `${wordSpacing}px` }}>
                {word.split('').map((c, cIdx) => (
                  <HandwrittenChar key={cIdx} char={c} seed={seed + pIdx*100 + wIdx*10 + cIdx} thickness={thickness} delayIndex={globalDelayOffset + charIndexCounter++} textColor={textColor} variation={variation} wordSpacing={wordSpacing} />
                ))}
              </span>
            );
            charIndexCounter++;
            return wordEl;
          });
        }
        charIndexCounter += (part.num?.length || 0) + (part.den?.length || 0) + (part.content?.length || 0);
        if (part.type === 'frac') return <HandwrittenFraction key={pIdx} num={part.num!} den={part.den!} seed={seed + pIdx*200} thickness={thickness} delayIndex={globalDelayOffset + startIdx} variation={variation} wordSpacing={wordSpacing} textColor={textColor} />;
        if (part.type === 'sqrt') return <HandwrittenSqrt key={pIdx} content={part.content!} seed={seed + pIdx*300} thickness={thickness} delayIndex={globalDelayOffset + startIdx} variation={variation} wordSpacing={wordSpacing} textColor={textColor} />;
        if (part.type === 'strike') return <HandwrittenStrike key={pIdx} content={part.content!} seed={seed + pIdx*400} thickness={thickness} delayIndex={globalDelayOffset + startIdx} variation={variation} wordSpacing={wordSpacing} textColor={textColor} />;
        return null;
      })}
    </div>
  );
};

const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void; currentTool: string; onToolChange: (tool: string) => void; onShowDemo?: () => void }> = ({ isOpen, onClose, currentTool, onToolChange, onShowDemo }) => {
  const [history, setHistory] = useState<any[]>([]);
  
  useEffect(() => {
    const saved = localStorage.getItem('assignify_history');
    if (saved) setHistory(JSON.parse(saved));
  }, [isOpen]);

  const tools = [
    { id: 'handwriting', icon: Pencil, label: 'Generator' },
    { id: 'ai-demo', icon: Brain, label: 'AI Planning Demo' },
    { id: 'history', icon: History, label: 'Recent' },
    { id: 'settings', icon: Sliders, label: 'Settings' },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" 
            onClick={onClose} 
          />
        )}
      </AnimatePresence>
      
      <aside className={`fixed left-0 top-0 h-full w-72 z-50 transform transition-all duration-500 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto border-r`}
        style={{ backgroundColor: COLORS.bgCard, borderColor: COLORS.border }}
      >
        <div className="p-6 sm:p-8 border-b" style={{ borderColor: COLORS.border }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center" 
                 style={{ backgroundColor: COLORS.accent }}>
              <Pencil size={20} className="text-zinc-900" />
            </div>
            <div>
              <h1 className="font-semibold text-base sm:text-lg tracking-tight" style={{ color: COLORS.textPrimary }}>Assignify</h1>
              <p className="text-[10px] font-medium tracking-wide" style={{ color: COLORS.textSecondary }}>Professional Edition</p>
            </div>
          </div>
        </div>

        <nav className="p-4 sm:p-6 space-y-1">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => { 
                if (tool.id === 'ai-demo' && onShowDemo) {
                  onShowDemo();
                  onClose();
                } else {
                  onToolChange(tool.id); 
                  if(tool.id !== 'history') onClose(); 
                }
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${currentTool === tool.id ? '' : 'hover:bg-zinc-800/50'}`}
              style={{ 
                backgroundColor: currentTool === tool.id ? COLORS.cardHover : 'transparent',
                color: currentTool === tool.id ? COLORS.accent : COLORS.textSecondary,
                borderLeft: currentTool === tool.id ? `2px solid ${COLORS.accent}` : '2px solid transparent',
              }}
            >
              <div className="flex items-center gap-3">
                <tool.icon size={18} strokeWidth={1.5} />
                <span className="font-medium text-sm">{tool.label}</span>
              </div>
              {tool.id === 'history' && history.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/20 font-bold">
                  {history.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {currentTool === 'history' && (
          <div className="px-6 py-2 h-[400px] overflow-y-auto space-y-3 custom-scrollbar">
            <p className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-40 px-2">Recently Generated</p>
            {history.map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/20 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-10 rounded bg-white/10 flex items-center justify-center overflow-hidden">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <FileText size={14} className="opacity-40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: COLORS.textPrimary }}>{item.name}</p>
                    <p className="text-[10px] opacity-50" style={{ color: COLORS.textSecondary }}>
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="text-center py-8 opacity-40">
                <History className="mx-auto mb-2" size={28} strokeWidth={1.5} />
                <p className="text-xs font-medium">No history yet</p>
              </div>
            )}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 border-t" style={{ borderColor: COLORS.border }}>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: COLORS.bgDark }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" 
                 style={{ backgroundColor: COLORS.accent }}>
              <User size={18} className="text-zinc-900" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-medium text-sm" style={{ color: COLORS.textPrimary }}>Pro Account</p>
              <p className="text-[10px]" style={{ color: COLORS.textSecondary }}>Active</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

const Header: React.FC<{ onMenuClick: () => void; title: string }> = ({ onMenuClick, title }) => (
  <header className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 border-b" style={{ backgroundColor: COLORS.bgCard, borderColor: COLORS.border }}>
    <div className="flex items-center gap-3">
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg transition-colors" style={{ color: COLORS.textSecondary }}>
        <PanelLeft size={20} strokeWidth={1.5} />
      </button>
      <h2 className="text-base sm:text-lg font-medium" style={{ color: COLORS.textPrimary }}>{title}</h2>
    </div>
    <div className="flex items-center gap-2">
      <button className="p-2 rounded-lg transition-colors hover:bg-zinc-800/50" style={{ color: COLORS.textSecondary }}>
        <Sliders size={18} strokeWidth={1.5} />
      </button>
    </div>
  </header>
);

const UploadScreen: React.FC<{ 
  onUpload: (file: UploadedFile, mode: ProcessingMode) => void; 
  onShowDemo?: () => void 
}> = ({ onUpload, onShowDemo }) => {
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewText, setPreviewText] = useState('Type here to see handwriting preview...');
  const [showPreview, setShowPreview] = useState(true);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('ai_planning');

  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      setIsLoading(true);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onUpload({ name: file.name, type: file.type, data: e.target.result as string }, processingMode);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: COLORS.bgDark }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentTool="handwriting" onToolChange={() => {}} onShowDemo={onShowDemo} />
      
      <div className="flex-1 flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Handwriting Generator" />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-4xl mx-auto space-y-6"
          >
            <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 border" 
                 style={{ backgroundColor: COLORS.bgCard, borderColor: COLORS.border }}>
              <div className="flex items-center gap-4 mb-6 sm:mb-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center" 
                     style={{ backgroundColor: COLORS.accent }}>
                  <FolderUp size={24} className="text-zinc-900" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: COLORS.textPrimary }}>Upload Document</h3>
                  <p className="text-xs sm:text-sm" style={{ color: COLORS.textSecondary }}>PDF, Images, or scanned documents</p>
                </div>
              </div>

              {/* Processing Mode Selector */}
              <div className="mb-6">
                <p className="text-xs font-medium mb-3" style={{ color: COLORS.textSecondary }}>Select Processing Mode</p>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setProcessingMode('ai_planning')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      processingMode === 'ai_planning' ? 'border-emerald-500' : 'border-transparent'
                    }`}
                    style={{ 
                      backgroundColor: processingMode === 'ai_planning' ? 'rgba(16, 185, 129, 0.1)' : COLORS.bgDark,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        processingMode === 'ai_planning' ? 'bg-emerald-500/20' : ''
                      }`} style={{ backgroundColor: processingMode !== 'ai_planning' ? COLORS.bgCard : undefined }}>
                        <Brain size={16} className={processingMode === 'ai_planning' ? 'text-emerald-400' : ''} 
                               style={{ color: processingMode !== 'ai_planning' ? COLORS.textSecondary : undefined }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: processingMode === 'ai_planning' ? '#10b981' : COLORS.textPrimary }}>
                        AI Planning
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: COLORS.textSecondary }}>
                      AI structures and plans your content layout intelligently
                    </p>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setProcessingMode('direct_ocr')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      processingMode === 'direct_ocr' ? 'border-blue-500' : 'border-transparent'
                    }`}
                    style={{ 
                      backgroundColor: processingMode === 'direct_ocr' ? 'rgba(59, 130, 246, 0.1)' : COLORS.bgDark,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        processingMode === 'direct_ocr' ? 'bg-blue-500/20' : ''
                      }`} style={{ backgroundColor: processingMode !== 'direct_ocr' ? COLORS.bgCard : undefined }}>
                        <ScanText size={16} className={processingMode === 'direct_ocr' ? 'text-blue-400' : ''} 
                                  style={{ color: processingMode !== 'direct_ocr' ? COLORS.textSecondary : undefined }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: processingMode === 'direct_ocr' ? '#3b82f6' : COLORS.textPrimary }}>
                        Direct OCR
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: COLORS.textSecondary }}>
                      Extract exact structure from pre-formatted handwritten pages
                    </p>
                  </motion.button>
                </div>
              </div>

              <motion.div 
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => !isLoading && inputRef.current?.click()}
                className={`border border-dashed rounded-xl sm:rounded-2xl h-48 sm:h-64 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative group`}
                style={{ 
                  borderColor: dragActive ? COLORS.accent : COLORS.border,
                  backgroundColor: dragActive ? `${COLORS.accent}08` : COLORS.bgDark,
                }}
              >
                {isLoading ? (
                  <div className="text-center z-10">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center" 
                         style={{ backgroundColor: COLORS.bgCard }}>
                      <Loader2 className="animate-spin" size={32} style={{ color: COLORS.textSecondary }} strokeWidth={1.5} />
                    </div>
                    <p className="text-lg sm:text-xl font-medium mb-1" style={{ color: COLORS.textPrimary }}>Processing...</p>
                    <p className="text-xs" style={{ color: COLORS.textSecondary }}>Analyzing document</p>
                  </div>
                ) : (
                  <div className="text-center z-10 space-y-3 px-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl mx-auto flex items-center justify-center transition-transform group-hover:scale-105" 
                         style={{ backgroundColor: COLORS.bgCard }}>
                      <Upload size={24} style={{ color: COLORS.textSecondary }} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-base sm:text-lg font-medium" style={{ color: COLORS.textPrimary }}>
                        {dragActive ? 'Release to upload' : 'Drop files here'}
                      </p>
                      <p className="text-xs mt-1" style={{ color: COLORS.textSecondary }}>or click to browse</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center pt-2">
                      {['PDF', 'PNG', 'JPG'].map(tag => (
                        <span key={tag} className="px-2.5 py-1 rounded-md text-[10px] font-medium" style={{ backgroundColor: COLORS.bgCard, color: COLORS.textSecondary }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <input type="file" ref={inputRef} className="hidden" accept=".pdf,image/*" onChange={(e) => handleFiles(e.target.files)} />
              </motion.div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[
                { icon: ScanText, title: 'Smart OCR', desc: 'High accuracy text extraction' },
                { icon: Pencil, title: 'Natural Writing', desc: 'Realistic handwriting styles' },
                { icon: FileOutput, title: 'Export Ready', desc: 'Print-ready A4 format' },
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="rounded-xl p-4 sm:p-5 border transition-colors hover:border-zinc-600" 
                  style={{ backgroundColor: COLORS.bgCard, borderColor: COLORS.border }}
                >
                  <div className="w-10 h-10 rounded-lg mb-3 flex items-center justify-center" 
                       style={{ backgroundColor: COLORS.bgDark }}>
                    <item.icon size={18} style={{ color: COLORS.textSecondary }} strokeWidth={1.5} />
                  </div>
                  <h4 className="text-sm font-medium mb-1" style={{ color: COLORS.textPrimary }}>{item.title}</h4>
                  <p className="text-xs" style={{ color: COLORS.textSecondary }}>{item.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Live Handwriting Preview Section */}
            <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 border" 
                 style={{ backgroundColor: COLORS.bgCard, borderColor: COLORS.border }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
                       style={{ backgroundColor: COLORS.accent }}>
                    <Eye size={20} className="text-zinc-900" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: COLORS.textPrimary }}>Live Preview</h3>
                    <p className="text-xs" style={{ color: COLORS.textSecondary }}>Type text to see handwriting style</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPreview(!showPreview)}
                  className="p-2 rounded-lg transition-colors hover:bg-zinc-700/50"
                  style={{ color: COLORS.textSecondary }}
                >
                  {showPreview ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
              </div>

              {showPreview && (
                <div className="space-y-4">
                  {/* Text Input */}
                  <textarea
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    placeholder="Type your text here..."
                    className="w-full p-4 rounded-xl border resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                    style={{ 
                      backgroundColor: COLORS.bgDark, 
                      borderColor: COLORS.border,
                      color: COLORS.textPrimary,
                      minHeight: '100px'
                    }}
                  />

                  {/* Paper Preview */}
                  <div 
                    className="relative rounded-xl overflow-hidden shadow-lg"
                    style={{
                      backgroundColor: '#fffef8',
                      minHeight: '300px',
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    {/* Notebook lines */}
                    <div className="absolute inset-0 pointer-events-none"
                         style={{
                           backgroundImage: 'linear-gradient(to bottom, transparent 2.35rem, #8a96a8 2.35rem, #8a96a8 2.4rem, transparent 2.4rem)',
                           backgroundSize: '100% 2.4rem',
                           backgroundPosition: '0 1rem',
                           opacity: 0.5
                         }}
                    />
                    
                    {/* Red margin line */}
                    <div className="absolute top-0 bottom-0 left-16 w-[2px] bg-red-400/40" />

                    {/* Handwritten text */}
                    <div className="relative z-10 p-6 pl-20 pt-8">
                      {previewText.split('\n').map((line, lineIdx) => (
                        <div 
                          key={lineIdx}
                          style={{
                            fontFamily: "'Caveat', 'Shadows Into Light', cursive",
                            fontSize: '1.5rem',
                            color: '#0a2472',
                            lineHeight: '2.4rem',
                            letterSpacing: '0.5px',
                            transform: `rotate(${-0.3 + (lineIdx % 3) * 0.2}deg) skewX(${-1.5 + (lineIdx % 2) * 0.5}deg)`,
                            textShadow: '0.5px 0.5px 0px rgba(10, 36, 114, 0.25)',
                            paddingLeft: `${(lineIdx % 3) * 5}px`,
                          }}
                        >
                          {line || '\u00A0'}
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-center" style={{ color: COLORS.textSecondary }}>
                    This is how your handwritten text will appear. Upload a document to convert full pages.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

const PreviewScreen: React.FC<{ 
  file: UploadedFile; 
  hfApiKey?: string;
  onHfApiKeyChange?: (key: string) => void;
  onConvert: (preview: PreviewData) => void;
  onBack: () => void;
  onShowDemo?: () => void;
  processingMode: ProcessingMode;
}> = ({ file, hfApiKey = '', onHfApiKeyChange, onConvert, onBack, onShowDemo, processingMode }) => {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isExtracting, setIsExtracting] = useState(true);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractStatus, setExtractStatus] = useState('Loading document...');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showHfApiInput, setShowHfApiInput] = useState(false);
  const [localHfApiKey, setLocalHfApiKey] = useState(hfApiKey);

  useEffect(() => {
    const extract = async () => {
      try {
        // Pass HF API key for Florence-2 OCR
        const data = await extractPreviewData(file.data, file.type, (p) => {
          setExtractProgress(p.progress);
          setExtractStatus(p.status);
        });
        setPreviewData(data);
        setIsExtracting(false);
      } catch (e) {
        console.error('Extraction failed:', e);
        setExtractStatus('Extraction failed');
        setPreviewData({
          thumbnail: '',
          extractedText: ['Document content could not be fully extracted'],
          stats: { totalCharacters: 0, totalWords: 0, totalNumbers: 0, totalLines: 0, totalPages: 1, extractedImages: [] },
          rawPages: ['Document content']
        });
        setIsExtracting(false);
      }
    };
    extract();
  }, [file, localHfApiKey]);

  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: COLORS.bgDark }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentTool="handwriting" onToolChange={() => {}} onShowDemo={onShowDemo} />
      
      <div className="flex-1 flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Document Preview" />
        
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-zinc-800/50" style={{ color: COLORS.textSecondary }}>
              <ArrowLeft size={16} strokeWidth={1.5} /> Back
            </button>

            {isExtracting ? (
              <div className="rounded-xl sm:rounded-2xl p-6 sm:p-8" style={{ backgroundColor: COLORS.bgCard }}>
                <div className="text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto mb-4 sm:mb-6 flex items-center justify-center" style={{ backgroundColor: COLORS.bgDark }}>
                    <Loader2 className="animate-spin" size={32} style={{ color: COLORS.textSecondary }} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-medium mb-2" style={{ color: COLORS.textPrimary }}>Extracting Content</h3>
                  <p className="text-sm mb-4 sm:mb-6" style={{ color: COLORS.textSecondary }}>{extractStatus}</p>
                  
                  <div className="max-w-sm mx-auto">
                    <div className="flex justify-between text-xs mb-2">
                      <span style={{ color: COLORS.textSecondary }}>Progress</span>
                      <span className="font-medium" style={{ color: COLORS.textPrimary }}>{extractProgress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: COLORS.bgDark }}>
                      <div 
                        className="h-full transition-all duration-300 rounded-full"
                        style={{ width: `${extractProgress}%`, backgroundColor: COLORS.accent }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : previewData && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col items-center" style={{ backgroundColor: COLORS.bgCard }}>
                    <h4 className="text-xs font-medium mb-3" style={{ color: COLORS.textSecondary }}>Preview</h4>
                    {previewData.thumbnail ? (
                      <img 
                        src={previewData.thumbnail} 
                        alt="Document preview" 
                        className="w-full max-w-[160px] rounded-lg border"
                        style={{ borderColor: COLORS.border }}
                      />
                    ) : (
                      <div className="w-full max-w-[160px] h-[200px] rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS.bgDark }}>
                        <FileText size={32} style={{ color: COLORS.textSecondary }} strokeWidth={1.5} />
                      </div>
                    )}
                    <p className="mt-3 text-xs font-medium truncate max-w-full" style={{ color: COLORS.textPrimary }}>{file.name}</p>
                  </div>

                  <div className="lg:col-span-2 rounded-xl sm:rounded-2xl p-4 sm:p-6" style={{ backgroundColor: COLORS.bgCard }}>
                    <h4 className="text-xs font-medium mb-4" style={{ color: COLORS.textSecondary }}>Statistics</h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { icon: TypeOutline, label: 'Characters', value: formatNumber(previewData.stats.totalCharacters) },
                        { icon: FileText, label: 'Words', value: formatNumber(previewData.stats.totalWords) },
                        { icon: Hash, label: 'Numbers', value: formatNumber(previewData.stats.totalNumbers) },
                        { icon: Layers2, label: 'Pages', value: String(previewData.stats.totalPages) },
                      ].map((stat, i) => (
                        <div key={i} className="p-3 rounded-lg text-center" style={{ backgroundColor: COLORS.bgDark }}>
                          <stat.icon size={16} className="mx-auto mb-2" style={{ color: COLORS.textSecondary }} strokeWidth={1.5} />
                          <p className="text-lg font-medium" style={{ color: COLORS.textPrimary }}>{stat.value}</p>
                          <p className="text-[10px]" style={{ color: COLORS.textSecondary }}>{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {previewData.stats.extractedImages.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <ImageIcon size={14} style={{ color: COLORS.textSecondary }} strokeWidth={1.5} />
                          <span className="text-xs" style={{ color: COLORS.textSecondary }}>
                            {previewData.stats.extractedImages.length} image{previewData.stats.extractedImages.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {previewData.stats.extractedImages.slice(0, 5).map((img, i) => (
                            <img 
                              key={i} 
                              src={img.dataUrl} 
                              alt={`Extracted ${i + 1}`}
                              className="h-12 w-12 object-cover rounded-md border"
                              style={{ borderColor: COLORS.border }}
                            />
                          ))}
                          {previewData.stats.extractedImages.length > 5 && (
                            <div className="h-12 w-12 rounded-md flex items-center justify-center" style={{ backgroundColor: COLORS.bgDark }}>
                              <span className="text-xs" style={{ color: COLORS.textSecondary }}>
                                +{previewData.stats.extractedImages.length - 5}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6" style={{ backgroundColor: COLORS.bgCard }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: COLORS.textSecondary }}>Extracted Text</h4>
                  <div 
                    className="p-3 rounded-lg max-h-36 overflow-y-auto text-xs leading-relaxed"
                    style={{ backgroundColor: COLORS.bgDark, color: COLORS.textSecondary }}
                  >
                    {previewData.extractedText.slice(0, 3).map((text, i) => (
                      <p key={i} className="mb-2">{text.substring(0, 500)}{text.length > 500 ? '...' : ''}</p>
                    ))}
                    {previewData.extractedText.length > 3 && (
                      <p className="italic">... and {previewData.extractedText.length - 3} more pages</p>
                    )}
                  </div>
                </div>

                {/* Florence-2 (Hugging Face) - Primary OCR */}
                <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6" style={{ backgroundColor: COLORS.bgCard }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: COLORS.bgDark }}>
                        <ScanText size={18} style={{ color: localHfApiKey ? COLORS.success : COLORS.textSecondary }} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>Florence-2 OCR</h4>
                        <p className="text-[10px]" style={{ color: COLORS.textSecondary }}>
                          {localHfApiKey ? 'Enabled - Primary OCR' : 'Add Hugging Face Key'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowHfApiInput(!showHfApiInput)}
                      className="px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-zinc-700/50"
                      style={{ backgroundColor: COLORS.bgDark, color: COLORS.textSecondary }}
                    >
                      {showHfApiInput ? 'Hide' : localHfApiKey ? 'Edit' : 'Add Key'}
                    </button>
                  </div>
                  
                  {showHfApiInput && (
                    <div className="space-y-3">
                      <input
                        type="password"
                        value={localHfApiKey}
                        onChange={(e) => setLocalHfApiKey(e.target.value)}
                        placeholder="Enter Hugging Face API key (hf_...)..."
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border"
                        style={{ 
                          backgroundColor: COLORS.bgDark, 
                          color: COLORS.textPrimary,
                          borderColor: COLORS.border
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onHfApiKeyChange?.(localHfApiKey);
                            setShowHfApiInput(false);
                          }}
                          className="px-3 py-2 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: COLORS.success, color: '#fff' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setLocalHfApiKey('');
                            onHfApiKeyChange?.('');
                          }}
                          className="px-3 py-2 rounded-lg text-xs"
                          style={{ backgroundColor: COLORS.bgDark, color: COLORS.textSecondary }}
                        >
                          Clear
                        </button>
                      </div>
                      <p className="text-xs" style={{ color: COLORS.textSecondary }}>
                        Get your free API key from <a href="https://huggingface.co/settings/tokens" target="_blank" className="underline" style={{ color: COLORS.accentBlue }}>Hugging Face Settings</a>
                      </p>
                    </div>
                  )}
                  
                  {!showHfApiInput && localHfApiKey && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {['Florence-2-large model', 'High accuracy OCR', 'Handwritten text', 'Multi-language'].map((feature, i) => (
                        <span key={i} className="px-2 py-1 rounded-full" 
                          style={{ backgroundColor: COLORS.bgDark, color: COLORS.success }}>
                          ✓ {feature}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mode Indicator */}
                <div className="flex items-center justify-center gap-2 mb-4 p-3 rounded-lg" 
                     style={{ backgroundColor: processingMode === 'ai_planning' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)' }}>
                  {processingMode === 'ai_planning' ? (
                    <>
                      <Brain size={16} className="text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">AI Planning Mode</span>
                    </>
                  ) : (
                    <>
                      <ScanText size={16} className="text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">Direct OCR Mode</span>
                    </>
                  )}
                </div>

                <button
                  onClick={() => onConvert(previewData)}
                  className="w-full py-3 sm:py-4 rounded-xl flex items-center justify-center gap-2 text-sm sm:text-base font-medium transition-all hover:opacity-90 active:scale-[0.99]"
                  style={{ 
                    backgroundColor: COLORS.accent,
                    color: COLORS.bgDark
                  }}
                >
                  <Wand size={18} strokeWidth={1.5} />
                  Convert to Handwriting
                </button>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

// AI Plan Block Preview Component
interface AIPlanBlockPreview {
  type: string;
  content: string;
  position: string;
}

const AIPlanPreviewCard: React.FC<{ blocks: AIPlanBlockPreview[]; totalBlocks: number }> = ({ blocks, totalBlocks }) => {
  const blockTypeIcons: Record<string, React.ReactNode> = {
    heading: <TypeOutline size={12} strokeWidth={1.5} />,
    subheading: <TypeOutline size={12} strokeWidth={1.5} />,
    numbered_point: <Hash size={12} strokeWidth={1.5} />,
    paragraph: <FileText size={12} strokeWidth={1.5} />,
    math_expression: <Hash size={12} strokeWidth={1.5} />,
    definition: <FileText size={12} strokeWidth={1.5} />,
    arrow_point: <FileText size={12} strokeWidth={1.5} />,
    bullet_point: <FileText size={12} strokeWidth={1.5} />,
  };
  
  const blockTypeColors: Record<string, string> = {
    heading: '#22c55e',
    subheading: '#3b82f6',
    numbered_point: '#f59e0b',
    paragraph: '#71717a',
    math_expression: '#a855f7',
    definition: '#06b6d4',
    arrow_point: '#ec4899',
    bullet_point: '#71717a',
  };

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
      {blocks.slice(0, 8).map((block, idx) => (
        <div 
          key={idx} 
          className="flex items-start gap-2 p-2 rounded-lg text-xs"
          style={{ backgroundColor: COLORS.bgDark }}
        >
          <div 
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: `${blockTypeColors[block.type] || '#71717a'}20`, color: blockTypeColors[block.type] || '#71717a' }}
          >
            {blockTypeIcons[block.type] || <FileText size={12} strokeWidth={1.5} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-medium capitalize" style={{ color: blockTypeColors[block.type] || COLORS.textSecondary }}>
                {block.type.replace('_', ' ')}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: COLORS.bgCard, color: COLORS.textSecondary }}>
                {block.position.replace('_', ' ')}
              </span>
            </div>
            <p className="truncate" style={{ color: COLORS.textSecondary }}>
              {block.content.substring(0, 60)}{block.content.length > 60 ? '...' : ''}
            </p>
          </div>
        </div>
      ))}
      {totalBlocks > 8 && (
        <div className="text-center text-[10px] py-1" style={{ color: COLORS.textSecondary }}>
          +{totalBlocks - 8} more blocks
        </div>
      )}
    </div>
  );
};

interface DetailedStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
  detail: string;
  progress: number;
  icon: React.ReactNode;
}

const ProcessingScreen: React.FC<{ 
  previewData: PreviewData | null;
  fileName: string;
  onComplete: (solutions: QuestionSolution[], writingPlan?: WritingPlan) => void;
  onShowDemo?: () => void;
  processingMode: ProcessingMode;
}> = ({ previewData, fileName, onComplete, onShowDemo, processingMode }) => {
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('Initializing');
  const [currentPhase, setCurrentPhase] = useState<'scanning' | 'planning' | 'writing'>('scanning');
  const [currentScanPage, setCurrentScanPage] = useState(1);
  const [stats, setStats] = useState({ letters: 0, speed: 0, pages: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiPlanStatus, setAiPlanStatus] = useState('');
  const [writingPlan, setWritingPlan] = useState<WritingPlan | null>(null);
  const [aiPlanBlocks, setAiPlanBlocks] = useState<AIPlanBlockPreview[]>([]);
  const [aiPlanStats, setAiPlanStats] = useState({ headings: 0, paragraphs: 0, numbered: 0, total: 0 });
  
  const [detailedSteps, setDetailedSteps] = useState<DetailedStep[]>(
    processingMode === 'ai_planning' 
      ? [
          { id: 'read', label: 'Reading Text', status: 'pending', detail: 'Waiting...', progress: 0, icon: <ScanText size={16} /> },
          { id: 'assemble', label: 'Assembling Content', status: 'pending', detail: 'Waiting...', progress: 0, icon: <Layers2 size={16} /> },
          { id: 'plan', label: 'AI Planning Layout', status: 'pending', detail: 'Waiting...', progress: 0, icon: <BrainCircuit size={16} /> },
          { id: 'render', label: 'Rendering on Paper', status: 'pending', detail: 'Waiting...', progress: 0, icon: <Pencil size={16} /> },
        ]
      : [
          { id: 'read', label: 'Reading Text', status: 'pending', detail: 'Waiting...', progress: 0, icon: <ScanText size={16} /> },
          { id: 'structure', label: 'Extracting Structure', status: 'pending', detail: 'Waiting...', progress: 0, icon: <Layers2 size={16} /> },
          { id: 'render', label: 'Rendering on Paper', status: 'pending', detail: 'Waiting...', progress: 0, icon: <Pencil size={16} /> },
        ]
  );
  
  const updateStep = (stepId: string, updates: Partial<DetailedStep>) => {
    setDetailedSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  useEffect(() => {
    if (!previewData) return;

    const processData = async () => {
      const totalChars = previewData.stats.totalCharacters;
      const totalPages = previewData.stats.totalPages;
      const totalWords = previewData.stats.totalWords;
      
      // Step 1: Reading Text
      setCurrentPhase('scanning');
      setProgress(5);
      setCurrentStatus('Reading document text...');
      updateStep('read', { status: 'active', detail: `Scanning ${totalPages} page(s)...`, progress: 0 });
      
      for (let page = 1; page <= Math.min(totalPages, 20); page++) {
        setCurrentScanPage(page);
        const pageProgress = Math.floor((page / totalPages) * 100);
        setProgress(5 + Math.floor((page / totalPages) * 15));
        updateStep('read', { 
          detail: `Page ${page}/${totalPages} - Found ${Math.floor(totalChars * page / totalPages)} characters`, 
          progress: pageProgress 
        });
        await new Promise(r => setTimeout(r, 150 + Math.random() * 100));
      }
      updateStep('read', { status: 'completed', detail: `${totalChars.toLocaleString()} chars, ${totalWords.toLocaleString()} words extracted`, progress: 100 });
      
      let solutions: QuestionSolution[] = [];
      
      if (processingMode === 'ai_planning') {
        // AI PLANNING MODE: Use AI to structure content
        
        // Step 2: Assembling Content
        setProgress(25);
        setCurrentStatus('Assembling content...');
        updateStep('assemble', { status: 'active', detail: 'Combining page content...', progress: 0 });
        await new Promise(r => setTimeout(r, 200));
        updateStep('assemble', { detail: `Merging ${totalPages} page(s) into unified text...`, progress: 30 });
        await new Promise(r => setTimeout(r, 200));
        updateStep('assemble', { detail: 'Detecting paragraphs and sections...', progress: 60 });
        await new Promise(r => setTimeout(r, 200));
        updateStep('assemble', { detail: 'Identifying headings and bullet points...', progress: 90 });
        await new Promise(r => setTimeout(r, 150));
        updateStep('assemble', { status: 'completed', detail: `${totalPages} page(s) assembled successfully`, progress: 100 });
        
        // Step 3: AI Planning Layout
        setCurrentPhase('planning');
        setProgress(30);
        setCurrentStatus('AI analyzing document structure...');
        setAiPlanStatus('AI planning layout...');
        updateStep('plan', { status: 'active', detail: 'Connecting to DeepSeek V3...', progress: 0 });
        
        // Pre-populate with document structure preview from raw text
        if (previewData.rawPages && previewData.rawPages.length > 0) {
          const previewBlocks: AIPlanBlockPreview[] = [];
          let headings = 0, paragraphs = 0, numbered = 0;
          
          previewData.rawPages.forEach((pageText, pageIdx) => {
            const lines = pageText.split('\n').filter(l => l.trim().length > 0);
            lines.slice(0, 5).forEach((line, lineIdx) => {
              const trimmed = line.trim();
              const isNumbered = /^[\d]+[.)\s]/.test(trimmed) || /^Q\d+/i.test(trimmed);
              const isHeading = lineIdx === 0 && trimmed.length < 60;
              
              previewBlocks.push({
                type: isNumbered ? 'numbered_point' : isHeading ? 'heading' : 'paragraph',
                content: trimmed.substring(0, 80),
                position: isNumbered ? 'left_margin' : isHeading ? 'top_center' : 'main_body'
              });
              
              if (isNumbered) numbered++;
              else if (isHeading) headings++;
              else paragraphs++;
            });
          });
          
          if (previewBlocks.length > 0) {
            setAiPlanBlocks(previewBlocks.slice(0, 12));
            setAiPlanStats({ headings, paragraphs, numbered, total: previewBlocks.length });
          }
        }
        
        try {
          updateStep('plan', { detail: 'Sending text to AI for analysis...', progress: 10 });
          
          solutions = await processPreviewToSolutions(previewData, (p) => {
            setProgress(30 + Math.floor(p.progress * 0.5));
            setCurrentStatus(p.status);
            setAiPlanStatus(p.status);
            
            // Update detailed step based on progress
            if (p.progress < 30) {
              updateStep('plan', { detail: 'AI reading document content...', progress: 20 + p.progress / 2 });
            } else if (p.progress < 60) {
              updateStep('plan', { detail: 'Detecting headings, paragraphs, lists...', progress: 35 + p.progress / 3 });
            } else if (p.progress < 90) {
              updateStep('plan', { detail: 'Creating layout structure...', progress: 55 + p.progress / 3 });
            } else {
              updateStep('plan', { detail: 'Finalizing page layout plan...', progress: 85 + p.progress / 10 });
            }
          });
          
          // Update AI plan preview with solution data
          if (solutions.length > 0) {
            const blocks: AIPlanBlockPreview[] = [];
            let headings = 0, paragraphs = 0, numbered = 0;
            
            solutions.forEach(sol => {
              if (sol.questionNumber) numbered++;
              if (sol.questionText) {
                blocks.push({
                  type: sol.questionNumber ? 'numbered_point' : 'heading',
                  content: sol.questionText,
                  position: sol.questionNumber ? 'left_margin' : 'top_center'
                });
                if (sol.questionNumber) numbered++; else headings++;
              }
              sol.steps.forEach(step => {
                blocks.push({
                  type: 'paragraph',
                  content: step,
                  position: 'main_body'
                });
                paragraphs++;
              });
            });
            
            setAiPlanBlocks(blocks);
            setAiPlanStats({ headings, paragraphs, numbered, total: blocks.length });
            updateStep('plan', { 
              status: 'completed', 
              detail: `${blocks.length} blocks planned (${headings} headings, ${paragraphs} paragraphs, ${numbered} numbered)`, 
              progress: 100 
            });
          }
        } catch (error) {
          console.error('AI planning failed:', error);
          updateStep('plan', { status: 'completed', detail: 'Using fallback structure', progress: 100 });
        }
      } else {
        // DIRECT OCR MODE: Extract structure directly from OCR text without AI
        
        // Step 2: Extracting Structure
        setProgress(30);
        setCurrentStatus('Extracting document structure...');
        updateStep('structure', { status: 'active', detail: 'Parsing OCR text structure...', progress: 0 });
        
        await new Promise(r => setTimeout(r, 200));
        updateStep('structure', { detail: 'Identifying questions and answers...', progress: 30 });
        await new Promise(r => setTimeout(r, 200));
        updateStep('structure', { detail: 'Detecting margins and labels (Q1, Ans, etc.)...', progress: 60 });
        await new Promise(r => setTimeout(r, 200));
        
        // Parse raw text directly into structured format
        if (previewData.rawPages && previewData.rawPages.length > 0) {
          const allText = previewData.rawPages.join('\n\n');
          const lines = allText.split('\n').filter(l => l.trim().length > 0);
          
          let currentQuestion: QuestionSolution | null = null;
          let questionCounter = 0;
          
          lines.forEach(line => {
            const trimmed = line.trim();
            
            // Detect question patterns: Q1., 1., (a), etc.
            const qMatch = trimmed.match(/^(Q\d+\.?|\d+\.|\([a-z]\))/i);
            if (qMatch) {
              // Save previous question
              if (currentQuestion) {
                solutions.push(currentQuestion);
              }
              questionCounter++;
              currentQuestion = {
                questionNumber: String(questionCounter),
                questionText: trimmed.substring(qMatch[0].length).trim() || `Question ${questionCounter}`,
                steps: []
              };
            } else if (trimmed.match(/^(Ans[:.]?|Sol[:.]?|Answer[:.]?)/i)) {
              // Answer line - add to current question
              const ansText = trimmed.replace(/^(Ans[:.]?|Sol[:.]?|Answer[:.]?)/i, '').trim();
              if (currentQuestion && ansText) {
                currentQuestion.steps.push(ansText);
              }
            } else if (currentQuestion) {
              // Regular content line
              if (trimmed.length > 5) {
                currentQuestion.steps.push(trimmed);
              }
            } else {
              // No current question - create one for stray content
              if (trimmed.length > 10) {
                if (!currentQuestion) {
                  currentQuestion = {
                    questionNumber: undefined,
                    questionText: '',
                    steps: []
                  };
                }
                currentQuestion.steps.push(trimmed);
              }
            }
          });
          
          // Add last question
          if (currentQuestion) {
            solutions.push(currentQuestion);
          }
          
          // If no structured content found, use fallback
          if (solutions.length === 0) {
            solutions = [{
              questionNumber: undefined,
              questionText: '',
              steps: lines.slice(0, 50)
            }];
          }
        }
        
        updateStep('structure', { 
          status: 'completed', 
          detail: `Extracted ${solutions.length} section(s) with ${solutions.reduce((acc, s) => acc + s.steps.length, 0)} lines`, 
          progress: 100 
        });
        setProgress(60);
      }
      
      try {
        
        // Step 4: Rendering on Paper
        setCurrentPhase('writing');
        setProgress(80);
        setCurrentStatus('Rendering handwriting');
        updateStep('render', { status: 'active', detail: 'Initializing handwriting engine...', progress: 0 });
        
        let currentLetters = 0;
        const charsPerTick = Math.max(100, Math.floor(totalChars / 15));
        
        const interval = setInterval(() => {
          currentLetters = Math.min(currentLetters + charsPerTick, totalChars);
          const speed = 150 + Math.floor(Math.random() * 100);
          const renderProgress = Math.floor((currentLetters / totalChars) * 70);
          setStats({ 
            letters: currentLetters, 
            speed, 
            pages: solutions.length 
          });
          updateStep('render', { 
            detail: `Writing ${currentLetters.toLocaleString()}/${totalChars.toLocaleString()} characters @ ${speed} chars/sec`, 
            progress: renderProgress 
          });
        }, 80);
        
        setStats(prev => ({ ...prev, pages: solutions.length }));
        
        await new Promise(r => setTimeout(r, 600));
        clearInterval(interval);
        setStats(prev => ({ ...prev, letters: totalChars, pages: solutions.length }));
        
        setProgress(90);
        setCurrentStatus('Applying micro-variations');
        updateStep('render', { detail: 'Adding pen pressure variations...', progress: 80 });
        await new Promise(r => setTimeout(r, 300));
        
        setProgress(95);
        setCurrentStatus('Adding ink effects');
        updateStep('render', { detail: 'Applying ink pooling and stroke effects...', progress: 95 });
        await new Promise(r => setTimeout(r, 200));
        
        setProgress(100);
        setCurrentStatus('Complete');
        updateStep('render', { status: 'completed', detail: `${solutions.length} page(s) rendered with handwriting`, progress: 100 });
        
        setTimeout(() => onComplete(solutions, writingPlan || undefined), 400);
      } catch (e) {
        console.error('Processing error:', e);
        setCurrentStatus('Using fallback mode');
        updateStep('plan', { status: 'completed', detail: 'Using fallback layout', progress: 100 });
        updateStep('render', { status: 'active', detail: 'Rendering with fallback...', progress: 50 });
        setTimeout(() => {
          updateStep('render', { status: 'completed', detail: 'Fallback rendering complete', progress: 100 });
          onComplete(FALLBACK_SOLUTIONS);
        }, 1000);
      }
    };
    
    const t = setTimeout(processData, 300);
    return () => clearTimeout(t);
  }, [previewData, onComplete, writingPlan]);

  const stages = [
    { label: 'Scanning', icon: Scan, done: currentPhase !== 'scanning', active: currentPhase === 'scanning' },
    { label: 'Planning', icon: BrainCircuit, done: currentPhase === 'writing', active: currentPhase === 'planning' },
    { label: 'Writing', icon: Pencil, done: progress >= 100, active: currentPhase === 'writing' },
  ];

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: COLORS.bgDark }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentTool="handwriting" onToolChange={() => {}} onShowDemo={onShowDemo} />
      
      <div className="flex-1 flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Processing Document" />
        
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6" style={{ backgroundColor: COLORS.bgCard }}>
                {currentPhase === 'scanning' && previewData && (
                  <ScanningAnimation
                    totalPages={previewData.stats.totalPages}
                    currentPage={currentScanPage}
                    extractedText={previewData.extractedText}
                    pageImages={previewData.stats.extractedImages.map(img => img.dataUrl)}
                  />
                )}
                
                {currentPhase === 'planning' && (
                  <div className="py-4 sm:py-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" 
                        style={{ backgroundColor: COLORS.bgDark }}>
                        <BrainCircuit className="animate-pulse" size={20} style={{ color: '#22c55e' }} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>AI Planning Layout</h3>
                        <p className="text-[10px]" style={{ color: COLORS.textSecondary }}>{aiPlanStatus}</p>
                      </div>
                    </div>
                    
                    {aiPlanBlocks.length > 0 ? (
                      <>
                        <div className="flex gap-2 mb-3 flex-wrap">
                          {[
                            { label: 'Headings', value: aiPlanStats.headings, color: '#22c55e' },
                            { label: 'Questions', value: aiPlanStats.numbered, color: '#f59e0b' },
                            { label: 'Paragraphs', value: aiPlanStats.paragraphs, color: '#71717a' },
                          ].filter(s => s.value > 0).map((stat, i) => (
                            <div key={i} className="px-2 py-1 rounded-md flex items-center gap-1.5 text-[10px]"
                              style={{ backgroundColor: COLORS.bgDark }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />
                              <span style={{ color: COLORS.textSecondary }}>{stat.value} {stat.label}</span>
                            </div>
                          ))}
                        </div>
                        <AIPlanPreviewCard blocks={aiPlanBlocks} totalBlocks={aiPlanStats.total} />
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <Loader2 className="animate-spin mx-auto mb-2" size={24} style={{ color: COLORS.textSecondary }} strokeWidth={1.5} />
                        <p className="text-xs" style={{ color: COLORS.textSecondary }}>Analyzing document structure...</p>
                      </div>
                    )}
                  </div>
                )}
                
                {currentPhase === 'writing' && (
                  <div className="text-center py-6 sm:py-8">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl mx-auto mb-4 flex items-center justify-center" 
                      style={{ backgroundColor: COLORS.bgDark }}>
                      <Pen size={24} style={{ color: COLORS.textSecondary }} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-medium mb-2" style={{ color: COLORS.textPrimary }}>Writing</h3>
                    <p className="text-xs" style={{ color: COLORS.textSecondary }}>
                      Generating handwriting...
                    </p>
                    
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[
                        { label: 'Letters', value: stats.letters },
                        { label: 'Speed', value: `${stats.speed}/s` },
                        { label: 'Pages', value: stats.pages },
                      ].map((stat, i) => (
                        <div key={i} className="p-2 rounded-lg" style={{ backgroundColor: COLORS.bgDark }}>
                          <p className="text-base font-medium" style={{ color: COLORS.textPrimary }}>{stat.value}</p>
                          <p className="text-[10px]" style={{ color: COLORS.textSecondary }}>{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6" style={{ backgroundColor: COLORS.bgCard }}>
                <h4 className="text-xs font-medium mb-4" style={{ color: COLORS.textSecondary }}>Progress</h4>
                
                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: COLORS.textSecondary }}>{currentStatus}</span>
                    <span className="font-medium" style={{ color: COLORS.textPrimary }}>{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: COLORS.bgDark }}>
                    <div 
                      className="h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%`, backgroundColor: COLORS.accent }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {stages.map((stage, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg transition-all"
                      style={{ backgroundColor: stage.active ? COLORS.bgDark : 'transparent' }}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all`}
                        style={{ 
                          backgroundColor: stage.done ? COLORS.accent : COLORS.bgDark,
                        }}>
                        {stage.done ? (
                          <CheckCircle2 size={16} style={{ color: COLORS.bgDark }} strokeWidth={1.5} />
                        ) : stage.active ? (
                          <Loader2 size={16} className="animate-spin" style={{ color: COLORS.textSecondary }} strokeWidth={1.5} />
                        ) : (
                          <stage.icon size={16} style={{ color: COLORS.textSecondary }} strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: stage.done || stage.active ? COLORS.textPrimary : COLORS.textSecondary }}>
                          {stage.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: COLORS.bgDark }}>
                  <p className="text-xs mb-1 truncate" style={{ color: COLORS.textSecondary }}>{fileName}</p>
                  <div className="flex gap-3 text-[10px]">
                    <span style={{ color: COLORS.textSecondary }}>
                      {previewData?.stats.totalPages || 0} pages
                    </span>
                    <span style={{ color: COLORS.textSecondary }}>
                      {previewData?.stats.totalCharacters.toLocaleString() || 0} chars
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6" style={{ backgroundColor: COLORS.bgCard }}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={18} style={{ color: COLORS.accent }} />
                <h3 className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>Live Processing Status</h3>
              </div>
              
              <div className="space-y-3">
                {detailedSteps.map((step, idx) => (
                  <div 
                    key={step.id} 
                    className="p-3 rounded-lg transition-all border"
                    style={{ 
                      backgroundColor: step.status === 'active' ? COLORS.bgDark : 'transparent',
                      borderColor: step.status === 'active' ? COLORS.accent : step.status === 'completed' ? '#22c55e' : COLORS.border,
                      opacity: step.status === 'pending' ? 0.5 : 1
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ 
                          backgroundColor: step.status === 'completed' ? '#22c55e' : step.status === 'active' ? COLORS.accent : COLORS.bgDark
                        }}
                      >
                        {step.status === 'completed' ? (
                          <CheckCircle2 size={14} className="text-white" />
                        ) : step.status === 'active' ? (
                          <Loader2 size={14} className="animate-spin text-black" />
                        ) : (
                          <span className="text-xs font-bold" style={{ color: COLORS.textSecondary }}>{idx + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>{step.label}</span>
                          <span className="text-xs font-mono" style={{ color: step.status === 'completed' ? '#22c55e' : COLORS.textSecondary }}>
                            {step.progress}%
                          </span>
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: COLORS.textSecondary }}>{step.detail}</p>
                      </div>
                    </div>
                    
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: COLORS.bgDark }}>
                      <motion.div 
                        className="h-full rounded-full"
                        style={{ 
                          backgroundColor: step.status === 'completed' ? '#22c55e' : COLORS.accent,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${step.progress}%` }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: progress < 100 ? '#22c55e' : COLORS.accent }} />
                  <span className="text-xs" style={{ color: COLORS.textSecondary }}>
                    {progress < 100 ? 'Processing...' : 'Complete'}
                  </span>
                </div>
                <span className="text-xs font-mono" style={{ color: COLORS.accent }}>
                  {stats.letters > 0 && `${stats.letters.toLocaleString()} chars @ ${stats.speed} chars/sec`}
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

interface PageContentProps {
  solution: QuestionSolution;
  index: number;
  globalSeed: number;
  penThickness: number;
  handwritingStyle: HandwritingStyle;
  isScannerMode: boolean;
}

interface EditorSettings {
  fontSize: number;
  lineSpacing: number;
  wordSpacing: number;
  randomVariation: number;
  textColor: string;
  wordsPerLine: number;
  marginWordsPerLine: number;
  paragraphStyle: 'none' | 'dot' | 'digit' | 'letter';
  alignment: 'left' | 'center' | 'right';
}

const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 22,
  lineSpacing: 2.4,
  wordSpacing: 4,
  randomVariation: 0.6,
  textColor: '#0a2472',
  wordsPerLine: 10,
  marginWordsPerLine: 4,
  paragraphStyle: 'none',
  alignment: 'left',
};

interface PageContentProps2 extends PageContentProps {
  editorSettings?: EditorSettings;
  processingMode?: ProcessingMode;
}

const PageContent = memo(({ solution, index, globalSeed, penThickness, handwritingStyle, isScannerMode, editorSettings = DEFAULT_EDITOR_SETTINGS, processingMode = 'ai_planning' }: PageContentProps2) => {
  const LINE_HEIGHT_REM = editorSettings.lineSpacing;
  const MAX_LINES = 32;
  const seed = globalSeed + index * 1000;
  const styleConfig = HANDWRITING_STYLES[handwritingStyle];
  const variation = editorSettings.randomVariation;
  
  useEffect(() => {
    console.log('PageContent rendering:', {
      index,
      questionText: solution.questionText?.substring(0, 50),
      stepsCount: solution.steps.length,
      hasAIPlan: !!solution.pagePlan,
    });
  }, [solution, index]);

  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  const wrapTextToWords = (text: string, maxWords: number): string[] => {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const lines: string[] = [];
    for (let i = 0; i < words.length; i += maxWords) {
      lines.push(words.slice(i, i + maxWords).join(' '));
    }
    return lines.length > 0 ? lines : [''];
  };

  const parseContentLines = (): { lineIdx: number; marginLabel?: string; text: string; style: any; isMargin?: boolean }[] => {
    const result: { lineIdx: number; marginLabel?: string; text: string; style: any; isMargin?: boolean }[] = [];
    let currentLine = 0;
    
    if (solution.questionText && solution.questionText.length > 0) {
      const headingLabel = solution.questionNumber || '';
      const headingText = solution.questionText.replace(solution.questionNumber || '', '').trim();
      const wrappedHeading = wrapTextToWords(headingText, editorSettings.wordsPerLine);
      
      wrappedHeading.forEach((lineText, li) => {
        if (currentLine >= MAX_LINES) return;
        result.push({
          lineIdx: currentLine,
          marginLabel: li === 0 ? (headingLabel || undefined) : undefined,
          text: lineText,
          style: { 
            slant: -1.5 + seededRandom(seed + li) * 0.5 * variation, 
            pressure: 0.95, 
            drift: seededRandom(seed + 1 + li) * 2 * variation - variation,
            fatigue: 0,
            isHeading: li === 0
          }
        });
        currentLine++;
      });
    }
    
    const steps = solution.steps || [];
    
    steps.forEach((step, stepIdx) => {
      const rawLines = step.split(/\n|(?:  +)/g).filter(l => l.trim().length > 0);
      
      rawLines.forEach((line, lineInStep) => {
        if (currentLine >= MAX_LINES) return;
        
        let marginLabel: string | undefined;
        let cleanText = line.trim();
        let isMarginContent = false;
        
        // Only detect margin content in AI Planning mode
        // In Direct OCR mode, everything goes on main lines
        if (processingMode === 'ai_planning') {
          const labelMatch = cleanText.match(/^(Q\d+\.?|Ans[:.]?|\(\s*[a-z]\s*\)|[0-9]+\.|Sol[:.]?|Note[:.]?|Given[:.]?|→|•|-|\*)/i);
          
          if (labelMatch) {
            marginLabel = labelMatch[1].replace(/\s/g, '');
            cleanText = cleanText.substring(labelMatch[0].length).trim();
            isMarginContent = marginLabel.length > 0;
          }
        }
        
        const wordsLimit = isMarginContent ? editorSettings.marginWordsPerLine : editorSettings.wordsPerLine;
        const wrappedLines = wrapTextToWords(cleanText, wordsLimit);
        
        wrappedLines.forEach((wrappedText, wrapIdx) => {
          if (currentLine >= MAX_LINES) return;
          
          const fatigue = currentLine / MAX_LINES;
          const lineSeed = seed + currentLine * 100;
          const slant = (-2 + fatigue * 2.5 + (seededRandom(lineSeed) - 0.5) * 0.8) * variation;
          const pressure = 0.92 - fatigue * 0.18;
          // Drift only pushes right (positive), never into margin
          const drift = seededRandom(lineSeed + 1) * 2 * variation;
          
          result.push({
            lineIdx: currentLine,
            marginLabel: wrapIdx === 0 ? marginLabel : undefined,
            text: wrappedText,
            style: { slant, pressure, drift, fatigue, isHeading: false },
            isMargin: isMarginContent && wrapIdx === 0,
            stepIdx: stepIdx,
            isFirstLineOfStep: lineInStep === 0 && wrapIdx === 0
          });
          
          currentLine++;
        });
      });
    });
    
    return result;
  };
  
  const contentLines = parseContentLines();
  const marginLabels = contentLines
    .filter(l => l.marginLabel)
    .map(l => ({ lineIndex: l.lineIdx, label: l.marginLabel! }));

  return (
    <PaperSheet isScannerMode={isScannerMode} marginLabels={marginLabels} lineSpacing={editorSettings.lineSpacing}>
      <div className="relative" style={{ minHeight: '200mm' }}>
        {contentLines.map((item, idx) => {
          const baseFontSize = editorSettings.fontSize;
          const fontSize = item.style.isHeading 
            ? baseFontSize + 4 + (penThickness - 0.5) * 4
            : baseFontSize + (penThickness - 0.5) * 3;
          const opacity = 0.85 + item.style.pressure * 0.15;
          
          const slantWithStyle = item.style.slant + styleConfig.slantBias * variation;
          const topPos = item.lineIdx * LINE_HEIGHT_REM;
          
          // Generate paragraph number prefix based on style (only for first line of each step)
          let paragraphPrefix = '';
          if ((item as any).isFirstLineOfStep && editorSettings.paragraphStyle !== 'none') {
            const stepNum = ((item as any).stepIdx ?? 0) + 1;
            switch (editorSettings.paragraphStyle) {
              case 'dot': paragraphPrefix = '• '; break;
              case 'digit': paragraphPrefix = `${stepNum}. `; break;
              case 'letter': paragraphPrefix = `${String.fromCharCode(96 + (stepNum % 26 || 26))}) `; break;
              default: paragraphPrefix = '';
            }
          }
          
          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                top: `${topPos}rem`,
                left: 0,
                right: 0,
                height: `${LINE_HEIGHT_REM}rem`,
                fontFamily: styleConfig.fontFamily,
                fontSize: `${fontSize}px`,
                fontWeight: item.style.isHeading ? 600 : 400,
                color: editorSettings.textColor,
                opacity: opacity,
                lineHeight: `${LINE_HEIGHT_REM}rem`,
                transform: `rotate(${slantWithStyle * 0.3}deg) translateX(${item.style.drift}px) skewX(${slantWithStyle * 0.5}deg)`,
                letterSpacing: styleConfig.letterSpacing,
                textShadow: `0.4px 0.4px 0px rgba(10, 36, 114, ${0.15 * item.style.pressure})`,
                textDecoration: item.style.isHeading ? 'underline' : 'none',
                textDecorationColor: 'rgba(10, 36, 114, 0.3)',
                textUnderlineOffset: '3px',
                wordSpacing: `${editorSettings.wordSpacing}px`,
                textAlign: editorSettings.alignment,
              }}
            >
              <HandwrittenLineParser 
                text={paragraphPrefix + item.text} 
                seed={seed + item.lineIdx * 100} 
                thickness={penThickness}
                globalDelayOffset={idx * 20}
                lineIndex={item.lineIdx}
                textColor={editorSettings.textColor}
                lineSpacing={editorSettings.lineSpacing}
                variation={editorSettings.randomVariation}
                wordSpacing={editorSettings.wordSpacing}
                alignment={editorSettings.alignment}
              />
            </div>
          );
        })}
        
        {contentLines.length === 0 && (
          <div 
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: `${editorSettings.fontSize}px`,
              color: editorSettings.textColor,
              opacity: 0.6,
            }}
          >
            {solution.questionText || 'No content to display'}
          </div>
        )}
      </div>
    </PaperSheet>
  );
});

PageContent.displayName = 'PageContent';

interface VirtualizedRowCustomProps {
  filteredSolutions: QuestionSolution[];
  globalSeed: number;
  penThickness: number;
  handwritingStyle: HandwritingStyle;
  isScannerMode: boolean;
  editorSettings: EditorSettings;
  processingMode: ProcessingMode;
}

const VirtualizedRow = ({ 
  index, style, filteredSolutions, globalSeed, penThickness, handwritingStyle, isScannerMode, editorSettings, processingMode 
}: { index: number; style: CSSProperties; ariaAttributes?: Record<string, unknown>; } & VirtualizedRowCustomProps): React.ReactElement => {
  const sol = filteredSolutions[index];
  if (!sol) return <div style={style} className="paper-sheet-container" />;
  
  return (
    <div style={{ ...style, paddingTop: '32px', paddingBottom: '32px' }} className="paper-sheet-container">
      <PageContent solution={sol} index={index} globalSeed={globalSeed} penThickness={penThickness} handwritingStyle={handwritingStyle} isScannerMode={isScannerMode} editorSettings={editorSettings} processingMode={processingMode} />
    </div>
  );
};

const ITEM_HEIGHT = 1200;

const ResultsScreen: React.FC<{ solutions: QuestionSolution[], processingMode?: ProcessingMode, onReset: () => void; onShowDemo?: () => void }> = ({ solutions, processingMode = 'ai_planning', onReset, onShowDemo }) => {
  const [globalSeed, setGlobalSeed] = useState(Date.now()); 
  const [penThickness, setPenThickness] = useState(0.5);
  const [handwritingStyle, setHandwritingStyle] = useState<HandwritingStyle>('semiCursive');
  const [isScannerMode, setIsScannerMode] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(100);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [viewMode, setViewMode] = useState<'handwriting' | 'preview' | 'handwriting-virtual'>('handwriting');
  const listRef = useListRef(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(800);
  
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Derived paragraph style and alignment setters using editorSettings
  const paragraphStyle = editorSettings.paragraphStyle;
  const setParagraphStyle = (style: 'none' | 'dot' | 'digit' | 'letter') => setEditorSettings(prev => ({ ...prev, paragraphStyle: style }));
  const alignment = editorSettings.alignment;
  const setAlignment = (align: 'left' | 'center' | 'right') => setEditorSettings(prev => ({ ...prev, alignment: align }));

  const hasAIPlan = useMemo(() => solutions.some(sol => sol.linePlans?.length || sol.pagePlan), [solutions]);
  const aiPlannedPages = useMemo(() => solutions.filter(sol => sol.linePlans?.length || sol.pagePlan).length, [solutions]);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) setContainerHeight(window.innerHeight - 80);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const regenerate = () => setGlobalSeed(prev => prev + 1);
  const toggleScanner = () => setIsScannerMode(prev => !prev);

  const goToPage = useCallback((page: number) => {
    const targetPage = Math.max(0, Math.min(page, solutions.length - 1));
    setCurrentPage(targetPage);
    try { listRef.current?.scrollToRow({ index: targetPage, align: 'start' }); } catch (e) {}
  }, [solutions.length]);

  const handleDownload = (mode: 'clean' | 'scan') => {
    const originalMode = isScannerMode;
    if (mode === 'clean') setIsScannerMode(false);
    else setIsScannerMode(true);
    setTimeout(() => {
      window.print();
      if (mode === 'clean') setIsScannerMode(originalMode);
    }, 100);
  };

  const filteredSolutions = useMemo(() => {
    if (!searchQuery.trim()) return solutions;
    const query = searchQuery.toLowerCase();
    return solutions.filter(sol => 
      sol.questionText.toLowerCase().includes(query) ||
      sol.steps.some(step => step.toLowerCase().includes(query))
    );
  }, [solutions, searchQuery]);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f4f4f5' }}>
      <div className="fixed left-0 top-0 h-full w-64 z-50 hidden lg:block" style={{ backgroundColor: COLORS.bgCard }}>
        <Sidebar isOpen={true} onClose={() => {}} currentTool="handwriting" onToolChange={() => {}} onShowDemo={onShowDemo} />
      </div>

      <div className="flex-1 lg:ml-64 relative">
        <div className="sticky top-0 z-40 h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 border-b no-print" 
             style={{ backgroundColor: COLORS.bgCard, borderColor: COLORS.border }}>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg transition-colors" style={{ color: COLORS.textSecondary }}>
              <PanelLeft size={20} strokeWidth={1.5} />
            </button>
            <button onClick={onReset} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-zinc-800/50" 
                    style={{ color: COLORS.textSecondary }}>
              <ArrowLeft size={16} strokeWidth={1.5} /> <span className="hidden sm:inline">Back</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-lg" style={{ backgroundColor: COLORS.bgDark }}>
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0} 
                    className="p-1.5 sm:p-2 rounded-md disabled:opacity-30 transition-colors hover:bg-zinc-700/50" style={{ color: COLORS.textSecondary }}>
              <ChevronLeft size={16} strokeWidth={1.5} />
            </button>
            <div className="px-2 sm:px-3 py-1 flex items-center gap-1.5">
              <span className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>{currentPage + 1}</span>
              <span className="text-xs" style={{ color: COLORS.textSecondary }}>/ {solutions.length}</span>
            </div>
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === solutions.length - 1} 
                    className="p-1.5 sm:p-2 rounded-md disabled:opacity-30 transition-colors hover:bg-zinc-700/50" style={{ color: COLORS.textSecondary }}>
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {hasAIPlan && (
              <button 
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors hover:bg-zinc-700/50" 
                style={{ backgroundColor: showDebugPanel ? COLORS.accent : COLORS.bgDark }}
              >
                <BrainCircuit size={12} style={{ color: showDebugPanel ? COLORS.bgDark : COLORS.textSecondary }} strokeWidth={1.5} />
                <span className="text-[10px]" style={{ color: showDebugPanel ? COLORS.bgDark : COLORS.textSecondary }}>
                  AI ({aiPlannedPages})
                </span>
              </button>
            )}
            
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md" style={{ backgroundColor: COLORS.bgDark }}>
              <Search size={14} style={{ color: COLORS.textSecondary }} strokeWidth={1.5} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="bg-transparent outline-none w-24 text-xs"
                style={{ color: COLORS.textPrimary }}
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-0.5 p-1 rounded-md" style={{ backgroundColor: COLORS.bgDark }}>
              <button 
                onClick={() => setViewMode('handwriting')} 
                className={`px-2 py-1 rounded text-[10px] transition-colors ${viewMode === 'handwriting' ? 'font-medium' : ''}`}
                style={{ 
                  backgroundColor: viewMode === 'handwriting' ? COLORS.accent : 'transparent',
                  color: viewMode === 'handwriting' ? COLORS.bgDark : COLORS.textSecondary 
                }}
              >
                <Pen size={12} className="inline mr-1" />
                Writing
              </button>
              <button 
                onClick={() => setViewMode('preview')} 
                className={`px-2 py-1 rounded text-[10px] transition-colors ${viewMode === 'preview' ? 'font-medium' : ''}`}
                style={{ 
                  backgroundColor: viewMode === 'preview' ? COLORS.accent : 'transparent',
                  color: viewMode === 'preview' ? COLORS.bgDark : COLORS.textSecondary 
                }}
              >
                <Eye size={12} className="inline mr-1" />
                Preview
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-0.5 px-1.5 py-1 rounded-md" style={{ backgroundColor: COLORS.bgDark }}>
              <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1 rounded transition-colors hover:bg-zinc-700/50" style={{ color: COLORS.textSecondary }}>
                <ZoomOut size={14} strokeWidth={1.5} />
              </button>
              <span className="text-[10px] w-8 text-center" style={{ color: COLORS.textSecondary }}>{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(150, z + 10))} className="p-1 rounded transition-colors hover:bg-zinc-700/50" style={{ color: COLORS.textSecondary }}>
                <ZoomIn size={14} strokeWidth={1.5} />
              </button>
            </div>

            <button onClick={() => handleDownload('clean')} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors hover:bg-zinc-700/50" style={{ backgroundColor: COLORS.bgDark, color: COLORS.textSecondary }}>
              <FileText size={14} strokeWidth={1.5} /> Clean
            </button>
            
            <button onClick={() => handleDownload('scan')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: COLORS.accent, color: COLORS.bgDark }}>
              <Scan size={14} strokeWidth={1.5} /> <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* AI Debug Panel - Shows JSON structure of what AI generated */}
        <AnimatePresence>
          {showDebugPanel && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed top-16 right-4 w-96 max-h-[80vh] overflow-auto z-50 rounded-xl shadow-2xl border no-print"
              style={{ backgroundColor: COLORS.bgCard, borderColor: COLORS.border }}
            >
              <div className="sticky top-0 p-3 border-b flex items-center justify-between" style={{ backgroundColor: COLORS.bgCard, borderColor: COLORS.border }}>
                <div className="flex items-center gap-2">
                  <BrainCircuit size={16} style={{ color: COLORS.accent }} />
                  <span className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>AI Generated Structure</span>
                </div>
                <button onClick={() => setShowDebugPanel(false)} className="p-1 rounded hover:bg-zinc-700/50">
                  <X size={14} style={{ color: COLORS.textSecondary }} />
                </button>
              </div>
              <div className="p-3 space-y-3">
                <div className="text-xs" style={{ color: COLORS.textSecondary }}>
                  Page {currentPage + 1} of {solutions.length}
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: COLORS.textSecondary }}>Solution Data</div>
                  <pre className="text-[10px] p-3 rounded-lg overflow-auto max-h-64" style={{ backgroundColor: COLORS.bgDark, color: COLORS.textPrimary }}>
                    {JSON.stringify({
                      questionText: solutions[currentPage]?.questionText,
                      stepsCount: solutions[currentPage]?.steps.length,
                      hasLinePlans: !!solutions[currentPage]?.linePlans?.length,
                      hasPagePlan: !!solutions[currentPage]?.pagePlan
                    }, null, 2)}
                  </pre>
                </div>
                {solutions[currentPage]?.linePlans && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: COLORS.textSecondary }}>Line Plans ({solutions[currentPage]?.linePlans?.length || 0})</div>
                    <pre className="text-[10px] p-3 rounded-lg overflow-auto max-h-64" style={{ backgroundColor: COLORS.bgDark, color: COLORS.textPrimary }}>
                      {JSON.stringify(solutions[currentPage]?.linePlans?.slice(0, 5), null, 2)}
                    </pre>
                  </div>
                )}
                {solutions[currentPage]?.pagePlan && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: COLORS.textSecondary }}>Page Plan</div>
                    <pre className="text-[10px] p-3 rounded-lg overflow-auto max-h-64" style={{ backgroundColor: COLORS.bgDark, color: COLORS.textPrimary }}>
                      {JSON.stringify(solutions[currentPage]?.pagePlan, null, 2)}
                    </pre>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: COLORS.textSecondary }}>Content Preview (First 3 Steps)</div>
                  <div className="space-y-1">
                    {solutions[currentPage]?.steps.slice(0, 3).map((step, i) => (
                      <div key={i} className="text-[10px] p-2 rounded" style={{ backgroundColor: COLORS.bgDark, color: COLORS.textPrimary }}>
                        <span style={{ color: COLORS.accent }}>{i + 1}.</span> {step.slice(0, 100)}{step.length > 100 ? '...' : ''}
                      </div>
                    ))}
                    {(solutions[currentPage]?.steps.length || 0) > 3 && (
                      <div className="text-[10px] text-center py-1" style={{ color: COLORS.textSecondary }}>
                        ... and {(solutions[currentPage]?.steps.length || 0) - 3} more steps
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end gap-3 no-print">
          <AnimatePresence>
            {showTools && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="p-4 rounded-xl shadow-lg mb-2 border" 
                style={{ backgroundColor: COLORS.bgCard, borderColor: COLORS.border }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-medium mb-2 flex items-center gap-1.5" style={{ color: COLORS.textSecondary }}>
                      <Pen size={10} strokeWidth={1.5} /> Ink
                    </label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setPenThickness(p => Math.max(0.3, p - 0.1))} className="p-1.5 rounded-md transition-colors hover:bg-zinc-700/50" style={{ backgroundColor: COLORS.bgDark, color: COLORS.textSecondary }}>
                        <Minus size={12} strokeWidth={1.5} />
                      </button>
                      <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: COLORS.bgDark }}>
                        <motion.div 
                          className="h-full rounded-full" 
                          animate={{ width: `${((penThickness - 0.3) / 0.7) * 100}%` }}
                          style={{ backgroundColor: COLORS.accent }} 
                        />
                      </div>
                      <button onClick={() => setPenThickness(p => Math.min(1.0, p + 0.1))} className="p-1.5 rounded-md transition-colors hover:bg-zinc-700/50" style={{ backgroundColor: COLORS.bgDark, color: COLORS.textSecondary }}>
                        <Plus size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-medium mb-2 flex items-center gap-1.5" style={{ color: COLORS.textSecondary }}>
                      <Pencil size={10} strokeWidth={1.5} /> Writing Style
                    </label>
                    <div className="grid grid-cols-1 gap-1">
                      {(Object.keys(HANDWRITING_STYLES) as HandwritingStyle[]).map(styleKey => {
                        const styleInfo = HANDWRITING_STYLES[styleKey];
                        const isSelected = handwritingStyle === styleKey;
                        return (
                          <button 
                            key={styleKey}
                            onClick={() => setHandwritingStyle(styleKey)}
                            className="px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors text-left"
                            style={{ 
                              backgroundColor: isSelected ? COLORS.accent : COLORS.bgDark,
                              color: isSelected ? COLORS.bgDark : COLORS.textSecondary,
                            }}
                          >
                            <span className="block">{styleInfo.name}</span>
                            <span className="text-[8px] opacity-70">{styleInfo.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-medium mb-2 block" style={{ color: COLORS.textSecondary }}>
                       Ink Presets
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { name: 'Fine', thickness: 0.35 },
                        { name: 'Normal', thickness: 0.5 },
                        { name: 'Bold', thickness: 0.7 },
                        { name: 'Heavy', thickness: 0.9 }
                      ].map(preset => (
                        <button 
                          key={preset.name}
                          onClick={() => setPenThickness(preset.thickness)}
                          className="px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors"
                          style={{ 
                            backgroundColor: Math.abs(penThickness - preset.thickness) < 0.05 ? COLORS.accent : COLORS.bgDark,
                            color: Math.abs(penThickness - preset.thickness) < 0.05 ? COLORS.bgDark : COLORS.textSecondary,
                          }}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowTools(!showTools)} 
              className="p-3 sm:p-4 rounded-xl shadow-lg transition-all" 
              style={{ backgroundColor: showTools ? COLORS.accent : COLORS.bgCard, color: showTools ? COLORS.bgDark : COLORS.textSecondary }}
            >
              <Sliders size={18} strokeWidth={1.5} />
            </motion.button>
            
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={toggleScanner} 
              className="p-3 sm:p-4 rounded-xl shadow-lg transition-all" 
              style={{ backgroundColor: isScannerMode ? COLORS.accent : COLORS.bgCard, color: isScannerMode ? COLORS.bgDark : COLORS.textSecondary }}
            >
              {isScannerMode ? <Eye size={18} strokeWidth={1.5} /> : <Sparkles size={18} strokeWidth={1.5} />}
            </motion.button>
            
            <motion.button 
              whileTap={{ scale: 0.95, rotate: 180 }}
              onClick={regenerate} 
              className="p-3 sm:p-4 rounded-xl shadow-lg transition-all" 
              style={{ backgroundColor: COLORS.accent, color: COLORS.bgDark }}
            >
              <RotateCcw size={18} strokeWidth={1.5} />
            </motion.button>
          </div>
        </div>

        <div ref={containerRef} className="w-full flex flex-col items-center pt-4 sm:pt-8 pb-20 sm:pb-24 px-2 sm:px-4">
          {/* Debug: Show count of solutions */}
          <div className="mb-4 p-2 bg-green-600 text-white text-xs rounded">
            Rendering {filteredSolutions.length} page(s) | Mode: {viewMode} | Container: {containerHeight}px
          </div>
          
          {viewMode === 'handwriting' ? (
            /* Simple Direct Render - No Virtualization */
            <div className="transition-transform origin-top space-y-8 pb-24" style={{ transform: `scale(${zoom / 100})`, maxWidth: '21cm', margin: '0 auto' }}>
              {filteredSolutions.map((sol, index) => (
                <div key={index} className="paper-sheet-container">
                  <PageContent solution={sol} index={index} globalSeed={globalSeed} penThickness={penThickness} handwritingStyle={handwritingStyle} isScannerMode={isScannerMode} editorSettings={editorSettings} processingMode={processingMode} />
                </div>
              ))}
            </div>
          ) : viewMode === 'handwriting-virtual' ? (
            <div className="transition-transform origin-top" style={{ transform: `scale(${zoom / 100})` }}>
              <List<VirtualizedRowCustomProps>
                listRef={listRef}
                defaultHeight={containerHeight}
                rowCount={filteredSolutions.length}
                rowHeight={ITEM_HEIGHT}
                overscanCount={3}
                onRowsRendered={({ startIndex }) => {
                  if (startIndex !== currentPage) setCurrentPage(startIndex);
                }}
                style={{ maxWidth: '21cm', margin: '0 auto', height: containerHeight }}
                rowComponent={VirtualizedRow}
                rowProps={{ filteredSolutions, globalSeed, penThickness, handwritingStyle, isScannerMode, editorSettings, processingMode }}
              />
            </div>
          ) : (
            /* AI Plan Preview Mode */
            <div className="w-full max-w-4xl space-y-6">
              <div className="p-4 rounded-xl border" style={{ backgroundColor: COLORS.bgCard, borderColor: COLORS.border }}>
                <div className="flex items-center gap-2 mb-4">
                  <BrainCircuit size={20} style={{ color: COLORS.accent }} />
                  <h2 className="text-lg font-medium" style={{ color: COLORS.textPrimary }}>AI Plan Preview</h2>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: COLORS.bgDark, color: COLORS.textSecondary }}>
                    {solutions.length} page(s)
                  </span>
                </div>
                
                {solutions.map((sol, pageIdx) => (
                  <div key={pageIdx} className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: COLORS.bgDark, borderColor: COLORS.border }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: COLORS.accent, color: COLORS.bgDark }}>
                        Page {pageIdx + 1}
                      </span>
                      <span className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>{sol.questionText}</span>
                    </div>
                    
                    {/* Steps/Content */}
                    <div className="space-y-2 mb-4">
                      <div className="text-[10px] uppercase tracking-wide font-medium" style={{ color: COLORS.textSecondary }}>
                        Content ({sol.steps.length} lines)
                      </div>
                      <div className="space-y-1 max-h-48 overflow-auto">
                        {sol.steps.map((step, stepIdx) => (
                          <div key={stepIdx} className="flex gap-2 text-sm p-2 rounded" style={{ backgroundColor: COLORS.bgCard }}>
                            <span className="font-mono text-[10px] w-6 flex-shrink-0" style={{ color: COLORS.accent }}>{stepIdx + 1}</span>
                            <span style={{ color: COLORS.textPrimary }}>{step || '(empty line)'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Line Plans */}
                    {sol.linePlans && sol.linePlans.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <div className="text-[10px] uppercase tracking-wide font-medium" style={{ color: COLORS.textSecondary }}>
                          Line Plans ({sol.linePlans.length})
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {sol.linePlans.slice(0, 6).map((plan, planIdx) => (
                            <div key={planIdx} className="text-[10px] p-2 rounded" style={{ backgroundColor: COLORS.bgCard }}>
                              <div className="flex items-center gap-2 mb-1">
                                <span style={{ color: COLORS.accent }}>Line {planIdx + 1}</span>
                                {plan?.isHeading && <span className="px-1 rounded" style={{ backgroundColor: COLORS.accent, color: COLORS.bgDark }}>H</span>}
                                {plan?.isQuestionNumber && <span className="px-1 rounded" style={{ backgroundColor: '#f59e0b', color: COLORS.bgDark }}>Q</span>}
                              </div>
                              <div style={{ color: COLORS.textSecondary }}>
                                Indent: {plan?.indent || 0}px | Slant: {(plan?.slantAngle || 0).toFixed(1)}
                              </div>
                            </div>
                          ))}
                        </div>
                        {sol.linePlans.length > 6 && (
                          <div className="text-[10px] text-center py-1" style={{ color: COLORS.textSecondary }}>
                            + {sol.linePlans.length - 6} more line plans
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Page Plan */}
                    {sol.pagePlan && (
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-wide font-medium" style={{ color: COLORS.textSecondary }}>
                          Page Plan
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[10px]">
                          <div className="p-2 rounded" style={{ backgroundColor: COLORS.bgCard }}>
                            <div style={{ color: COLORS.textSecondary }}>Margins</div>
                            <div style={{ color: COLORS.textPrimary }}>L:{sol.pagePlan.marginLeft} R:{sol.pagePlan.marginRight} T:{sol.pagePlan.marginTop}</div>
                          </div>
                          <div className="p-2 rounded" style={{ backgroundColor: COLORS.bgCard }}>
                            <div style={{ color: COLORS.textSecondary }}>Line Spacing</div>
                            <div style={{ color: COLORS.textPrimary }}>{sol.pagePlan.lineSpacing}px</div>
                          </div>
                          <div className="p-2 rounded" style={{ backgroundColor: COLORS.bgCard }}>
                            <div style={{ color: COLORS.textSecondary }}>Slant</div>
                            <div style={{ color: COLORS.textPrimary }}>{sol.pagePlan.overallSlant?.toFixed(1) || 0}</div>
                          </div>
                          <div className="p-2 rounded" style={{ backgroundColor: COLORS.bgCard }}>
                            <div style={{ color: COLORS.textSecondary }}>Fatigue</div>
                            <div style={{ color: COLORS.textPrimary }}>{((sol.pagePlan.fatigueLevel || 0) * 100).toFixed(0)}%</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Raw JSON Toggle */}
                    <details className="mt-4">
                      <summary className="text-[10px] cursor-pointer" style={{ color: COLORS.textSecondary }}>Show Raw JSON</summary>
                      <pre className="mt-2 text-[9px] p-2 rounded overflow-auto max-h-48" style={{ backgroundColor: COLORS.bgCard, color: COLORS.textPrimary }}>
                        {JSON.stringify({ questionText: sol.questionText, steps: sol.steps, linePlans: sol.linePlans?.slice(0, 3), pagePlan: sol.pagePlan }, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Editor Toolbar - Fixed at bottom */}
        <EditorToolbar
          fontSize={editorSettings.fontSize}
          setFontSize={(size) => setEditorSettings(prev => ({ ...prev, fontSize: size }))}
          lineSpacing={editorSettings.lineSpacing}
          setLineSpacing={(spacing) => setEditorSettings(prev => ({ ...prev, lineSpacing: spacing }))}
          wordSpacing={editorSettings.wordSpacing}
          setWordSpacing={(spacing) => setEditorSettings(prev => ({ ...prev, wordSpacing: spacing }))}
          randomVariation={editorSettings.randomVariation}
          setRandomVariation={(variation) => setEditorSettings(prev => ({ ...prev, randomVariation: variation }))}
          textColor={editorSettings.textColor}
          setTextColor={(color) => setEditorSettings(prev => ({ ...prev, textColor: color }))}
          wordsPerLine={editorSettings.wordsPerLine}
          setWordsPerLine={(words) => setEditorSettings(prev => ({ ...prev, wordsPerLine: words }))}
          marginWordsPerLine={editorSettings.marginWordsPerLine}
          setMarginWordsPerLine={(words) => setEditorSettings(prev => ({ ...prev, marginWordsPerLine: words }))}
          paragraphStyle={paragraphStyle}
          setParagraphStyle={setParagraphStyle}
          alignment={alignment}
          setAlignment={setAlignment}
          isSelectionMode={isSelectionMode}
          setIsSelectionMode={setIsSelectionMode}
          onReset={() => {
            setEditorSettings(DEFAULT_EDITOR_SETTINGS);
            setGlobalSeed(Date.now());
          }}
          onExport={() => handleDownload('scan')}
          zoom={zoom / 100}
          setZoom={(z) => setZoom(Math.round(z * 100))}
        />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [appState, setAppState] = useState<AppState>('upload');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [solutions, setSolutions] = useState<QuestionSolution[]>([]);
  const [showDemo, setShowDemo] = useState(false);
  const [currentProcessingMode, setCurrentProcessingMode] = useState<ProcessingMode>('ai_planning');
  const [hfApiKey, setHfApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hf_api_key') || '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';
    }
    return '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';
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    return () => { terminateWorker(); };
  }, []);

  const handleHfApiKeyChange = (key: string) => {
    setHfApiKey(key);
    localStorage.setItem('hf_api_key', key);
  };

  if (!isClient) return null;

  if (showDemo) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDemo(false)}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </button>
        <AIPlannerDemo />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/*
        Handwriting renderer relies on `writeIn` animation.
        If keyframes are missing, every char stays at opacity: 0 → blank page.
      */}
      <style>{`
        @keyframes writeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      {appState === 'upload' && (
        <UploadScreen 
          onUpload={(file, mode) => {
            setUploadedFile(file);
            setCurrentProcessingMode(mode);
            setAppState('preview');
          }} 
          onShowDemo={() => setShowDemo(true)}
        />
      )}
      {appState === 'preview' && uploadedFile && (
        <PreviewScreen 
          file={uploadedFile} 
          hfApiKey={hfApiKey}
          onHfApiKeyChange={handleHfApiKeyChange}
          processingMode={currentProcessingMode}
          onConvert={(preview) => {
            setPreviewData(preview);
            setAppState('processing');
            try {
              const history = JSON.parse(localStorage.getItem('assignify_history') || '[]');
              const newEntry = {
                id: Date.now(),
                name: uploadedFile.name,
                date: new Date().toISOString(),
                stats: preview.stats,
                thumbnail: preview.thumbnail.slice(0, 500)
              };
              localStorage.setItem('assignify_history', JSON.stringify([newEntry, ...history].slice(0, 10)));
            } catch (e) {
              console.error('Failed to save history', e);
            }
          }}
          onBack={() => {
            setUploadedFile(null);
            setAppState('upload');
          }}
          onShowDemo={() => setShowDemo(true)}
        />
      )}
      {appState === 'processing' && (
        <ProcessingScreen 
          previewData={previewData} 
          fileName={uploadedFile?.name || 'Document'}
          processingMode={currentProcessingMode}
          onComplete={(sols) => {
            setSolutions(sols);
            setAppState('results');
          }}
          onShowDemo={() => setShowDemo(true)}
        />
      )}
      {appState === 'results' && (
        <ResultsScreen 
          solutions={solutions} 
          processingMode={currentProcessingMode}
          onReset={() => {
            setUploadedFile(null);
            setPreviewData(null);
            setSolutions([]);
            setAppState('upload');
          }}
          onShowDemo={() => setShowDemo(true)}
        />
      )}
    </div>
  );
};

export default App;
