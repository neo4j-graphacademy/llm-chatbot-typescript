import { z } from "zod";

// tag::toolinput[]
export interface ChatAgentInput {
  input: string;
}
// end::toolinput[]

// tag::agenttoolinput[]
export interface AgentToolInput {
  sessionId: string;
  input: string;
  rephrasedQuestion: string;
}
// end::agenttoolinput[]

// tag::schema[]
export const AgentToolInputSchema = z.object({
  input: z.string().describe("The original question"),
  rephrasedQuestion: z
    .string()
    .describe("The rephrased question based on the conversation history"),
});
// end::schema[]
