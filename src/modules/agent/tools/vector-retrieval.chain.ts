import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { Embeddings } from "@langchain/core/embeddings";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import { VectorStore } from "@langchain/core/vectorstores";
import { BaseLanguageModel } from "langchain/base_language";
import { saveSources } from "../history";
import initGenerateAnswerChain from "../chains/answer-generation.chain";


export interface RetrievalChainOutput {
  question: string;
  answer: string;
  saved: boolean;
  context: string;
}

async function initVectorStore(embeddings: Embeddings): Promise<VectorStore> {
  const vectorStore = await Neo4jVectorStore.fromExistingIndex(embeddings, {
    url: process.env.NEO4J_URI as string,
    username: process.env.NEO4J_USERNAME as string,
    password: process.env.NEO4J_PASSWORD as string,
    indexName: "moviePlots",
    retrievalQuery: `
        RETURN
            node.plot AS text,
            score,
            {
                title: node.title,
                directors: [ (person)-[:DIRECTED]->(node) | person.name ],
                actors: [ (person)-[r:ACTED_IN]->(node) | [person.name, r.role] ],
                tmdbId: node.tmdbId,
                source: 'https://www.themoviedb.org/movie/'+ node.tmdbId
            } AS metadata
    `,
  });

  return vectorStore;
}

export async function initRetrievalChain(llm: BaseLanguageModel, embeddings: Embeddings): Promise<RunnableSequence<string, RetrievalChainOutput>> {
  //  Create the vector store
  const vectorStore = await initVectorStore(embeddings);

  // Initialize a retriever wrapper around the vector store
  const vectorStoreRetriever = vectorStore.asRetriever();

  // Answer Prompt
  const answerChain = initGenerateAnswerChain(llm)

  return RunnableSequence.from<string, RetrievalChainOutput>([
    // Get the question and generate context
    {
      question: new RunnablePassthrough(),
      context: vectorStoreRetriever.pipe(docs => JSON.stringify(docs))
    },
    // Get the answer
    RunnablePassthrough.assign({
      answer: answerChain,
    }),

    // Save The responses
    // TODO: Is there a better way?
    // RunnablePassthrough.assign({
    //   saved: async (input, options: any) => {
    //     await saveSources(input, options)
    //   }
    // }),
  ])
}

