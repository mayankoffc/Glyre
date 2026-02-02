import type { Express } from "express";

const MEDIUM_MODE_PROMPT = `You are an AI that plans REALISTIC HUMAN HANDWRITTEN notebook pages like an Indian student.

KEY STRUCTURE:
- LEFT MARGIN: Q1., Q2., Ans:, (a), (b), 1., 2. etc - labels only
- MAIN AREA: Answer text flows naturally after the red margin line

NOTEBOOK LAYOUT:
┌──────┬───────────────────────────────────┐
│MARGIN│ MAIN WRITING AREA                 │
│ Q1.  │ Answer text here...               │
│ Ans: │ More answer text...               │
│ (a)  │ Sub-answer for part (a)           │
└──────┴───────────────────────────────────┘

OUTPUT JSON FORMAT:
{
  "pageInfo": {
    "width": 210, "height": 297, "unit": "mm",
    "leftMarginWidth": 30, "lineHeight": 8
  },
  "marginLabels": [
    { "lineIndex": 0, "label": "Q1." },
    { "lineIndex": 1, "label": "Ans:" }
  ],
  "blocks": [
    {
      "id": "block_1",
      "type": "answer_text",
      "content": "text without the Q1/Ans prefix",
      "lineIndex": 0,
      "lineCount": 2,
      "style": { "slant": -2, "pressure": 0.9 }
    }
  ],
  "globalStyle": {
    "fatigueProgression": [0.9, 0.85, 0.75],
    "neatnessLevel": 0.8
  }
}

RULES:
- Put Q numbers, Ans:, (a), (b) in marginLabels array
- Put only answer text (without labels) in blocks
- Add human imperfections: slant variation, pressure changes
- Output ONLY valid JSON
`;

const FINER_MODE_PROMPT = `You are an expert AI that plans REALISTIC HUMAN HANDWRITTEN notebook pages.

CRITICAL: You must plan pages EXACTLY like a real Indian student writes assignments:
- Question numbers (Q1, Q2, 1., 2., (a), (b), Ans:) go in the LEFT MARGIN area
- Main answer text goes in the MAIN BODY area after the red margin line
- Write naturally with slight imperfections - NOT computer-perfect

REAL NOTEBOOK STRUCTURE (A4 size = 210mm x 297mm):
┌──────────────────────────────────────────┐
│  Date/Page No area (top right)           │
├──────┬───────────────────────────────────┤
│MARGIN│ MAIN WRITING AREA                 │
│ Q1.  │ Answer text flows here naturally  │
│ Ans: │ continuing on multiple lines...   │
│      │                                   │
│ (a)  │ Sub-answer for part (a)           │
│ (b)  │ Sub-answer for part (b)           │
│      │                                   │
│ Q2.  │ Next question's answer            │
└──────┴───────────────────────────────────┘

MARGIN LABELS (left of red line):
- "Q1.", "Q2.", "Q3." for question numbers
- "Ans:", "Sol:" for answer start
- "(a)", "(b)", "(c)" for sub-parts
- "1.", "2.", "3." for numbered steps
- "→", "•" for points
- "Note:", "Given:" for special lines

HUMAN WRITING CHARACTERISTICS:
1. FATIGUE: Writing gets messier towards page bottom
   - Top 1/3: neat (pressure 0.9, slant -2°)
   - Middle 1/3: slightly loose (pressure 0.85, slant -1°)
   - Bottom 1/3: tired (pressure 0.75, slant 0°)

2. NATURAL VARIATIONS per line:
   - Baseline drift: ±0.5° random
   - Letter spacing: varies slightly
   - Word gaps: inconsistent
   - Left margin: drifts 1-3mm

3. LINE SPACING: ~8mm per line (matches ruled notebook)

4. IMPERFECTIONS:
   - Some letters slightly larger/smaller
   - Occasional ink pressure changes
   - Lines not perfectly straight
   - Slight rightward drift as writing continues

OUTPUT FORMAT (JSON only):
{
  "pageInfo": {
    "width": 210, "height": 297, "unit": "mm",
    "leftMarginWidth": 30, "lineHeight": 8,
    "topMargin": 35, "rightMargin": 12
  },
  "marginLabels": [
    { "lineIndex": 0, "label": "Q1." },
    { "lineIndex": 1, "label": "Ans:" },
    { "lineIndex": 5, "label": "(a)" }
  ],
  "blocks": [
    {
      "id": "block_1",
      "type": "answer_text|heading|subheading|math|definition",
      "content": "actual text without label",
      "lineIndex": 0,
      "lineCount": 2,
      "style": {
        "slant": -2,
        "pressure": 0.9,
        "baselineDrift": 0.3,
        "indent": 0
      }
    }
  ],
  "globalStyle": {
    "fatigueProgression": [0.9, 0.85, 0.75],
    "slantProgression": [-2, -1, 0],
    "neatnessLevel": 0.8
  }
}

RULES:
- marginLabels: ONLY Q numbers, Ans:, (a), (b) etc go here
- blocks: ONLY the answer text, NOT the labels
- Remove any prefixes like "Q1.", "Ans:" from block content
- Preserve original text meaning
- Output ONLY valid JSON, no explanations
`;

const OCR_SPACE_URL = 'https://api.ocr.space/parse/image';

export function registerRoutes(app: Express): void {
  app.post("/api/ocr", async (req, res) => {
    try {
      const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY;
      if (!OCR_SPACE_API_KEY) {
        return res.status(500).json({ error: 'OCR_SPACE_API_KEY not configured' });
      }

      const { imageBase64 } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ error: 'No image data provided' });
      }

      console.log('Processing image with OCR Space...');

      const base64WithPrefix = `data:image/png;base64,${imageBase64}`;

      const formData = new FormData();
      formData.append('apikey', OCR_SPACE_API_KEY);
      formData.append('base64Image', base64WithPrefix);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2');

      const response = await fetch(OCR_SPACE_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OCR Space API error:', response.status, errorText);
        return res.status(response.status).json({ error: `OCR API error: ${response.status}` });
      }

      const result = await response.json();
      console.log('OCR Space response received');
      
      if (result.IsErroredOnProcessing) {
        const errorMessage = result.ErrorMessage?.[0] || 'OCR processing failed';
        console.error('OCR Space processing error:', errorMessage);
        return res.status(400).json({ error: errorMessage });
      }

      let extractedText = '';
      if (result.ParsedResults && result.ParsedResults.length > 0) {
        extractedText = result.ParsedResults.map((r: any) => r.ParsedText || '').join('\n');
      }
      
      res.json({ text: extractedText.trim() });

    } catch (error) {
      console.error('OCR error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/ai-page-planner", async (req, res) => {
    try {
      const { text, mode = "medium", pageCount = 1 } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Missing or invalid 'text' field" });
      }

      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
      if (!OPENROUTER_API_KEY) {
        console.error("OPENROUTER_API_KEY is not configured");
        return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured" });
      }

      const systemPrompt = mode === "finer" ? FINER_MODE_PROMPT : MEDIUM_MODE_PROMPT;
      const userPrompt = `Analyze this OCR-extracted notebook text and create a detailed page layout plan.

Total pages to plan: ${pageCount}

TEXT CONTENT:
${text}

Return ONLY valid JSON with the page layout plan. No explanations.`;

      const modeLabel = mode === "finer" ? "FINER" : "MEDIUM";
      console.log(`Processing AI page planning in ${modeLabel} mode for ${pageCount} page(s) using DeepSeek V3`);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://assignify.replit.app",
          "X-Title": "AI Page Planner - Assignify"
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat-v3-0324",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 8000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        
        if (response.status === 429) {
          return res.status(429).json({ error: "Rate limit exceeded, please try again later" });
        }
        if (response.status === 402) {
          return res.status(402).json({ error: "Payment required for AI services" });
        }
        
        return res.status(500).json({ error: `AI gateway error: ${response.status}` });
      }

      const aiResponse = await response.json();
      let planText = aiResponse.choices?.[0]?.message?.content || "";
      
      planText = planText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      let plan;
      try {
        plan = JSON.parse(planText);
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", planText.substring(0, 500));
        return res.status(500).json({ error: "AI returned invalid JSON structure" });
      }

      console.log("AI page plan generated successfully");

      res.json({ plan, mode });

    } catch (error) {
      console.error("AI page planner error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
}
