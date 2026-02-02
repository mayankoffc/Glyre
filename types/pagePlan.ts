// AI Page Planning Types - Notebook Layout Structure

export type PlanningMode = 'medium' | 'finer';

export type BlockType = 
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'numbered_point'
  | 'arrow_point'
  | 'bullet_point'
  | 'math_expression'
  | 'definition';

export type BlockPosition = 'left_margin' | 'main_body' | 'top_center';

export type RelativeSize = 'large' | 'medium' | 'normal' | 'small';

export type WordSpacing = 'tight' | 'normal' | 'loose';

export type EmphasisType = 'none' | 'circle' | 'box' | 'highlight';

export interface BlockSpacing {
  before: number;
  after: number;
  indent: number;
}

export interface BlockStyle {
  slant: number;
  pressure: number;
  baselineDrift: number;
  wordSpacing: WordSpacing;
}

export interface LayoutBlock {
  id: string;
  type: BlockType;
  content: string;
  position: BlockPosition;
  relativeSize: RelativeSize;
  underline: boolean;
  emphasis?: EmphasisType;
  lineCount: number;
  estimatedWidth?: number;
  spacing: BlockSpacing;
  style?: BlockStyle;
}

export interface ZoneConfig {
  leftMargin: {
    width: number;
    purpose?: string;
  };
  mainBody: {
    startX: number;
    width: number;
  };
  topHeading: {
    height: number;
    alignment?: 'center' | 'left' | 'right';
  };
}

export interface PageInfo {
  width: number;
  height: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  lineSpacingBase: number;
  lineSpacingVariation?: number;
  lineSpacingStyle?: string;
}

export interface GlobalStyle {
  pressureCurve: number[];
  slantProgression: number[];
  neatnessDecay: number;
  consistencyScore: number;
}

export interface NotebookLayoutPlan {
  pageInfo: PageInfo;
  zones: ZoneConfig;
  globalStyle?: GlobalStyle;
  blocks: LayoutBlock[];
}

export interface AIPagePlanResponse {
  plan: NotebookLayoutPlan;
  mode: PlanningMode;
}

// Fallback/default values
export const DEFAULT_PAGE_INFO: PageInfo = {
  width: 794,
  height: 1123,
  marginLeft: 25,
  marginRight: 15,
  marginTop: 20,
  marginBottom: 30,
  lineSpacingBase: 28,
  lineSpacingVariation: 2,
};

export const DEFAULT_ZONES: ZoneConfig = {
  leftMargin: { width: 20, purpose: 'numbering_bullets' },
  mainBody: { startX: 25, width: 700 },
  topHeading: { height: 50, alignment: 'center' },
};

export const DEFAULT_GLOBAL_STYLE: GlobalStyle = {
  pressureCurve: [0.9, 0.85, 0.75],
  slantProgression: [-2, -1, 0],
  neatnessDecay: 0.05,
  consistencyScore: 0.75,
};
