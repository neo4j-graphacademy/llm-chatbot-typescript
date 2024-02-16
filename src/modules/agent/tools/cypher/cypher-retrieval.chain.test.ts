// TODO: Remove code
import { ChatOpenAI } from "@langchain/openai";
import { config } from "dotenv";
import { BaseChatModel } from "langchain/chat_models/base";
import { Runnable } from "@langchain/core/runnables";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import initCypherRetrievalChain from "./cypher-retrieval.chain";

describe("Cypher QA Chain", () => {
  let graph: Neo4jGraph;
  let llm: BaseChatModel;
  let chain: Runnable;

  beforeAll(async () => {
    config({ path: ".env.local" });

    graph = await Neo4jGraph.initialize({
      url: process.env.NEO4J_URI as string,
      username: process.env.NEO4J_USERNAME as string,
      password: process.env.NEO4J_PASSWORD as string,
      database: process.env.NEO4J_DATABASE as string | undefined,
    });

    llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-3.5-turbo",
      temperature: 0,
    });

    chain = await initCypherRetrievalChain(llm, graph);
  });

  afterAll(async () => {
    await graph.close();
  });

  it("should answer a simple question", async () => {
    const sessionId = "cypher-retrieval-1";

    const res = (await graph.query(
      `MATCH (n:Movie) RETURN count(n) AS count`
    )) as { count: number }[];

    expect(res).toBeDefined();

    const output = await chain.invoke(
      {
        input: "how many are there?",
        rephrasedQuestion: "How many Movies are in the database?",
      },
      { configurable: { sessionId } }
    );

    expect(output).toContain(res[0].count);
  }, 20000);

  it("should answer a random question", async () => {
    const sessionId = "cypher-retrieval-2";

    const person = "Emil Eifrem";
    const role = "The Chief";
    const movie = "Neo4j - Into the Graph";

    // Save a fake movie to the database
    await graph.query(
      `
        MERGE (m:Movie {title: $movie})
        MERGE (p:Person {name: $person}) SET p:Actor
        MERGE (p)-[r:ACTED_IN]->(m)
        SET r.role = $role, r.roles = $role
        RETURN
          m { .title, _id: elementId(m) } AS movie,
          p { .name, _id: elementId(p) } AS person
      `,
      { movie, person, role }
    );

    const input = "what did they play?";
    const rephrasedQuestion = `What role did ${person} play in ${movie}`;

    const output = await chain.invoke(
      {
        input,
        rephrasedQuestion,
      },
      { configurable: { sessionId } }
    );

    expect(output).toContain(person);
    expect(output).toContain(role);
    expect(output).toContain(movie);

    // Check persistence
    const contextRes = await graph.query(
      `
      MATCH (s:Session {id: $sessionId})-[:LAST_RESPONSE]->(r)
      RETURN
        r.input AS input,
        r.rephrasedQuestion as rephrasedQuestion,
        r.output AS output,
        [ (m)-[:CONTEXT]->(c) | elementId(c) ] AS ids
    `,
      { sessionId }
    );

    expect(contextRes).toBeDefined();
    if (contextRes) {
      const [first] = contextRes;
      expect(contextRes.length).toBe(1);

      expect(first.input).toEqual(input);
      expect(first.rephrasedQuestion).toEqual(rephrasedQuestion);
      expect(first.output).toEqual(output);
    }
  }, 20000);

  it("should use elementId() to return a node ID", async () => {
    const sessionId = "cypher-retrieval-3";
    const person = "Emil Eifrem";
    const role = "The Chief";
    const movie = "Neo4j - Into the Graph";

    // Save a fake movie to the database
    const seed = await graph.query(
      `
        MERGE (m:Movie {title: $movie})
        MERGE (p:Person {name: $person}) SET p:Actor
        MERGE (p)-[r:ACTED_IN]->(m)
        SET r.role = $role, r.roles = $role
        RETURN
          m { .title, _id: elementId(m) } AS movie,
          p { .name, _id: elementId(p) } AS person
      `,
      { movie, person, role }
    );

    const output = await chain.invoke(
      {
        input: "what did they play?",
        rephrasedQuestion: `What movies has ${person} acted in?`,
      },
      { configurable: { sessionId } }
    );
    expect(output).toContain(person);
    expect(output).toContain(movie);

    // check context
    const contextRes = await graph.query(
      `
      MATCH (s:Session {id: $sessionId})-[:LAST_RESPONSE]->(r)
      RETURN
        r.input AS input,
        r.rephrasedQuestion as rephrasedQuestion,
        r.output AS output,
        [ (m)-[:CONTEXT]->(c) | elementId(c) ] AS ids
    `,
      { sessionId }
    );

    expect(contextRes).toBeDefined();
    if (contextRes) {
      expect(contextRes.length).toBe(1);

      const contextIds = contextRes[0].ids.join(",");
      const seedIds = seed?.map((el) => el.movie._id);

      for (const id in seedIds) {
        expect(contextIds).toContain(id);
      }
    }
  }, 20000);
});
