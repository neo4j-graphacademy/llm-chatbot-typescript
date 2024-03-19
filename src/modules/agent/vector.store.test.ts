import { OpenAIEmbeddings } from "@langchain/openai";
import initVectorStore from "./vector.store";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import { close } from "../graph";

describe("Vector Store", () => {
  afterAll(() => close());

  it("should instantiate a new vector store", async () => {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY as string,
      configuration: {
        baseURL: process.env.OPENAI_API_BASE,
      },
    });
    const vectorStore = await initVectorStore(embeddings);
    expect(vectorStore).toBeInstanceOf(Neo4jVectorStore);

    await vectorStore.close();
  });

  it("should create a test index", async () => {
    const indexName = "test-index";
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY as string,
      configuration: {
        baseURL: process.env.OPENAI_API_BASE,
      },
    });

    const index = await Neo4jVectorStore.fromTexts(
      ["Neo4j GraphAcademy offers free, self-paced online training"],
      [],
      embeddings,
      {
        url: process.env.NEO4J_URI as string,
        username: process.env.NEO4J_USERNAME as string,
        password: process.env.NEO4J_PASSWORD as string,
        nodeLabel: "Test",
        embeddingNodeProperty: "embedding",
        textNodeProperty: "text",
        indexName,
      }
    );

    expect(index).toBeInstanceOf(Neo4jVectorStore);
    expect(index["indexName"]).toBe(indexName);

    await index.close();
  });
});
