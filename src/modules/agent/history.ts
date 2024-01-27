import { MessageType } from "@langchain/core/messages";
import { read, write } from "../graph";
import { int } from "neo4j-driver";
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages"

interface DatabaseMessage {
  type: "human" | "ai";
  content: string;
}

interface PersistedDatabaseMessage extends DatabaseMessage {
  id: string;
}

export async function clearHistory(sessionId: string): Promise<void> {
  await write(
    `
    MATCH (s:Session {id: $sessionId})-[:HAS_MESSAGE]->(m)
    DETACH DELETE m
  `,
    { sessionId }
  );
}

export async function getHistory(
  sessionId: string,
  limit: number = 5
): Promise<BaseMessage[]> {
  const res = await read<PersistedDatabaseMessage>(
    `
        MATCH (:Session {id: $sessionId})-[:HAS_MESSAGE]->(m)
        WITH m.id AS id,
            m.type AS type,
            m.content AS content,
            m.createdAt AS createdAt
        ORDER BY m.createdAt DESC LIMIT $limit
        RETURN *
        ORDER BY createdAt ASC
    `,
    { sessionId, limit: int(limit) }
  );

  return res.map((record) =>
    record.type === "ai"
      ? new AIMessage(record.content)
      : new HumanMessage(record.content)
  );
}

export async function saveHistory(
  sessionId: string,
  type: MessageType,
  content: string,
  responseId: string | undefined
): Promise<string> {
  const res = await write<{id: string}>(
    `
      MERGE (s:Session {id: $sessionId})
      WITH s

      CREATE (m:Message {
          type: $type,
          content: $content,
          createdAt: datetime(),
          id: coalesce($responseId, randomUuid())
      })
      CREATE (s)-[:HAS_MESSAGE]->(m)

      WITH s, m

      CALL {
        WITH s, m
        MATCH (s:Session)-[r:LAST_MESSAGE]->(l)

        DELETE r
        CREATE (l)-[:NEXT_MESSAGE]->(m)
      }

      CREATE (s)-[:LAST_MESSAGE]->(m)

      RETURN l.id AS id
    `,
    { sessionId, responseId, type, content }
  );
  return res[0].id
}

/**
 * Save sources provided during rag
 *
 * @param input
 * @param options
 */
export async function saveSources(
  input: { question: string, context: string, answer: string },
  options: { configurable: { responseId: string, context: string }}
): Promise<boolean>{
  if (options.configurable?.responseId) {
    await write<{id: string}>(`
      MERGE (r:Response {id: $responseId})
      UNWIND $context AS node
      MERGE (c:Chunk {chunkId: context.chunkId})
      ON CREATE SET c += $context
      MERGE (r)-[:USED_CONTEXT]->(c)
      RETURN
    `, { responseId: options.configurable.responseId, context: JSON.parse(input.context) })

    return true
  }

  return false
}

export async function saveGeneratedCypher(
  input: { question: string, context: string, validatedCypher: string },
  options: { configurable: { responseId: string, context: string }}
): Promise<boolean> {
  if (options.configurable?.responseId) {
    await write<{id: string}>(`
      MERGE (r:Response {id: $responseId})
      SET r.context = $context, r.cypher = $cypher
      UNWIND $context AS node
      MERGE (c:Chunk {chunkId: context.chunkId})
      ON CREATE SET c += $context
      MERGE (r)-[:USED_CONTEXT]->(c)
      RETURN
    `, { context: input.context, cypher: input.validatedCypher})

    return true
  }

  return false
}
