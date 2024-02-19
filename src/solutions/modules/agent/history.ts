import { read, write } from "../../../modules/graph";

interface UnpersistedChatbotResponse {
  input: string;
  rephrasedQuestion: string;
  output: string;
  cypher: string | undefined;
}

export interface ChatbotResponse extends UnpersistedChatbotResponse {
  id: string;
}

// tag::clear[]
export async function clearHistory(sessionId: string): Promise<void> {
  await write(
    `
    MATCH (s:Session {id: $sessionId})-[:HAS_RESPONSE]->(r)
    DETACH DELETE r
  `,
    { sessionId }
  );
}
// end::clear[]

// tag::get[]
export async function getHistory(
  sessionId: string,
  limit: number = 5
): Promise<ChatbotResponse[]> {
  // tag::gettx[]
  const res = await read<ChatbotResponse>(
    `
      MATCH (:Session {id: $sessionId})-[:LAST_RESPONSE]->(last)
      MATCH path = (start)-[:NEXT*0..${limit}]->(last)
      WHERE length(path) = 5 OR NOT EXISTS { ()-[:NEXT]->(start) }
      UNWIND nodes(path) AS response
      RETURN response.id AS id,
        response.input AS input,
        response.rephrasedQuestion AS rephrasedQuestion,
        response.output AS output,
        response.cypher AS cypher,
        response.createdAt AS createdAt,
        [ (response)-[:CONTEXT]->(n) | elementId(n) ] AS context
    `,
    { sessionId }
  );
  // end::gettx[]

  // tag::getreturn[]
  return res;
  // end::getreturn[]
}
// end::get[]

// tag::save[]
/**
 * Save a question and response to the database
 *
 * @param {string} sessionId
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
  // tag::savetx[]
  const res = await write<{ id: string }>(
    `
    MERGE (session:Session { id: $sessionId }) // <1>

    // <2> Create new response
    CREATE (response:Response {
      id: randomUuid(),
      createdAt: datetime(),
      source: $source,
      input: $input,
      output: $output,
      rephrasedQuestion: $rephrasedQuestion,
      cypher: $cypher,
      ids: $ids
    })
    CREATE (session)-[:HAS_RESPONSE]->(response)

    WITH session, response

    CALL {
      WITH session, response

      // <3> Remove existing :LAST_RESPONSE relationship if it exists
      MATCH (session)-[lrel:LAST_RESPONSE]->(last)
      DELETE lrel

      // <4? Create :NEXT relationship
      CREATE (last)-[:NEXT]->(response)
    }


    // <5> Create new :LAST_RESPONSE relationship
    CREATE (session)-[:LAST_RESPONSE]->(response)

    // <6> Create relationship to context nodes
    WITH response

    CALL {
      WITH response
      UNWIND $ids AS id
      MATCH (context)
      WHERE elementId(context) = id
      CREATE (response)-[:CONTEXT]->(context)

      RETURN count(*) AS count
    }

    RETURN DISTINCT response.id AS id
  `,
    { sessionId, source, input, output, rephrasedQuestion, cypher: cypher, ids }
  );
  // end::savetx[]

  // tag::savereturn[]
  return res[0].id;
  // end::savereturn[]
}
// end::save[]
