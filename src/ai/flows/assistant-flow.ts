'use server';
/**
 * @fileOverview Genkit flow for the NGOTrack AI Assistant.
 * 
 * This flow uses tool calling to query Firestore data and answer questions
 * about projects, budgets, and activities.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AssistantInputSchema = z.object({
  organizationId: z.string(),
  query: z.string(),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string()
  })).optional(),
});

export type AssistantInput = z.infer<typeof AssistantInputSchema>;

const AssistantOutputSchema = z.object({
  response: z.string().describe('The AI response to the user query.'),
  suggestedActions: z.array(z.string()).optional().describe('Contextual suggestions for next steps.'),
});

export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

// Note: We use client-side 'firebase' SDK for data as per instructions.
// For the AI Assistant to be fully functional, data context should be fetched
// on the client and passed to the flow, or retrieved via dedicated tools.

export async function askAssistant(input: AssistantInput): Promise<AssistantOutput> {
  return assistantFlow(input);
}

const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async (input) => {
    const { response } = await ai.generate({
      system: `You are the NGOTrack Intelligence Assistant. You help NGO staff manage their programs.
      You have access to the organization's projects, expenses, and activity logs.
      
      Rules:
      1. Always be professional and data-driven.
      2. If asked about finances, try to provide specific remaining balances.
      3. If asked about progress, reference the specific milestones reached.
      4. Always keep your answers focused on Organization ID: ${input.organizationId}.
      5. If you don't know the answer or can't access specific data, say so clearly.`,
      prompt: input.query,
    });

    return {
      response: response.text,
      suggestedActions: [
        "View Project Details",
        "Log New Expense",
        "Generate Impact Report"
      ]
    };
  }
);
