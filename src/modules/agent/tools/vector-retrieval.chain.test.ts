import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { config } from "dotenv";
import { BaseChatModel } from "langchain/chat_models/base";
import { Embeddings } from "langchain/embeddings/base";
import { Runnable } from "@langchain/core/runnables";
import initVectorRetrievalChain from "./vector-retrieval.chain";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { AgentToolInput } from "../agent.types";
import { close } from "../../graph";

describe("Vector Retrieval Chain", () => {
  let graph: Neo4jGraph;
  let llm: BaseChatModel;
  let embeddings: Embeddings;
  let chain: Runnable<AgentToolInput, string>;

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
      configuration: {
        baseURL: process.env.OPENAI_API_BASE,
      },
    });

    embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY as string,
      configuration: {
        baseURL: process.env.OPENAI_API_BASE,
      },
    });

    chain = await initVectorRetrievalChain(llm, embeddings);
  });

  afterAll(async () => {
    await graph.close();
    await close();
  });

  it("should provide a recommendation", async () => {
    const sessionId = "vector-retriever-1";
    const input = "[redacted]";
    const rephrasedQuestion = "Recommend a movie about ghosts";

    const output = await chain.invoke(
      {
        input,
        rephrasedQuestion,
      },
      { configurable: { sessionId } }
    );

    // Should generate an answer
    expect(output).toBeDefined();

    // Should save to the database
    const res = await graph.query(
      `
        MATCH (s:Session {id: $sessionId})-[:LAST_RESPONSE]->(r)
        RETURN s.id AS session, r.input AS input, r.output AS output,
          r.rephrasedQuestion AS rephrasedQuestion,
          [ (r)-[:CONTEXT]->(m) | m.title ] AS context
        ORDER BY r.createdAt DESC LIMIT 1
    `,
      { sessionId }
    );

    expect(res).toBeDefined();

    // Should have properties set
    const [first] = res!;

    expect(first.input).toEqual(input);
    expect(first.rephrasedQuestion).toEqual(rephrasedQuestion);
    expect(first.output).toEqual(output);
    expect(first.input).toEqual(input);

    // Should save with context
    expect(first.context.length).toBeGreaterThanOrEqual(1);

    // Any of the movies in the context should be mentioned
    let found = false;

    for (const title of first.context) {
      if (output.includes(title.replace(", The", ""))) {
        found = true;
      }
    }

    expect(found).toBe(true);
  });
});
