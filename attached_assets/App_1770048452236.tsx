
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PaperSheet } from './components/PaperSheet';
import { FALLBACK_SOLUTIONS, AI_SYSTEM_PROMPT } from './constants';
import { RefreshCcw, Camera, Eye, PenTool, Minus, Plus, UploadCloud, FileText, Loader, ArrowLeft, Sparkles } from 'lucide-react';
import { AppState, UploadedFile, QuestionSolution } from './types';
import { GoogleGenAI } from "@google/genai";

// --- GENERATIVE AI INTEGRATION ---

const generateIllustrationWithGemini = async (prompt: string): Promise<string | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: { parts: [{ text: prompt }] },
          config: { 
             imageConfig: { imageSize: "1K", aspectRatio: "4:3" }
          }
        });
        
        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("GenAI Image Error:", error);
        return null;
    }
};

const solveWithGemini = async (fileData: string): Promise<QuestionSolution[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const base64Data = fileData.split(',')[1];
        const mimeType = fileData.split(';')[0].split(':')[1];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: base64Data } },
                    { text: AI_SYSTEM_PROMPT }
                ]
            },
            config: {
                responseMimeType: "application/json",
            }
        });

        let text = response.text;
        if (!text) throw new Error("No response from AI");
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        console.error("Solver Error:", e);
        return FALLBACK_SOLUTIONS;
    }
};

// --- HANDWRITING ENGINE ---

const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

const randomRange = (seed: number, min: number, max: number) => {
  return min + seededRandom(seed) * (max - min);
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

const generateCharStyle = (char: string, seed: number, baseThickness: number): CharStyle => {
  const isMath = /[0-9=+\-×÷∝]/.test(char);
  return {
    rotation: randomRange(seed, -0.6, 0.6),         
    yOffset: randomRange(seed + 1, -0.1, 0.1),      
    scale: randomRange(seed + 2, 0.99, 1.02),       
    skew: isMath ? randomRange(seed + 3, -0.3, 0.3) : -2 + randomRange(seed + 3, -0.5, 0.5),  
    opacity: randomRange(seed + 4, 0.9, 1.0),     
    marginRight: randomRange(seed + 5, -0.1, 0.1),  
    strokeWidth: baseThickness + randomRange(seed + 6, -0.02, 0.02),     
    fontFamily: getFontForType(char, seed + 7),
  };
};

const HandwrittenChar: React.FC<{ char: string; seed: number; isMath?: boolean; thickness: number; delayIndex: number }> = ({ char, seed, isMath = false, thickness, delayIndex }) => {
  const style = useMemo(() => generateCharStyle(char, seed, thickness), [char, seed, thickness]);
  if (char === ' ') return <span className="inline-block w-2"></span>;
  const delay = Math.min(delayIndex * 15, 3000); // Caps delay to avoid huge wait times on long docs

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
        color: '#0a2472', 
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

const HandwrittenLineSVG: React.FC<{ width: string; seed: number; thickness: number }> = ({ width, seed, thickness }) => {
  const yStart = 2;
  const yEnd = 2 + randomRange(seed, -0.3, 0.3);
  return (
    <div className="w-full h-[4px] relative overflow-visible" style={{ width: width }}>
      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 5">
         <path d={`M0,${yStart} Q50,${2 + randomRange(seed + 2, -0.5, 0.5)} 100,${yEnd}`} stroke="#0a2472" strokeWidth={thickness * 1.2} fill="none" opacity="0.7" strokeLinecap="round" />
      </svg>
    </div>
  );
};

// --- PENCIL DRAWING ENGINE ---

const WobbleLine: React.FC<{ x1: number; y1: number; x2: number; y2: number; seed: number; strokeWidth?: number }> = ({ x1, y1, x2, y2, seed, strokeWidth = 1.2 }) => {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const perpAngle = angle + Math.PI / 2;
  const wobbleAmount = randomRange(seed, -2, 2);
  const cX = midX + Math.cos(perpAngle) * wobbleAmount;
  const cY = midY + Math.sin(perpAngle) * wobbleAmount;
  return (
    <g className="graphite-pencil">
      <path d={`M${x1},${y1} Q${cX},${cY} ${x2},${y2}`} stroke="#2d2d2d" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
    </g>
  );
};

const PencilText: React.FC<{ x: number; y: number; text: string; seed: number; fontSize?: number }> = ({ x, y, text, seed, fontSize = 14 }) => (
  <text x={x} y={y} fontFamily="'Shadows Into Light', cursive" fontSize={fontSize} fill="#2d2d2d" transform={`rotate(${randomRange(seed, -1, 1)}, ${x}, ${y})`} className="graphite-pencil">{text}</text>
);

const PencilArrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; seed: number }> = ({ x1, y1, x2, y2, seed }) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  return (
    <g>
      <WobbleLine x1={x1} y1={y1} x2={x2} y2={y2} seed={seed} />
      <WobbleLine x1={x2} y1={y2} x2={x2 - 10 * Math.cos(angle - Math.PI/6)} y2={y2 - 10 * Math.sin(angle - Math.PI/6)} seed={seed + 10} strokeWidth={1} />
      <WobbleLine x1={x2} y1={y2} x2={x2 - 10 * Math.cos(angle + Math.PI/6)} y2={y2 - 10 * Math.sin(angle + Math.PI/6)} seed={seed + 20} strokeWidth={1} />
    </g>
  )
}

const HandwrittenDiagram: React.FC<{ type: string; seed: number }> = ({ type, seed }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (type.startsWith('GENAI_IMAGE')) {
        const prompt = type.replace('GENAI_IMAGE_', '').replace('GENAI_IMAGE[', '').replace(']', '');
        setLoading(true);
        generateIllustrationWithGemini(prompt).then(url => {
            setImageUrl(url);
            setLoading(false);
        });
    }
  }, [type]);

  if (type.startsWith('GENAI_IMAGE')) {
    return (
       <div className="w-full my-4 flex justify-center">
         <div className="relative p-1 bg-white shadow-sm border border-gray-100 transform" style={{ transform: `rotate(${randomRange(seed, -0.5, 0.5)}deg)` }}>
           <div className="w-[300px] h-[200px] bg-gray-50 relative flex items-center justify-center border border-gray-200">
               {loading ? <Loader className="animate-spin text-gray-300" /> : imageUrl ? <img src={imageUrl} className="w-full h-full object-cover mix-blend-multiply opacity-90" /> : <div className="text-[10px] text-gray-400">Illustration</div>}
               <div className="absolute -top-1 left-1/2 w-6 h-3 bg-yellow-200/20 -translate-x-1/2"></div>
           </div>
         </div>
       </div>
    );
  }

  return (
    <div className="w-full my-4 flex justify-center">
      <svg width="300" height="180" viewBox="0 0 300 180" className="overflow-visible graphite-pencil">
          {type === 'Q1_GRAPH' && (
            <>
              <PencilArrow x1={40} y1={150} x2={260} y2={150} seed={seed} />
              <PencilArrow x1={40} y1={150} x2={40} y2={20} seed={seed + 1} />
              <path d={`M40,150 Q120,60 180,50 T260,80`} stroke="#2d2d2d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <PencilText x={240} y={165} text="Strain" seed={seed + 2} />
              <PencilText x={10} y={15} text="Stress" seed={seed + 3} />
            </>
          )}
          {/* Add more types if needed */}
      </svg>
    </div>
  );
};

const HandwrittenLineParser: React.FC<{ text: string; seed: number; thickness: number; delayOffset: number }> = ({ text, seed, thickness, delayOffset }) => {
  const diagramMatch = text.trim().match(/^DIAGRAM\[(.*?)\]$/);
  const genAiMatch = text.trim().match(/^GENAI_IMAGE\[(.*?)\]$/); 
  if (diagramMatch) return <HandwrittenDiagram type={diagramMatch[1]} seed={seed} />;
  if (genAiMatch) return <HandwrittenDiagram type={`GENAI_IMAGE_${genAiMatch[1]}`} seed={seed} />;

  const parts = [];
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
    <div className="flex flex-wrap items-baseline leading-[2.4rem]">
      {parts.map((part, pIdx) => {
        const startIdx = charIndexCounter;
        if (part.type === 'text') {
          const words = part.content!.split(' ');
          return words.map((word, wIdx) => {
            const wordEl = (
              <span key={`p-${pIdx}-w-${wIdx}`} className="mr-2 inline-block whitespace-nowrap">
                {word.split('').map((c, cIdx) => (
                  <HandwrittenChar key={cIdx} char={c} seed={seed + pIdx*100 + wIdx*10 + cIdx} thickness={thickness} delayIndex={delayOffset + charIndexCounter++} />
                ))}
              </span>
            );
            charIndexCounter++; // Space
            return wordEl;
          });
        }
        charIndexCounter += (part.num?.length || 0) + (part.den?.length || 0) + (part.content?.length || 0);
        if (part.type === 'frac') return <HandwrittenFraction key={pIdx} num={part.num!} den={part.den!} seed={seed + pIdx*200} thickness={thickness} delayIndex={delayOffset + startIdx} />;
        if (part.type === 'sqrt') return <HandwrittenSqrt key={pIdx} content={part.content!} seed={seed + pIdx*300} thickness={thickness} delayIndex={delayOffset + startIdx} />;
        if (part.type === 'strike') return <HandwrittenStrike key={pIdx} content={part.content!} seed={seed + pIdx*400} thickness={thickness} delayIndex={delayOffset + startIdx} />;
        return null;
      })}
    </div>
  );
};

const HandwrittenStrike: React.FC<{ content: string; seed: number; thickness: number; delayIndex: number }> = ({ content, seed, thickness, delayIndex }) => (
  <span className="relative inline-block mx-1">
    <span className="opacity-70">{content.split('').map((c, i) => <HandwrittenChar key={i} char={c} seed={seed + i} thickness={thickness} delayIndex={delayIndex + i} />)}</span>
    <div className="absolute inset-0 flex items-center"><div className="w-full h-[2px] bg-[#0a2472] opacity-60 rounded-full" style={{ transform: `rotate(${randomRange(seed, -2, 2)}deg)` }}></div></div>
  </span>
);

const HandwrittenFraction: React.FC<{ num: string; den: string; seed: number; thickness: number; delayIndex: number }> = ({ num, den, seed, thickness, delayIndex }) => (
  <div className="inline-flex flex-col items-center align-middle mx-1 -my-2 relative top-2">
    <div className="text-[0.9em]">{num.split('').map((c, i) => <HandwrittenChar key={i} char={c} seed={seed + i} isMath thickness={thickness} delayIndex={delayIndex + i} />)}</div>
    <div className="w-full h-[1.5px] bg-[#0a2472] opacity-60"></div>
    <div className="text-[0.9em]">{den.split('').map((c, i) => <HandwrittenChar key={i} char={c} seed={seed + 50 + i} isMath thickness={thickness} delayIndex={delayIndex + num.length + i} />)}</div>
  </div>
);

const HandwrittenSqrt: React.FC<{ content: string; seed: number; thickness: number; delayIndex: number }> = ({ content, seed, thickness, delayIndex }) => (
  <div className="inline-flex items-center mx-1 relative">
    <span className="text-xl text-[#0a2472] font-[Caveat] mr-0.5">√</span>
    <div className="border-t border-[#0a2472]/60 pt-0.5">{content.split('').map((c, i) => <HandwrittenChar key={i} char={c} seed={seed + i} thickness={thickness} delayIndex={delayIndex + i} />)}</div>
  </div>
);

// --- PAGINATION ENGINE ---

interface PageData {
  id: string;
  questionNumber: string;
  questionText: string;
  steps: string[];
  pageNumber: number;
  globalCharOffset: number;
  isContinuation: boolean;
}

const paginateSolutions = (solutions: QuestionSolution[]): PageData[] => {
  const pages: PageData[] = [];
  const MAX_LINES = 22;
  const CHARS_PER_LINE = 50;
  let globalCharOffset = 0;
  let pageCounter = 1;

  solutions.forEach((sol) => {
    let currentSteps: string[] = [];
    let currentLineCount = 2; // Header space
    let isContinuation = false;

    sol.steps.forEach((step) => {
      const isDiagram = step.includes('DIAGRAM') || step.includes('GENAI_IMAGE');
      const stepLines = isDiagram ? 8 : Math.ceil(step.length / CHARS_PER_LINE) || 1;

      if (currentLineCount + stepLines > MAX_LINES) {
        pages.push({
          id: `q-${sol.id}-p-${pageCounter}`,
          questionNumber: sol.questionNumber,
          questionText: sol.questionText,
          steps: [...currentSteps],
          pageNumber: pageCounter++,
          globalCharOffset,
          isContinuation
        });
        
        currentSteps.forEach(s => globalCharOffset += s.length + 10);
        currentSteps = [];
        currentLineCount = 1; 
        isContinuation = true;
      }
      currentSteps.push(step);
      currentLineCount += stepLines;
    });

    if (currentSteps.length > 0) {
      pages.push({
        id: `q-${sol.id}-p-${pageCounter}`,
        questionNumber: sol.questionNumber,
        questionText: sol.questionText,
        steps: [...currentSteps],
        pageNumber: pageCounter++,
        globalCharOffset,
        isContinuation
      });
      currentSteps.forEach(s => globalCharOffset += s.length + 10);
    }
  });

  return pages;
};

// --- SCREENS ---

const UploadScreen: React.FC<{ onUpload: (file: UploadedFile) => void }> = ({ onUpload }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFiles = (files: FileList | null) => {
      if (files?.[0]) {
          const reader = new FileReader();
          reader.onload = (e) => onUpload({ name: files[0].name, type: files[0].type, data: e.target?.result as string });
          reader.readAsDataURL(files[0]);
      }
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-4 text-green-500 font-mono">
      <div className="w-full max-w-xl border border-green-500/50 bg-black/90 p-8 rounded shadow-2xl">
        <h1 className="text-2xl mb-6 terminal-text font-bold">> ASSIGNMENT_ENGINE_V4.0</h1>
        <div 
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-green-800 h-40 flex flex-col items-center justify-center cursor-pointer hover:bg-green-900/10 transition-colors"
        >
          <UploadCloud size={40} className="mb-2" />
          <p className="text-sm">DROP PDF OR IMAGE HERE</p>
          <input type="file" ref={inputRef} className="hidden" accept=".pdf,image/*" onChange={(e) => handleFiles(e.target.files)} />
        </div>
      </div>
    </div>
  );
};

const ProcessingScreen: React.FC<{ file: UploadedFile, onComplete: (sols: QuestionSolution[]) => void }> = ({ file, onComplete }) => {
  const [log, setLog] = useState<string[]>(["> INITIALIZING UPLOAD..."]);
  useEffect(() => {
    const process = async () => {
      setLog(l => [...l, `> TARGET: ${file.name}`, "> SCANNING DOCUMENT..."]);
      try {
        const sols = await solveWithGemini(file.data);
        setLog(l => [...l, "> SOLUTIONS GENERATED.", "> APPLYING TOPPER_STYLE HANDWRITING..."]);
        setTimeout(() => onComplete(sols), 1500);
      } catch (e) {
        setLog(l => [...l, "> ERROR. USING FALLBACKS."]);
        setTimeout(() => onComplete(FALLBACK_SOLUTIONS), 1500);
      }
    };
    process();
  }, [file, onComplete]);
  return (
    <div className="flex items-center justify-center min-h-[80vh] w-full text-green-500 font-mono">
      <div className="w-full max-w-xl p-8 bg-black border border-green-900">
        <Loader className="animate-spin mb-4" />
        {log.map((line, i) => <p key={i} className="text-sm opacity-80">{line}</p>)}
      </div>
    </div>
  );
};

const ResultsScreen: React.FC<{ solutions: QuestionSolution[], onReset: () => void }> = ({ solutions, onReset }) => {
  const [seed, setSeed] = useState(Date.now());
  const [thickness, setThickness] = useState(0.5);
  const [isScanner, setIsScanner] = useState(false);
  const paginated = useMemo(() => paginateSolutions(solutions), [solutions]);

  return (
    <div className="w-full min-h-screen bg-[#f3f3f3] flex flex-col items-center py-10">
      <div className="sticky top-4 z-50 flex gap-4 bg-gray-900/90 backdrop-blur p-3 rounded-full shadow-2xl no-print border border-gray-700">
        <button onClick={onReset} className="text-gray-400 hover:text-white px-3 flex items-center gap-1 border-r border-gray-700"><ArrowLeft size={16}/> BACK</button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-full text-sm font-bold"><FileText size={16}/> PRINT_FINAL</button>
        <button onClick={() => setIsScanner(!isScanner)} className={`p-2 rounded-full ${isScanner ? 'text-green-400' : 'text-gray-400'}`}><Camera size={20}/></button>
        <button onClick={() => setSeed(s => s + 1)} className="p-2 text-gray-400"><RefreshCcw size={20}/></button>
      </div>

      <div className="flex flex-col gap-12 w-full max-w-[21cm]">
        {paginated.map((page) => (
          <div key={page.id} className="paper-sheet-container">
            <PaperSheet isScannerMode={isScanner} pageNumber={page.pageNumber}>
              <div className="flex flex-col">
                {!page.isContinuation && (
                  <div className="mb-6 flex flex-col">
                    <span className="text-3xl font-[Caveat] text-[#0a2472] font-bold mb-2 underline decoration-[#0a2472]/40 underline-offset-8">
                       {page.questionNumber}
                    </span>
                    <HandwrittenLineParser 
                      text={page.questionText} 
                      seed={seed + page.pageNumber * 10} 
                      thickness={thickness} 
                      delayOffset={page.globalCharOffset} 
                    />
                  </div>
                )}
                {page.isContinuation && <div className="text-xs font-handwriting text-gray-400 mb-4 opacity-50 italic">...continued from previous page</div>}
                <div className="flex flex-col gap-1">
                  {page.steps.map((line, lIdx) => (
                    <div key={lIdx} className={`min-h-[2.4rem] flex items-center ${line.includes('=') ? 'pl-8' : ''}`}>
                      <HandwrittenLineParser 
                        text={line} 
                        seed={seed + page.pageNumber * 50 + lIdx * 12} 
                        thickness={thickness} 
                        delayOffset={page.globalCharOffset + lIdx * 30} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </PaperSheet>
          </div>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>('upload');
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [sols, setSols] = useState<QuestionSolution[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (window.aistudio) {
        if (!(await window.aistudio.hasSelectedApiKey())) await window.aistudio.openSelectKey();
      }
      setReady(true);
    };
    init();
  }, []);

  if (!ready) return <div className="h-screen bg-black flex items-center justify-center text-green-500 font-mono">LOADING_CORE...</div>;

  return (
    <div className="min-h-screen">
      {state === 'upload' && <UploadScreen onUpload={(f) => { setFile(f); setState('processing'); }} />}
      {state === 'processing' && file && <ProcessingScreen file={file} onComplete={(s) => { setSols(s); setState('results'); }} />}
      {state === 'results' && <ResultsScreen solutions={sols} onReset={() => { setFile(null); setState('upload'); }} />}
    </div>
  );
};

export default App;
