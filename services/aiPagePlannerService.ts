import {
  PlanningMode,
  NotebookLayoutPlan,
  LayoutBlock,
  DEFAULT_PAGE_INFO,
  DEFAULT_ZONES,
  DEFAULT_GLOBAL_STYLE,
  BlockType,
} from '../types/pagePlan';

export class AIPagePlannerService {
  private async callPlannerFunction(
    text: string,
    mode: PlanningMode,
    pageCount: number
  ): Promise<NotebookLayoutPlan> {
    const response = await fetch('/api/ai-page-planner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, mode, pageCount }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('AI page planner function error:', data);
      throw new Error(data.error || 'Failed to call AI planner');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data.plan as NotebookLayoutPlan;
  }

  async planLayout(
    extractedTexts: string[],
    mode: PlanningMode = 'medium',
    onProgress?: (status: string) => void
  ): Promise<NotebookLayoutPlan[]> {
    const plans: NotebookLayoutPlan[] = [];

    try {
      onProgress?.(`AI analyzing document in ${mode} mode...`);

      const combinedText = extractedTexts
        .map((text, i) => `=== PAGE ${i + 1} ===\n${text}`)
        .join('\n\n');

      onProgress?.('AI creating detailed layout plan...');

      const plan = await this.callPlannerFunction(
        combinedText,
        mode,
        extractedTexts.length
      );

      const validatedPlan = this.validatePlan(plan);
      plans.push(validatedPlan);

      onProgress?.(`${mode === 'finer' ? 'Finer' : 'Medium'} mode plan ready`);
      return plans;
    } catch (error) {
      console.warn('AI planning failed, using fallback:', error);
      onProgress?.('Using fallback planning...');
      return extractedTexts.map((text, idx) =>
        this.createFallbackPlan(text, idx)
      );
    }
  }

  private validatePlan(plan: NotebookLayoutPlan): NotebookLayoutPlan {
    return {
      pageInfo: {
        ...DEFAULT_PAGE_INFO,
        ...plan.pageInfo,
      },
      zones: {
        leftMargin: {
          ...DEFAULT_ZONES.leftMargin,
          ...plan.zones?.leftMargin,
        },
        mainBody: {
          ...DEFAULT_ZONES.mainBody,
          ...plan.zones?.mainBody,
        },
        topHeading: {
          ...DEFAULT_ZONES.topHeading,
          ...plan.zones?.topHeading,
        },
      },
      globalStyle: {
        ...DEFAULT_GLOBAL_STYLE,
        ...plan.globalStyle,
      },
      blocks: (plan.blocks || []).map((block, idx) =>
        this.validateBlock(block, idx)
      ),
    };
  }

  private validateBlock(block: Partial<LayoutBlock>, index: number): LayoutBlock {
    return {
      id: block.id || `block_${index + 1}`,
      type: block.type || 'paragraph',
      content: block.content || '',
      position: block.position || 'main_body',
      relativeSize: block.relativeSize || 'normal',
      underline: block.underline ?? false,
      emphasis: block.emphasis || 'none',
      lineCount: block.lineCount || 1,
      estimatedWidth: block.estimatedWidth,
      spacing: {
        before: block.spacing?.before ?? 5,
        after: block.spacing?.after ?? 5,
        indent: block.spacing?.indent ?? 0,
      },
      style: block.style
        ? {
            slant: block.style.slant ?? -2,
            pressure: block.style.pressure ?? 0.85,
            baselineDrift: block.style.baselineDrift ?? 0.3,
            wordSpacing: block.style.wordSpacing || 'normal',
          }
        : undefined,
    };
  }

  private createFallbackPlan(text: string, pageIndex: number): NotebookLayoutPlan {
    const lines = text.split('\n').filter((line) => line.trim());
    const blocks: LayoutBlock[] = [];

    lines.forEach((line, idx) => {
      const trimmedLine = line.trim();
      let type: BlockType = 'paragraph';
      let position: LayoutBlock['position'] = 'main_body';
      let relativeSize: LayoutBlock['relativeSize'] = 'normal';
      let underline = false;

      if (/^(Q\.?\s*\d+|Question\s*\d+)/i.test(trimmedLine)) {
        type = 'numbered_point';
        position = 'left_margin';
      } else if (/^(\d+\.|[\(\[]?[a-z][\)\]]\.?)/i.test(trimmedLine)) {
        type = 'numbered_point';
        position = 'left_margin';
      } else if (/^[→\->⟹•\-\*○]/.test(trimmedLine)) {
        type = trimmedLine.startsWith('→') || trimmedLine.startsWith('->') 
          ? 'arrow_point' 
          : 'bullet_point';
        position = 'left_margin';
      } else if (idx === 0 && trimmedLine.length < 50) {
        type = 'heading';
        position = 'top_center';
        relativeSize = 'large';
      } else if (trimmedLine.endsWith(':') && trimmedLine.length < 40) {
        type = 'subheading';
        relativeSize = 'medium';
        underline = true;
      } else if (/[+\-×÷=]/.test(trimmedLine) && /\d/.test(trimmedLine)) {
        type = 'math_expression';
      } else if (trimmedLine.includes(':') && trimmedLine.indexOf(':') < 30) {
        type = 'definition';
      }

      const fatigue = pageIndex * 0.03 + idx * 0.002;

      blocks.push({
        id: `block_${idx + 1}`,
        type,
        content: trimmedLine,
        position,
        relativeSize,
        underline,
        emphasis: 'none',
        lineCount: Math.ceil(trimmedLine.length / 45),
        spacing: {
          before: type === 'heading' ? 15 : type === 'subheading' ? 10 : 5,
          after: type === 'paragraph' ? 8 : 5,
          indent: position === 'left_margin' ? 5 : 25,
        },
        style: {
          slant: -2 + Math.random() * 2 + fatigue,
          pressure: 0.9 - fatigue * 0.15,
          baselineDrift: 0.2 + Math.random() * 0.3,
          wordSpacing: 'normal',
        },
      });
    });

    return {
      pageInfo: {
        ...DEFAULT_PAGE_INFO,
        marginLeft: 25 + Math.random() * 5,
        lineSpacingBase: 26 + Math.random() * 4,
      },
      zones: DEFAULT_ZONES,
      globalStyle: {
        ...DEFAULT_GLOBAL_STYLE,
        consistencyScore: 0.7 + Math.random() * 0.15,
      },
      blocks,
    };
  }
}

export const aiPagePlannerService = new AIPagePlannerService();
