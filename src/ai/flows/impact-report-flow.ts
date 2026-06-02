
'use server';
/**
 * @fileOverview Genkit flow for generating NGO impact reports.
 *
 * - generateImpactReport - Synthesizes project data into a professional report.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ImpactReportInputSchema = z.object({
  projectName: z.string(),
  projectDescription: z.string(),
  activities: z.array(z.object({
    name: z.string(),
    description: z.string(),
    progressPercentage: z.number(),
    createdAt: z.string(),
  })),
  expenses: z.array(z.object({
    amount: z.number(),
    category: z.string(),
    description: z.string(),
  })),
  totalBudget: z.number(),
});

export type ImpactReportInput = z.infer<typeof ImpactReportInputSchema>;

const ImpactReportOutputSchema = z.object({
  summary: z.string().describe('A high-level executive summary of the project impact.'),
  milestonesReached: z.array(z.string()).describe('Key milestones achieved based on activities.'),
  financialEfficiency: z.string().describe('Analysis of how the budget was utilized.'),
  futureRecommendations: z.string().describe('Suggestions for the next phase of the project.'),
});

export type ImpactReportOutput = z.infer<typeof ImpactReportOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateImpactReportPrompt',
  input: { schema: ImpactReportInputSchema },
  output: { schema: ImpactReportOutputSchema },
  prompt: `You are an expert Monitoring and Evaluation (M&E) specialist for a global NGO.
  
Generate a professional impact report for the following project:

Project Name: {{{projectName}}}
Description: {{{projectDescription}}}
Total Budget: {{{totalBudget}}} CFA

Activities logged:
{{#each activities}}
- {{{name}}}: {{{description}}} ({{{progressPercentage}}}% complete as of {{{createdAt}}})
{{/each}}

Expenses incurred:
{{#each expenses}}
- {{{description}}}: {{{amount}}} CFA (Category: {{{category}}})
{{/each}}

Please provide:
1. An executive summary that highlights the tangible impact on the community.
2. A list of specific milestones reached.
3. An analysis of financial efficiency (budget vs spend).
4. Data-driven recommendations for future improvements.

Be professional, optimistic, and transparent.`,
});

export async function generateImpactReport(input: ImpactReportInput): Promise<ImpactReportOutput> {
  const { output } = await prompt(input);
  if (!output) throw new Error('Failed to generate impact report');
  return output;
}
