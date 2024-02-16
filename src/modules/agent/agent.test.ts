import initAgent from "./agent";
import { config } from "dotenv";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Embeddings } from "langchain/embeddings/base";
import { BaseChatModel } from "langchain/chat_models/base";
import { Runnable, RunnableSequence } from "@langchain/core/runnables";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";

describe("Langchain Agent", () => {
  let llm: BaseChatModel;
  let embeddings: Embeddings;
  let graph: Neo4jGraph;
  let executor: Runnable;

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
      modelName: "gpt-4",
      temperature: 0,
    });

    embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY as string,
    });

    executor = await initAgent(llm, embeddings, graph);
  });

  describe("Question Rephrasing", () => {
    it("should ask the original question", () => {});

    it("should use history to rephrase a question", () => {});
  });

  describe("Vector Retrieval", () => {
    it("should perform RAG using the neo4j vector retriever", async () => {
      const sessionId = "1234";
      const input = "Recommend me a movie about ghosts";

      const res = await executor.invoke(
        {
          input,
        },
        {
          configurable: {
            sessionId,
          },
        }
      );

      expect(res).toContain("Ghost");
    }, 20000);
  });
});
