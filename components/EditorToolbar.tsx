import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Type, Palette, AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, Hash, Minus, Plus, RotateCcw,
  Hand, MousePointer2, Square, Circle, PenTool, Eraser,
  ZoomIn, ZoomOut, Download, Eye, Settings2, X,
  ChevronUp, Pipette, Bold, Italic, Underline as UnderlineIcon
} from 'lucide-react';

interface EditorToolbarProps {
  fontSize: number;
  setFontSize: (size: number) => void;
  lineSpacing: number;
  setLineSpacing: (spacing: number) => void;
  wordSpacing: number;
  setWordSpacing: (spacing: number) => void;
  randomVariation: number;
  setRandomVariation: (variation: number) => void;
  textColor: string;
  setTextColor: (color: string) => void;
  wordsPerLine: number;
  setWordsPerLine: (words: number) => void;
  marginWordsPerLine: number;
  setMarginWordsPerLine: (words: number) => void;
  paragraphStyle: 'none' | 'dot' | 'digit' | 'letter';
  setParagraphStyle: (style: 'none' | 'dot' | 'digit' | 'letter') => void;
  alignment: 'left' | 'center' | 'right';
  setAlignment: (align: 'left' | 'center' | 'right') => void;
  isSelectionMode: boolean;
  setIsSelectionMode: (mode: boolean) => void;
  onReset: () => void;
  onExport: () => void;
  zoom: number;
  setZoom: (zoom: number) => void;
}

const SliderControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
}> = ({ label, value, min, max, step, onChange, unit = '' }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex justify-between items-center">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className="text-xs text-zinc-300 font-medium">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-thumb"
    />
  </div>
);

const ToolButton: React.FC<{
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
}> = ({ icon: Icon, label, active = false, onClick, variant = 'default' }) => {
  const baseClasses = "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200";
  const variants = {
    default: active 
      ? "bg-blue-600 text-white" 
      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200",
    primary: "bg-blue-600 text-white hover:bg-blue-500",
    danger: "bg-red-600/20 text-red-400 hover:bg-red-600/40"
  };

  return (
    <button className={`${baseClasses} ${variants[variant]}`} onClick={onClick} title={label}>
      <Icon size={18} />
      <span className="text-[10px] mt-1">{label}</span>
    </button>
  );
};

const ColorPicker: React.FC<{
  color: string;
  onChange: (color: string) => void;
}> = ({ color, onChange }) => {
  const presetColors = [
    '#0a2472', '#1a365d', '#1e3a5f', '#0d47a1',
    '#000000', '#1f2937', '#374151', '#4b5563',
    '#991b1b', '#b91c1c', '#dc2626',
    '#166534', '#15803d', '#22c55e',
  ];

  return (
    <div className="flex flex-wrap gap-1.5 p-2">
      {presetColors.map((c) => (
        <button
          key={c}
          className={`w-6 h-6 rounded-md border-2 transition-all ${
            color === c ? 'border-white scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: c }}
          onClick={() => onChange(c)}
        />
      ))}
      <div className="relative">
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded-md cursor-pointer opacity-0 absolute inset-0"
        />
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-red-500 via-green-500 to-blue-500 flex items-center justify-center">
          <Pipette size={12} className="text-white" />
        </div>
      </div>
    </div>
  );
};

const ParagraphStyleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  paragraphStyle: 'none' | 'dot' | 'digit' | 'letter';
  setParagraphStyle: (style: 'none' | 'dot' | 'digit' | 'letter') => void;
  alignment: 'left' | 'center' | 'right';
  setAlignment: (align: 'left' | 'center' | 'right') => void;
}> = ({ isOpen, onClose, paragraphStyle, setParagraphStyle, alignment, setAlignment }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          className="bg-zinc-900 rounded-t-2xl p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Paragraph style</h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { id: 'left', icon: AlignLeft },
              { id: 'center', icon: AlignCenter },
              { id: 'right', icon: AlignRight },
            ].map((item) => (
              <button
                key={item.id}
                className={`h-16 rounded-lg flex items-center justify-center transition-all ${
                  alignment === item.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
                onClick={() => setAlignment(item.id as 'left' | 'center' | 'right')}
              >
                <item.icon size={24} />
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'none', label: 'None', icon: '≡' },
              { id: 'dot', label: 'Dot number', icon: '•' },
              { id: 'digit', label: 'Digit number', icon: '1.' },
              { id: 'letter', label: 'Letter number', icon: 'a.' },
            ].map((item) => (
              <button
                key={item.id}
                className={`h-20 rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${
                  paragraphStyle === item.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
                onClick={() => setParagraphStyle(item.id as 'none' | 'dot' | 'digit' | 'letter')}
              >
                <span className="text-2xl font-bold">{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  fontSize,
  setFontSize,
  lineSpacing,
  setLineSpacing,
  wordSpacing,
  setWordSpacing,
  randomVariation,
  setRandomVariation,
  textColor,
  setTextColor,
  wordsPerLine,
  setWordsPerLine,
  marginWordsPerLine,
  setMarginWordsPerLine,
  paragraphStyle,
  setParagraphStyle,
  alignment,
  setAlignment,
  isSelectionMode,
  setIsSelectionMode,
  onReset,
  onExport,
  zoom,
  setZoom,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [showParagraphModal, setShowParagraphModal] = useState(false);

  const togglePanel = (panel: string) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  return (
    <>
      <motion.div
        className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-800 z-40"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
      >
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-zinc-800 overflow-hidden"
            >
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <SliderControl
                  label="Font Size"
                  value={fontSize}
                  min={14}
                  max={28}
                  step={1}
                  onChange={setFontSize}
                  unit="px"
                />
                <SliderControl
                  label="Line Spacing"
                  value={lineSpacing}
                  min={1.8}
                  max={3.5}
                  step={0.1}
                  onChange={setLineSpacing}
                  unit="rem"
                />
                <SliderControl
                  label="Word Spacing"
                  value={wordSpacing}
                  min={0}
                  max={8}
                  step={0.5}
                  onChange={setWordSpacing}
                  unit="px"
                />
                <SliderControl
                  label="Random Variation"
                  value={randomVariation}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={setRandomVariation}
                />
                <SliderControl
                  label="Words/Line (Main)"
                  value={wordsPerLine}
                  min={5}
                  max={15}
                  step={1}
                  onChange={setWordsPerLine}
                />
                <SliderControl
                  label="Words/Line (Margin)"
                  value={marginWordsPerLine}
                  min={2}
                  max={6}
                  step={1}
                  onChange={setMarginWordsPerLine}
                />
                <div className="col-span-2">
                  <span className="text-xs text-zinc-400 mb-2 block">Text Color</span>
                  <ColorPicker color={textColor} onChange={setTextColor} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activePanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-zinc-800 overflow-hidden"
            >
              <div className="p-4 max-w-4xl mx-auto">
                {activePanel === 'text' && (
                  <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-2 bg-zinc-800 rounded-lg text-zinc-300 hover:bg-zinc-700 flex items-center gap-2">
                      <Bold size={16} /> Bold
                    </button>
                    <button className="px-3 py-2 bg-zinc-800 rounded-lg text-zinc-300 hover:bg-zinc-700 flex items-center gap-2">
                      <Italic size={16} /> Italic
                    </button>
                    <button className="px-3 py-2 bg-zinc-800 rounded-lg text-zinc-300 hover:bg-zinc-700 flex items-center gap-2">
                      <UnderlineIcon size={16} /> Underline
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between px-2 py-2 max-w-4xl mx-auto">
          <div className="flex items-center gap-1">
            <ToolButton
              icon={Hand}
              label="Select"
              active={isSelectionMode}
              onClick={() => setIsSelectionMode(!isSelectionMode)}
            />
            <ToolButton
              icon={PenTool}
              label="Draw"
              onClick={() => {}}
            />
            <ToolButton
              icon={Type}
              label="Text"
              onClick={() => togglePanel('text')}
              active={activePanel === 'text'}
            />
            <ToolButton
              icon={ListOrdered}
              label="Style"
              onClick={() => setShowParagraphModal(true)}
            />
            <ToolButton
              icon={Palette}
              label="Color"
              onClick={() => togglePanel('color')}
              active={activePanel === 'color'}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              className="p-2 text-zinc-400 hover:text-white transition-colors"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-xs text-zinc-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              className="p-2 text-zinc-400 hover:text-white transition-colors"
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            >
              <ZoomIn size={18} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <ToolButton
              icon={RotateCcw}
              label="Reset"
              onClick={onReset}
              variant="danger"
            />
            <ToolButton
              icon={Download}
              label="Export"
              onClick={onExport}
              variant="primary"
            />
            <button
              className="p-2 text-zinc-400 hover:text-white transition-colors ml-2"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                <ChevronUp size={20} />
              </motion.div>
            </button>
          </div>
        </div>
      </motion.div>

      <ParagraphStyleModal
        isOpen={showParagraphModal}
        onClose={() => setShowParagraphModal(false)}
        paragraphStyle={paragraphStyle}
        setParagraphStyle={setParagraphStyle}
        alignment={alignment}
        setAlignment={setAlignment}
      />

      <style>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.15s;
        }
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .slider-thumb::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </>
  );
};
