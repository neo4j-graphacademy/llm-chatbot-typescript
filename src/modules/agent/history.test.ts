import { close } from "../graph";
import { getHistory, saveHistory } from "./history";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";

describe("Conversation History", () => {
  let graph: Neo4jGraph;
  let ids: string[];

  beforeAll(async () => {
    graph = await Neo4jGraph.initialize({
      url: process.env.NEO4J_URI as string,
      username: process.env.NEO4J_USERNAME as string,
      password: process.env.NEO4J_PASSWORD as string,
    });

    // Delete responses
    await graph.query(
      'MATCH (s:Session)-[:HAS_RESPONSE]->(r:Response) WHERE s.id IN ["test-1", "test-2", "test-3"] DETACH DELETE s, r'
    );

    // Create some test sources to link to
    const [first] = (await graph.query(`
            MERGE (t1:TestSource {id: 1})
            MERGE (t2:TestSource {id: 2})
            MERGE (t3:TestSource {id: 3})

            RETURN [ elementId(t1), elementId(t2), elementId(t3) ] AS ids
        `)) as Record<string, any>[];

    ids = first.ids;
  });

  afterAll(async () => {
    await graph.close();
    await close();
  });

  it("should save conversation history", async () => {
    const sessionId = "test-1";
    const source = "cypher";
    const input = "Who directed The Matrix?";
    const rephrasedQuestion = "Director of The Matrix";
    const output = "The Matrix was directed by The Wachowskis";
    const cypher =
      'MATCH (p:Person)-[:DIRECTED]->(m:Movie {title: "The Matrix"}) RETURN p.name AS name';

    // Save message
    const id = await saveHistory(
      sessionId,
      source,
      input,
      rephrasedQuestion,
      output,
      ids,
      cypher
    );

    expect(id).toBeDefined();

    // Get History
    const history = await getHistory(sessionId, 5);

    expect(history?.length).toBeGreaterThanOrEqual(1);

    const returnedIds = history.map((m) => m.id);

    // Was message returned in the history
    expect(returnedIds).toContain(id);

    // Check sources
    const res = await graph.query(
      `
        MATCH (s:Session {id: $sessionId})-[:LAST_RESPONSE]->(r)
        RETURN r { .* } AS properties,
        [ (r)-[:CONTEXT]->(c) | elementId(c) ] AS context
      `,
      { sessionId }
    );

    expect(res).toBeDefined();
    expect(res?.length).toBeGreaterThanOrEqual(1);

    // Has context been linked?
    const first = res![0];

    expect(first.properties.id).toEqual(id);
    expect(first.properties.source).toEqual(source);
    expect(first.properties.input).toEqual(input);
    expect(first.properties.rephrasedQuestion).toEqual(rephrasedQuestion);
    expect(first.properties.cypher).toEqual(cypher);
    expect(first.properties.output).toEqual(output);

    // Have all context nodes been linked to?
    for (const id of ids) {
      expect(first.context).toContain(id);
    }
  });

  it("should save a chain of responses", async () => {
    const sessionId = "test-3";
    const source = "retriever";
    const firstInput = "Who directed Toy Story?";
    const secondInput = "Who acted in it?";
    const thirdInput = "What else have the acted in together?";

    // Save message
    const messages = [
      await saveHistory(sessionId, source, firstInput, "", "", []),
      await saveHistory(sessionId, source, secondInput, "", "", []),
      await saveHistory(sessionId, source, thirdInput, "", "", []),
    ];

    for (const message of messages) {
      expect(message).toBeDefined();
    }

    // Get History
    const history = await getHistory(sessionId, 5);

    const returnedIds = history.map((m) => m.id).join(",");

    // Responses should be returned in order
    expect(messages.join(",")).toBe(returnedIds);
  });
});
