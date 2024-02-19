import { z } from "zod";

// tag::toolinput[]
export interface ChatAgentInput {
  input: string;
}
// end::toolinput[]

// tag::agenttoolinput[]
export interface AgentToolInput {
  input: string;
  rephrasedQuestion: string;
}
// end::agenttoolinput[]

// tag::schema[]
export const AgentToolInputSchema = z.object({
  input: z.string().describe("The original input sent by the user"),
  rephrasedQuestion: z
    .string()
    .describe(
      "A rephrased version of the original question based on the conversation history"
    ),
});
// end::schema[]
