import * as pdfjsLib from 'pdfjs-dist';
import { QuestionSolution, ExtractionStats, ExtractedImage, PreviewData, LinePlan, PagePlan } from '../types';
import { OCR_CONFIG } from '../constants';
import {
  extractTextWithFlorence,
  isFlorenceApiInitialized,
  initializeFlorenceOCR
} from './florenceOcrService';
import { aiPagePlannerService } from './aiPagePlannerService';
import { NotebookLayoutPlan, LayoutBlock } from '../types/pagePlan';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface OCRProgress {
  status: string;
  progress: number;
  stage?: 'loading' | 'extracting' | 'analyzing' | 'complete';
}

export type ProgressCallback = (progress: OCRProgress) => void;

async function pdfPageToCanvas(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale: number = OCR_CONFIG.PDF_SCALE
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  } as any).promise;
  
  return canvas;
}

async function extractTextFromPDFPage(page: pdfjsLib.PDFPageProxy): Promise<string> {
  try {
    const textContent = await page.getTextContent();
    const textItems = textContent.items as Array<{ str: string }>;
    return textItems.map(item => item.str).join(' ');
  } catch (e) {
    return '';
  }
}

async function extractImagesFromCanvas(
  canvas: HTMLCanvasElement,
  pageNum: number
): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = [];
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return images;
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let hasNonWhitePixels = false;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) {
      hasNonWhitePixels = true;
      break;
    }
  }
  
  if (hasNonWhitePixels) {
    images.push({
      id: `page-${pageNum}-full`,
      dataUrl: canvas.toDataURL('image/png', 0.8),
      width: canvas.width,
      height: canvas.height,
      pageNumber: pageNum
    });
  }
  
  return images;
}

export async function extractPreviewData(
  fileData: string,
  fileType: string,
  onProgress?: ProgressCallback
): Promise<PreviewData> {
  const extractedText: string[] = [];
  const extractedImages: ExtractedImage[] = [];
  let thumbnail = '';
  
  onProgress?.({ status: 'Loading document...', progress: 5, stage: 'loading' });

  if (fileType === 'application/pdf' || fileData.startsWith('data:application/pdf')) {
    const base64Data = fileData.split(',')[1];
    const pdfBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    onProgress?.({ status: 'Parsing PDF structure...', progress: 10, stage: 'loading' });
    
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    const numPages = pdf.numPages;
    
    // Process each page
    for (let i = 1; i <= numPages; i++) {
      const progressPercent = 10 + Math.round((i / numPages) * 70);
      onProgress?.({ 
        status: `Processing page ${i} of ${numPages}...`, 
        progress: progressPercent,
        stage: 'extracting'
      });
      
      const page = await pdf.getPage(i);
      const nativeText = await extractTextFromPDFPage(page);
      const canvas = await pdfPageToCanvas(pdf, i, 1.5);
      
      // Create thumbnail from first page
      if (i === 1) {
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 200;
        thumbCanvas.height = 280;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          thumbCtx.drawImage(canvas, 0, 0, 200, 280);
          thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.7);
        }
        thumbCanvas.remove();
      }
      
      let pageText = nativeText;
      
      // If native text is minimal, use Florence-2 OCR
      if (nativeText.trim().length < 50) {
        onProgress?.({ 
          status: `Florence-2 OCR scanning page ${i}...`, 
          progress: progressPercent + 5,
          stage: 'extracting'
        });
        
        const imageDataUrl = canvas.toDataURL('image/png');
        
        if (isFlorenceApiInitialized()) {
          try {
            pageText = await extractTextWithFlorence(
              imageDataUrl,
              (status) => onProgress?.({ status, progress: progressPercent + 3, stage: 'extracting' })
            );
          } catch (err) {
            console.error('Florence-2 OCR failed for page', i, err);
            pageText = nativeText || `[Page ${i} - OCR requires API key]`;
          }
        } else {
          pageText = nativeText || `[Page ${i} - Add Hugging Face API key for OCR]`;
        }
      }
      
      extractedText.push(pageText);
      
      const pageImages = await extractImagesFromCanvas(canvas, i);
      extractedImages.push(...pageImages);
      
      canvas.remove();
    }
  } else {
    // Image file
    onProgress?.({ status: 'Processing image...', progress: 20, stage: 'extracting' });
    
    thumbnail = fileData;
    
    const img = new Image();
    img.src = fileData;
    await new Promise((resolve) => { img.onload = resolve; });
    
    extractedImages.push({
      id: 'image-1',
      dataUrl: fileData,
      width: img.width,
      height: img.height,
      pageNumber: 1
    });
    
    onProgress?.({ status: 'Running Florence-2 OCR...', progress: 40, stage: 'extracting' });
    
    if (isFlorenceApiInitialized()) {
      try {
        const florenceText = await extractTextWithFlorence(
          fileData,
          (status) => onProgress?.({ status, progress: 60, stage: 'extracting' })
        );
        extractedText.push(florenceText || '[Image content]');
      } catch (err) {
        console.error('Florence-2 OCR failed:', err);
        extractedText.push('[Image - OCR failed, check API key]');
      }
    } else {
      extractedText.push('[Add Hugging Face API key for OCR]');
    }
  }
  
  onProgress?.({ status: 'Analyzing content...', progress: 90, stage: 'analyzing' });
  
  const allText = extractedText.join('\n');
  const words = allText.split(/\s+/).filter(w => w.length > 0);
  const numbers = allText.match(/\d+/g) || [];
  const lines = allText.split('\n').filter(l => l.trim().length > 0);
  
  const stats: ExtractionStats = {
    totalCharacters: allText.length,
    totalWords: words.length,
    totalNumbers: numbers.length,
    totalLines: lines.length,
    totalPages: extractedText.length,
    extractedImages
  };
  
  onProgress?.({ status: 'Preview ready', progress: 100, stage: 'complete' });
  
  return {
    thumbnail,
    extractedText,
    stats,
    rawPages: extractedText
  };
}

function parseTextToQuestions(pageTexts: string[]): QuestionSolution[] {
  const allText = pageTexts.join('\n\n');
  
  const questionPatterns = [
    /(?:Q(?:uestion)?\.?\s*(\d+)[.:\s])/gi,
    /(?:^|\n)(\d+)[.)]\s+/gm,
    /(?:^|\n)([A-Z])[.)]\s+/gm,
  ];
  
  const lines = allText.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return [{
      questionText: 'No text could be extracted from the document',
      steps: ['Please ensure the document contains readable text and add your Hugging Face API key.']
    }];
  }
  
  const solutions: QuestionSolution[] = [];
  let currentQuestion: string[] = [];
  let questionNumber = 1;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    let isNewQuestion = false;
    for (const pattern of questionPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(trimmedLine)) {
        isNewQuestion = true;
        break;
      }
    }
    
    if (isNewQuestion && currentQuestion.length > 0) {
      const questionText = currentQuestion[0] || `Question ${questionNumber}`;
      const steps = currentQuestion.slice(1);
      
      solutions.push({
        questionNumber: `Q${questionNumber}.`,
        questionText: questionText,
        steps: steps.length > 0 ? steps : ['(Answer content)']
      });
      
      currentQuestion = [trimmedLine];
      questionNumber++;
    } else {
      currentQuestion.push(trimmedLine);
    }
  }
  
  if (currentQuestion.length > 0) {
    const questionText = currentQuestion[0] || `Content`;
    const steps = currentQuestion.slice(1);
    
    solutions.push({
      questionNumber: solutions.length === 0 ? 'Q1.' : `Q${questionNumber}.`,
      questionText: questionText,
      steps: steps.length > 0 ? steps : ['(Document content)']
    });
  }
  
  if (solutions.length === 0) {
    const chunks = chunkText(allText, 800);
    return chunks.map((chunk, idx) => ({
      questionNumber: `Section ${idx + 1}`,
      questionText: `Extracted Content`,
      steps: chunk.split('\n').filter(l => l.trim().length > 0)
    }));
  }
  
  return solutions;
}

function chunkText(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

export async function processPreviewToSolutions(
  previewData: PreviewData,
  onProgress?: ProgressCallback
): Promise<QuestionSolution[]> {
  onProgress?.({ status: 'AI analyzing document layout...', progress: 10, stage: 'analyzing' });
  
  try {
    // Use AI Page Planner to get structured layout - 'finer' mode for detailed handwriting
    const layoutPlans = await aiPagePlannerService.planLayout(
      previewData.rawPages,
      'finer',
      (status) => onProgress?.({ status, progress: 40, stage: 'analyzing' })
    );
    
    onProgress?.({ status: 'Converting layout to handwriting...', progress: 70, stage: 'analyzing' });
    
    // Convert layout plans to solutions
    const solutions = convertLayoutToSolutions(layoutPlans);
    
    onProgress?.({ status: 'Complete', progress: 100, stage: 'complete' });
    
    return solutions;
  } catch (error) {
    console.error('AI layout planning failed, using fallback:', error);
    onProgress?.({ status: 'Using basic text parsing...', progress: 50, stage: 'analyzing' });
    
    // Fallback to simple parsing
    const solutions = parseTextToQuestions(previewData.rawPages);
    
    onProgress?.({ status: 'Complete', progress: 100, stage: 'complete' });
    
    return solutions;
  }
}

function convertLayoutToSolutions(layoutPlans: NotebookLayoutPlan[]): QuestionSolution[] {
  const solutions: QuestionSolution[] = [];
  
  // If no layout plans or empty blocks, return fallback immediately
  if (!layoutPlans || layoutPlans.length === 0) {
    console.warn('No layout plans received from AI');
    return [{
      questionText: 'Document Content',
      steps: ['Content could not be parsed. Please check the document.']
    }];
  }
  
  for (let planIdx = 0; planIdx < layoutPlans.length; planIdx++) {
    const plan = layoutPlans[planIdx];
    
    // If no blocks in this plan, try to extract raw text
    if (!plan.blocks || plan.blocks.length === 0) {
      console.warn(`Layout plan ${planIdx} has no blocks`);
      continue;
    }
    
    // Create one solution per page/plan with ALL blocks as content
    const allSteps: string[] = [];
    const allLinePlans: LinePlan[] = [];
    let pageTitle = `Page ${planIdx + 1}`;
    let questionNumber: string | undefined = undefined;
    
    for (let blockIdx = 0; blockIdx < plan.blocks.length; blockIdx++) {
      const block = plan.blocks[blockIdx];
      
      // Skip empty content
      if (!block.content || block.content.trim().length === 0) continue;
      
      // First heading/numbered point becomes the title
      if (blockIdx === 0 && (block.type === 'heading' || block.type === 'numbered_point')) {
        pageTitle = block.content;
        if (block.type === 'numbered_point') {
          questionNumber = `Q${planIdx + 1}.`;
        }
      } else {
        // All other blocks become steps
        allSteps.push(block.content);
        
        // Create line plan for handwriting styling
        const linePlan = createLinePlanFromBlock(block, allSteps.length - 1, plan);
        allLinePlans.push(linePlan);
      }
    }
    
    // If we have content, create a solution
    if (pageTitle || allSteps.length > 0) {
      solutions.push({
        questionNumber,
        questionText: pageTitle,
        steps: allSteps.length > 0 ? allSteps : [pageTitle],
        linePlans: allLinePlans.length > 0 ? allLinePlans : undefined,
        pagePlan: createPagePlanFromBlock(plan.blocks[0], plan)
      });
    }
  }
  
  // Fallback: if still no solutions, create from raw blocks
  if (solutions.length === 0) {
    const allBlocks = layoutPlans.flatMap(p => p.blocks || []);
    const allContent = allBlocks.map(b => b.content).filter(c => c && c.trim().length > 0);
    
    if (allContent.length > 0) {
      return [{
        questionText: 'Document Content',
        steps: allContent
      }];
    }
    
    return [{
      questionText: 'Document Content',
      steps: ['No content could be extracted. Please check your document.']
    }];
  }
  
  console.log(`Created ${solutions.length} solutions from AI layout plans`);
  return solutions;
}

function createLinePlanFromBlock(block: LayoutBlock, lineNumber: number, plan: NotebookLayoutPlan): LinePlan {
  const style = block.style || { slant: -2, pressure: 0.85, baselineDrift: 0.3, wordSpacing: 'normal' as const };
  
  return {
    lineNumber,
    content: block.content,
    indent: block.spacing?.indent || (block.position === 'left_margin' ? 5 : 25),
    isQuestionNumber: block.type === 'numbered_point',
    isFraction: block.content.includes('/') && /\d+\/\d+/.test(block.content),
    isHeading: block.type === 'heading' || block.type === 'subheading',
    alignment: block.position === 'top_center' ? 'center' : 'left',
    emphasis: block.underline ? 'underline' : 'normal',
    wordSpacing: style.wordSpacing,
    baselineVariation: style.baselineDrift,
    slantAngle: style.slant,
    pressureLevel: style.pressure
  };
}

function createPagePlanFromBlock(block: LayoutBlock, plan: NotebookLayoutPlan): PagePlan {
  const globalStyle = plan.globalStyle || { pressureCurve: [0.9, 0.85, 0.75], slantProgression: [-2, -1, 0], neatnessDecay: 0.05, consistencyScore: 0.75 };
  
  return {
    pageNumber: 1,
    lines: [],
    marginLeft: plan.pageInfo?.marginLeft || 25,
    marginRight: plan.pageInfo?.marginRight || 15,
    marginTop: plan.pageInfo?.marginTop || 20,
    lineSpacing: plan.pageInfo?.lineSpacingBase || 28,
    overallSlant: globalStyle.slantProgression[0] || -2,
    writingSpeed: 'medium',
    fatigueLevel: 1 - globalStyle.consistencyScore
  };
}

export async function processFileToSolutions(
  fileData: string,
  fileType: string,
  onProgress?: ProgressCallback
): Promise<QuestionSolution[]> {
  try {
    const preview = await extractPreviewData(fileData, fileType, onProgress);
    return await processPreviewToSolutions(preview, onProgress);
  } catch (error) {
    console.error('OCR processing error:', error);
    throw error;
  }
}

// Dummy function for compatibility
export async function terminateWorker(): Promise<void> {
  // No worker to terminate - Florence uses API
}
