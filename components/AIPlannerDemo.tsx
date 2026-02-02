import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  FileText, 
  Layers, 
  Zap, 
  ArrowRight,
  CheckCircle2,
  Type,
  AlignLeft,
  Hash,
  ArrowRightCircle,
  Circle,
  Sparkles,
  Settings2,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DemoBlock {
  id: string;
  type: string;
  content: string;
  position: string;
  relativeSize: string;
  underline: boolean;
  icon: React.ReactNode;
  color: string;
}

const sampleOCRText = `Chapter 5: Photosynthesis

Definition:
Photosynthesis is the process by which green plants convert sunlight into chemical energy.

Key Points:
1. Occurs in chloroplasts
2. Requires sunlight, water, and CO2
3. Produces glucose and oxygen

→ Light-dependent reactions happen in thylakoids
→ Calvin cycle occurs in stroma

Formula:
6CO2 + 6H2O + Light Energy → C6H12O6 + 6O2

• Chlorophyll absorbs light
• ATP and NADPH are produced
• Oxygen is released as byproduct`;

const samplePlan: DemoBlock[] = [
  {
    id: 'block_1',
    type: 'heading',
    content: 'Chapter 5: Photosynthesis',
    position: 'top_center',
    relativeSize: 'large',
    underline: false,
    icon: <Type className="w-4 h-4" />,
    color: 'bg-purple-500/20 border-purple-500'
  },
  {
    id: 'block_2',
    type: 'subheading',
    content: 'Definition:',
    position: 'main_body',
    relativeSize: 'medium',
    underline: true,
    icon: <AlignLeft className="w-4 h-4" />,
    color: 'bg-blue-500/20 border-blue-500'
  },
  {
    id: 'block_3',
    type: 'paragraph',
    content: 'Photosynthesis is the process by which green plants...',
    position: 'main_body',
    relativeSize: 'normal',
    underline: false,
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-gray-500/20 border-gray-500'
  },
  {
    id: 'block_4',
    type: 'subheading',
    content: 'Key Points:',
    position: 'main_body',
    relativeSize: 'medium',
    underline: true,
    icon: <AlignLeft className="w-4 h-4" />,
    color: 'bg-blue-500/20 border-blue-500'
  },
  {
    id: 'block_5',
    type: 'numbered_point',
    content: '1. Occurs in chloroplasts',
    position: 'left_margin',
    relativeSize: 'normal',
    underline: false,
    icon: <Hash className="w-4 h-4" />,
    color: 'bg-green-500/20 border-green-500'
  },
  {
    id: 'block_6',
    type: 'numbered_point',
    content: '2. Requires sunlight, water, and CO2',
    position: 'left_margin',
    relativeSize: 'normal',
    underline: false,
    icon: <Hash className="w-4 h-4" />,
    color: 'bg-green-500/20 border-green-500'
  },
  {
    id: 'block_7',
    type: 'arrow_point',
    content: '→ Light-dependent reactions happen in thylakoids',
    position: 'left_margin',
    relativeSize: 'normal',
    underline: false,
    icon: <ArrowRightCircle className="w-4 h-4" />,
    color: 'bg-orange-500/20 border-orange-500'
  },
  {
    id: 'block_8',
    type: 'math_expression',
    content: '6CO2 + 6H2O + Light → C6H12O6 + 6O2',
    position: 'main_body',
    relativeSize: 'normal',
    underline: false,
    icon: <Sparkles className="w-4 h-4" />,
    color: 'bg-pink-500/20 border-pink-500'
  },
  {
    id: 'block_9',
    type: 'bullet_point',
    content: '• Chlorophyll absorbs light',
    position: 'left_margin',
    relativeSize: 'normal',
    underline: false,
    icon: <Circle className="w-4 h-4" />,
    color: 'bg-cyan-500/20 border-cyan-500'
  }
];

const pageInfoConfig = {
  width: 794,
  height: 1123,
  marginLeft: 25,
  marginTop: 20,
  lineSpacingBase: 28
};

const globalStyleConfig = {
  pressureCurve: [0.9, 0.85, 0.75],
  slantProgression: [-2, -1, 0],
  neatnessDecay: 0.05,
  consistencyScore: 0.75
};

export function AIPlannerDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  const steps = [
    { 
      title: 'OCR Text Input', 
      icon: <FileText className="w-5 h-5" />,
      description: 'Raw text extracted from scanned document'
    },
    { 
      title: 'AI Analysis', 
      icon: <Brain className="w-5 h-5" />,
      description: 'DeepSeek V3 analyzes text structure'
    },
    { 
      title: 'Layout Planning', 
      icon: <Layers className="w-5 h-5" />,
      description: 'Creates detailed block structure'
    },
    { 
      title: 'Style Generation', 
      icon: <Sparkles className="w-5 h-5" />,
      description: 'Human-like writing simulation'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
              <Brain className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              AI Page Planner
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            How Assignify transforms OCR text into realistic handwritten pages
          </p>
        </motion.div>

        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 bg-gray-800/50 rounded-full p-2">
            {steps.map((step, idx) => (
              <React.Fragment key={idx}>
                <motion.button
                  onClick={() => setActiveStep(idx)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                    activeStep === idx 
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {step.icon}
                  <span className="hidden sm:inline font-medium">{step.title}</span>
                </motion.button>
                {idx < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-600" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeStep === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid lg:grid-cols-2 gap-6"
            >
              <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <h3 className="text-xl font-semibold">Raw OCR Text</h3>
                </div>
                <pre className="bg-gray-900/50 rounded-xl p-4 text-sm text-gray-300 font-mono whitespace-pre-wrap overflow-auto max-h-96">
                  {sampleOCRText}
                </pre>
              </div>
              
              <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-xl font-semibold">What AI Detects</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Main Heading', count: 1, color: 'bg-purple-500' },
                    { label: 'Subheadings', count: 3, color: 'bg-blue-500' },
                    { label: 'Paragraphs', count: 1, color: 'bg-gray-500' },
                    { label: 'Numbered Points', count: 3, color: 'bg-green-500' },
                    { label: 'Arrow Points', count: 2, color: 'bg-orange-500' },
                    { label: 'Bullet Points', count: 3, color: 'bg-cyan-500' },
                    { label: 'Math Expression', count: 1, color: 'bg-pink-500' },
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center justify-between bg-gray-900/30 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span>{item.label}</span>
                      </div>
                      <span className="text-gray-400">{item.count}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700"
            >
              <div className="flex items-center gap-2 mb-6">
                <Brain className="w-6 h-6 text-purple-400" />
                <h3 className="text-2xl font-semibold">AI Analysis Process</h3>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-purple-900/30 to-purple-800/10 rounded-xl p-5 border border-purple-500/30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Type className="w-5 h-5 text-purple-400" />
                    </div>
                    <h4 className="font-semibold">Text Classification</h4>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Detects headings & subheadings
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Identifies numbered lists
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Finds arrow & bullet points
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Recognizes math formulas
                    </li>
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-blue-900/30 to-blue-800/10 rounded-xl p-5 border border-blue-500/30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Layers className="w-5 h-5 text-blue-400" />
                    </div>
                    <h4 className="font-semibold">Zone Planning</h4>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Left margin for bullets
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Main body for content
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Top center for headings
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Natural spacing gaps
                    </li>
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-green-900/30 to-green-800/10 rounded-xl p-5 border border-green-500/30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Settings2 className="w-5 h-5 text-green-400" />
                    </div>
                    <h4 className="font-semibold">Size & Style</h4>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Large headings (1.3x-1.5x)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Medium subheadings
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Underline key terms
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Emphasis markers
                    </li>
                  </ul>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 bg-gray-900/50 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium">Powered by DeepSeek V3</span>
                </div>
                <p className="text-sm text-gray-400">
                  Uses advanced language model to understand document structure and create 
                  human-like layout plans with natural imperfections.
                </p>
              </motion.div>
            </motion.div>
          )}

          {activeStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid lg:grid-cols-2 gap-6"
            >
              <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-5 h-5 text-blue-400" />
                  <h3 className="text-xl font-semibold">Generated Blocks</h3>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {samplePlan.map((block, idx) => (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => setSelectedBlock(block.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${block.color} ${
                        selectedBlock === block.id ? 'ring-2 ring-white/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {block.icon}
                        <span className="font-medium text-sm capitalize">{block.type.replace('_', ' ')}</span>
                        <span className="text-xs text-gray-400 ml-auto">{block.position}</span>
                      </div>
                      <p className="text-sm text-gray-300 truncate">{block.content}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-5 h-5 text-green-400" />
                  <h3 className="text-xl font-semibold">Page Layout Preview</h3>
                </div>
                <div 
                  className="bg-white rounded-lg relative mx-auto"
                  style={{ 
                    width: '280px', 
                    height: '396px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                  }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-6 bg-red-100/50 border-r border-red-300/50" />
                  
                  <div className="absolute top-0 left-0 right-0 h-8 border-b border-blue-200/50 flex items-center justify-center">
                    <div className="h-3 bg-purple-300/50 rounded w-32" />
                  </div>
                  
                  <div className="absolute top-10 left-8 right-2 space-y-2">
                    <div className="h-2.5 bg-blue-300/50 rounded w-16 mb-3" />
                    <div className="h-2 bg-gray-300/50 rounded w-full" />
                    <div className="h-2 bg-gray-300/50 rounded w-4/5" />
                    
                    <div className="h-2.5 bg-blue-300/50 rounded w-20 mt-4 mb-2" />
                    <div className="flex items-center gap-1">
                      <div className="h-2 bg-green-400/50 rounded w-4" />
                      <div className="h-2 bg-gray-300/50 rounded flex-1" />
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-2 bg-green-400/50 rounded w-4" />
                      <div className="h-2 bg-gray-300/50 rounded flex-1" />
                    </div>
                    
                    <div className="flex items-center gap-1 mt-3">
                      <div className="h-2 bg-orange-400/50 rounded w-4" />
                      <div className="h-2 bg-gray-300/50 rounded flex-1" />
                    </div>
                    
                    <div className="h-2.5 bg-pink-400/50 rounded w-full mt-4" />
                    
                    <div className="flex items-center gap-1 mt-3">
                      <div className="h-2 bg-cyan-400/50 rounded w-3" />
                      <div className="h-2 bg-gray-300/50 rounded w-3/4" />
                    </div>
                  </div>
                  
                  {[...Array(18)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-b border-blue-100"
                      style={{ top: `${(i + 1) * 22}px` }}
                    />
                  ))}
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  <span className="flex items-center gap-1 text-xs bg-gray-700/50 px-2 py-1 rounded">
                    <div className="w-2 h-2 bg-purple-400 rounded" /> Heading
                  </span>
                  <span className="flex items-center gap-1 text-xs bg-gray-700/50 px-2 py-1 rounded">
                    <div className="w-2 h-2 bg-blue-400 rounded" /> Subheading
                  </span>
                  <span className="flex items-center gap-1 text-xs bg-gray-700/50 px-2 py-1 rounded">
                    <div className="w-2 h-2 bg-green-400 rounded" /> Numbered
                  </span>
                  <span className="flex items-center gap-1 text-xs bg-gray-700/50 px-2 py-1 rounded">
                    <div className="w-2 h-2 bg-orange-400 rounded" /> Arrow
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {activeStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-xl font-semibold">Human-Like Simulation</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Writing Pressure</span>
                        <span className="text-gray-400">Decreases over page</span>
                      </div>
                      <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
                        <div className="w-1/3 bg-gradient-to-r from-blue-500 to-blue-400" />
                        <div className="w-1/3 bg-gradient-to-r from-blue-400 to-blue-300" />
                        <div className="w-1/3 bg-gradient-to-r from-blue-300 to-blue-200" />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0.9 (Start)</span>
                        <span>0.85</span>
                        <span>0.75 (End)</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Slant Angle</span>
                        <span className="text-gray-400">Increases gradually</span>
                      </div>
                      <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
                        <div className="w-1/3 bg-gradient-to-r from-purple-600 to-purple-500" />
                        <div className="w-1/3 bg-gradient-to-r from-purple-500 to-purple-400" />
                        <div className="w-1/3 bg-gradient-to-r from-purple-400 to-purple-300" />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>-2°</span>
                        <span>-1°</span>
                        <span>0°</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Neatness</span>
                        <span className="text-gray-400">Fatigue simulation</span>
                      </div>
                      <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
                        <div className="w-1/3 bg-gradient-to-r from-green-500 to-green-400" />
                        <div className="w-1/3 bg-gradient-to-r from-yellow-400 to-yellow-300" />
                        <div className="w-1/3 bg-gradient-to-r from-orange-400 to-orange-300" />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Neat</span>
                        <span>Moderate</span>
                        <span>Tired</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings2 className="w-5 h-5 text-green-400" />
                    <h3 className="text-xl font-semibold">Page Configuration</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(pageInfoConfig).map(([key, value]) => (
                      <div key={key} className="bg-gray-900/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                        <div className="text-lg font-mono text-white">{value}px</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <motion.button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-800/50 rounded-xl border border-gray-700 hover:bg-gray-700/50 transition-colors"
              >
                {showAdvanced ? <ChevronUp /> : <ChevronDown />}
                <span>{showAdvanced ? 'Hide' : 'Show'} Advanced JSON Output</span>
              </motion.button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 overflow-hidden"
                  >
                    <h3 className="text-lg font-semibold mb-4">Complete AI Response (JSON)</h3>
                    <pre className="bg-gray-900/80 rounded-xl p-4 text-xs text-green-400 font-mono overflow-x-auto max-h-96">
{JSON.stringify({
  pageInfo: pageInfoConfig,
  zones: {
    leftMargin: { width: 20, purpose: "numbering_bullets" },
    mainBody: { startX: 25, width: 700 },
    topHeading: { height: 50, alignment: "center" }
  },
  globalStyle: globalStyleConfig,
  blocks: samplePlan.map(b => ({
    id: b.id,
    type: b.type,
    content: b.content,
    position: b.position,
    relativeSize: b.relativeSize,
    underline: b.underline,
    spacing: { before: 10, after: 5, indent: 0 },
    style: { slant: -2, pressure: 0.85, baselineDrift: 0.3, wordSpacing: "normal" }
  }))
}, null, 2)}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 text-center"
        >
          <p className="text-gray-500 text-sm">
            AI Page Planner uses DeepSeek V3 via OpenRouter for intelligent layout analysis
          </p>
        </motion.div>
      </div>
    </div>
  );
}
