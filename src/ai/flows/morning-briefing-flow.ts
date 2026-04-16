'use server';
/**
 * @fileOverview Genkit flow for generating a dashboard morning briefing.
 * 
 * - generateMorningBriefing - Synthesizes organization-wide data into a quick briefing.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const BriefingInputSchema = z.object({
  orgName: z.string(),
  userName: z.string(),
  projects: z.array(z.object({
    name: z.string(),
    status: z.string(),
    progress: z.number(),
    budget: z.number(),
  })),
  totalSpent: z.number(),
  recentActivities: z.array(z.object({
    name: z.string(),
    projectName: z.string(),
    createdAt: z.string(),
  })),
});

export type BriefingInput = z.infer<typeof BriefingInputSchema>;

const BriefingOutputSchema = z.object({
  greeting: z.string().describe('A personalized greeting for the user.'),
  summary: z.string().describe('A 2-3 sentence summary of the organization health.'),
  topPriorities: z.array(z.string()).describe('List of 3 urgent items or milestones to focus on.'),
  statusAlert: z.string().optional().describe('Any critical flags, like budget overruns.'),
});

export type BriefingOutput = z.infer<typeof BriefingOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateMorningBriefingPrompt',
  input: { schema: BriefingInputSchema },
  output: { schema: BriefingOutputSchema },
  prompt: `You are the NGOTrack Intelligence Assistant.
  
Generate a concise morning briefing for {{{userName}}} at {{{orgName}}}.

Data Context:
- Projects: {{#each projects}}{{{name}}} ({{{status}}}, {{{progress}}}% complete), {{/each}}
- Financials: Total Budget Spent: {{{totalSpent}}} USD.
- Recent Activities: {{#each recentActivities}}{{{name}}} on project {{{projectName}}}, {{/each}}

Instructions:
1. Keep the summary professional and data-driven.
2. Identify projects that might be lagging or have high completion.
3. Suggest priorities based on the status of these projects.
4. Be encouraging but realistic.`,
});

export async function generateMorningBriefing(input: BriefingInput): Promise<BriefingOutput> {
  const { output } = await prompt(input);
  if (!output) throw new Error('Failed to generate briefing');
  return output;
}
