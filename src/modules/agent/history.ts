import { initGraph } from "../graph";

type UnpersistedChatbotResponse = {
  input: string;
  rephrasedQuestion: string;
  output: string;
  cypher: string | undefined;
};

export type ChatbotResponse = UnpersistedChatbotResponse & {
  id: string;
};

// tag::clear[]
export async function clearHistory(sessionId: string): Promise<void> {
  const graph = await initGraph();
  await graph.query(
    `
    MATCH (s:Session {id: $sessionId})-[:HAS_RESPONSE]->(r)
    DETACH DELETE r
  `,
    { sessionId },
    "WRITE"
  );
}
// end::clear[]

// tag::get[]
export async function getHistory(
  sessionId: string,
  limit: number = 5
): Promise<ChatbotResponse[]> {
  // TODO: Execute the Cypher statement from /cypher/get-history.cypher in a read transaction
  // TODO: Use string templating to make the limit dynamic: 0..${limit}
  // const graph = await initGraph()
  // const res = await graph.query<ChatbotResponse>(cypher, { sessionId }, "READ")
  // return res
}
// end::get[]

// tag::save[]
/**
 * Save a question and response to the database
 *
 * @param {string} sessionId
 * @param {string} source
 * @param {string} input
 * @param {string} rephrasedQuestion
 * @param {string} output
 * @param {string[]} ids
 * @param {string | null} cypher
 * @returns {string}  The ID of the Message node
 */
export async function saveHistory(
  sessionId: string,
  source: string,
  input: string,
  rephrasedQuestion: string,
  output: string,
  ids: string[],
  cypher: string | null = null
): Promise<string> {
  // TODO: Execute the Cypher statement from /cypher/save-response.cypher in a write transaction
  // const graph = await initGraph()
  // const res = await graph.query<{id: string}>(cypher, params, "WRITE")
  // return res[0].id
}
// end::save[]
