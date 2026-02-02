# Assignify - Assignment Real Generator

## Overview
Assignify is a professional handwriting generation tool that converts OCR-extracted text from notebook scans into realistic handwritten-style output. The app uses AI for page planning and OCR services for text extraction.

## Project Structure
```
├── App.tsx                    # Main React application (large single component)
├── components/                # React components
│   ├── PaperSheet.tsx         # Paper rendering component
│   ├── ScanningAnimation.tsx  # Loading animation component
│   ├── AIPlannerDemo.tsx      # AI page planning demo/preview
│   └── EditorToolbar.tsx      # Professional editing toolbar with controls
├── services/                  # Service layer
│   ├── aiPagePlannerService.ts  # AI-based layout planning
│   ├── florenceOcrService.ts    # OCR text extraction
│   └── ocrService.ts            # PDF/image processing
├── server/                    # Express backend
│   ├── index.ts               # Server entry point
│   ├── routes.ts              # API routes (OCR and AI planner)
│   └── db.ts                  # Database connection
├── shared/                    # Shared code
│   └── schema.ts              # Drizzle database schema
├── types/                     # TypeScript types
│   └── pagePlan.ts            # Page planning types
├── types.ts                   # Core types
└── constants.ts               # Application constants
```

## Tech Stack
- **Frontend**: React 19, Vite, Framer Motion, Lucide Icons
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **AI/OCR**: OCR Space API, OpenRouter AI (DeepSeek V3)

## Key Features
1. **PDF/Image Upload**: Upload scanned notebook pages
2. **OCR Extraction**: Extract text using OCR Space API
3. **Dual Processing Modes**:
   - **AI Planning Mode**: AI analyzes and structures content layout intelligently
   - **Direct OCR Mode**: Extract exact structure from pre-formatted handwritten pages (no AI)
4. **Handwriting Generation**: Render text in realistic handwritten style
5. **AI Planning Demo**: Interactive demo showing how AI page planning works
6. **Live Processing Status**: Real-time detailed progress bar showing each processing step

## Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `OCR_SPACE_API_KEY` - API key for OCR Space service
- `OPENROUTER_API_KEY` - API key for OpenRouter AI service

## Running the App
- `npm run dev` - Start both frontend (port 5000) and backend (port 3001)
- `npm run client` - Start only frontend
- `npm run server` - Start only backend
- `npm run db:push` - Push database schema changes

## API Endpoints
- `POST /api/ocr` - Process image with OCR
- `POST /api/ai-page-planner` - Generate AI page layout plan

## Recent Changes (Feb 2026)
- Migrated from Supabase to self-hosted Express backend
- Removed Supabase Edge Functions
- Added Drizzle ORM for PostgreSQL
- Configured Vite proxy for API requests
- Added AI Planning Demo page showing how AI page planning works
- **Handwriting Engine v2 (Simplified - Old App Port)**:
  - Simple character variations: ±0.6° rotation, ±0.1px offset, 0.99-1.02 scale
  - writeIn CSS animation for natural appearance
  - Character-by-character rendering with HandwrittenLineParser
  - Fonts: Cedarville Cursive (primary), Caveat, Shadows Into Light
  - Line height: 2.4rem for proper notebook line alignment
  - Removed complex ink pools, pressure variations, word/line context
- **PaperSheet Updates**:
  - 2.4rem ruled line spacing matching handwriting line height
  - Double red margin lines, A4 dimensions
  - Margin labels positioned with 2.4rem grid
- **Professional Editor Toolbar (Feb 2026)**:
  - EditorToolbar component with fixed footer position
  - Slider controls for: Font Size (14-28px), Line Spacing (1.8-3.5rem), Word Spacing, Random Variation
  - Words-per-line controls: Main content (~10 words), Margin content (~4 words)
  - Text color picker with preset colors and custom color input
  - Paragraph Style modal: alignment (left/center/right), numbering (none/dot/digit/letter)
  - Selection mode toggle for text editing
  - Zoom controls (50-200%)
  - Export and Reset buttons
  - Expandable panel with advanced settings
- **Improved Text Layout**:
  - AI-driven margin vs main line content distinction
  - Text wraps based on words-per-line settings
  - Proper font sizing for A4 paper (22px default)
  - EditorSettings interface for all customization options
  - **Fully Synchronized Rendering**: Line spacing prop flows through PaperSheet (ruled lines, margin labels) and HandwrittenLineParser to keep text perfectly aligned
  - **Dynamic Text Color**: Color picker value passed through EditorSettings → PageContent → HandwrittenLineParser → HandwrittenChar
  - **Word Spacing Control**: wordSpacing prop (0-8px) controls gaps between words via marginRight style and dynamic space widths
  - **Random Variation Control**: variation prop (0-2) multiplies character rotation, offset, and scale values in generateCharStyle
  - **Consistent Math Rendering**: HandwrittenSqrt, HandwrittenFraction, HandwrittenStrike all accept variation, wordSpacing, and textColor props for consistent styling
  - **Processing Mode Awareness**: processingMode flows through App → ResultsScreen → PageContent
  - **OCR Mode**: Direct OCR mode disables margin label detection - all content goes on main lines only
  - **Paragraph Style**: EditorSettings includes paragraphStyle (none/dot/digit/letter) and alignment (left/center/right)
  - **Text Alignment**: HandwrittenLineParser uses flex justifyContent for center/right alignment support
