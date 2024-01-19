import { MessageType } from "@langchain/core/messages";
import { BaseMessage, AIMessage, HumanMessage } from "langchain/schema";
import { read, write } from "../graph";
import { int } from "neo4j-driver";

interface DatabaseMessage {
  type: "human" | "ai";
  content: string;
}

interface PersistedDatabaseMessage extends DatabaseMessage {
  id: string;
}

type MessageTuple = [MessageType, string];

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
  content: string
): Promise<void> {
  await write(
    `
        MERGE (s:Session {id: $sessionId})
        WITH s

        CREATE (m:Message {
            type: $type,
            content: $content,
            createdAt: datetime(),
            id: randomUuid()
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
    `,
    { sessionId, type, content }
  );
}
