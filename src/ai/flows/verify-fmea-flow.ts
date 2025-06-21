'use server';
/**
 * @fileOverview A Genkit flow for verifying FMEA JSON data against a set of rules.
 *
 * - verifyFmea - A function that handles the FMEA data verification process.
 * - VerifyFmeaInput - The input type for the verifyFmea function.
 * - VerifyFmeaOutput - The return type for the verifyFmea function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { FmeaApiResponse, ApiResponseType } from '@/types/fmea';
import type { RuleResult } from '@/lib/fmea-rules';
import { runAllRules } from '@/lib/fmea-rules';
import { parseJsonWithBigInt } from '@/lib/bigint-utils';

// Define the schema for the rule result, which will be part of the output
const RuleResultSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum(['correct', 'error', 'warning', 'info']),
  details: z.string().optional(),
});

// Define the input schema for the flow
export const VerifyFmeaInputSchema = z.object({
  fmeaJson: z.string().describe('The FMEA data as a JSON string.'),
  fmeaType: z.enum(['requirements', 'dfmea', 'pfmea']).describe('The type of FMEA data.'),
});
export type VerifyFmeaInput = z.infer<typeof VerifyFmeaInputSchema>;

// Define the output schema for the flow
export const VerifyFmeaOutputSchema = z.array(RuleResultSchema);
export type VerifyFmeaOutput = z.infer<typeof VerifyFmeaOutputSchema>;


// This is the main exported function that clients will call.
export async function verifyFmea(input: VerifyFmeaInput): Promise<VerifyFmeaOutput> {
  return verifyFmeaFlow(input);
}


// Define the Genkit flow
const verifyFmeaFlow = ai.defineFlow(
  {
    name: 'verifyFmeaFlow',
    inputSchema: VerifyFmeaInputSchema,
    outputSchema: VerifyFmeaOutputSchema,
  },
  async (input) => {
    try {
      const parsedData: FmeaApiResponse = parseJsonWithBigInt(input.fmeaJson);
      const results: RuleResult[] = runAllRules(parsedData, input.fmeaType as ApiResponseType);
      
      // Zod will validate this structure upon return.
      return results;
    } catch (error: any) {
      console.error("Error in verifyFmeaFlow:", error);
      // Return a structured error that fits the schema, so clients can handle it.
      return [{
        id: 'flow-error',
        description: 'A critical error occurred while running the verification flow.',
        status: 'error',
        details: `Failed to verify FMEA data: ${error.message}`
      }];
    }
  }
);
