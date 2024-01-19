import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";

import { Embeddings } from "@langchain/core/embeddings";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import { embeddings, llm } from "@/modules/llm";
import { VectorStore } from "@langchain/core/vectorstores";

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

export async function initRetrievalChain(): Promise<RunnableSequence> {
  //  Create the vector store
  const vectorStore = await initVectorStore(embeddings);

  // Initialize a retriever wrapper around the vector store
  const vectorStoreRetriever = vectorStore.asRetriever();

  // Anseer Prompt
  const prompt = PromptTemplate.fromTemplate(`
    Use the following context to answer the question at the end.
    If you don't know the answer, just say that you don't know, don't try to make up an answer.
    Include links and sources where possible.

    Context: {context}

    Question: {input}
  `);

  return RunnableSequence.from([
    RunnablePassthrough.assign({
      context: vectorStoreRetriever.pipe((docs) => JSON.stringify(docs)),
      input: new RunnablePassthrough(),
    }),
    prompt,
    llm,
    new StringOutputParser(),
  ]);
}

export default async function initRetrievalQAChain(): Promise<RunnableSequence> {
  //  Create the vector store
  const vectorStore = await initVectorStore(embeddings);

  // Initialize a retriever wrapper around the vector store
  const vectorStoreRetriever = vectorStore.asRetriever();

  // Create a system & human prompt for the chat model
  const SYSTEM_TEMPLATE = `
    Use the following context to answer the question at the end.
      If you don't know the answer, just say that you don't know, don't try to make up an answer.

    <context>
      {context}
    </context>

    Question: {question}`;

  // Create a runnable sequence for retrieving documents from the vector store
  const messages = [
    SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
    new MessagesPlaceholder("history"),
    HumanMessagePromptTemplate.fromTemplate("{question}"),
  ];

  const prompt = ChatPromptTemplate.fromMessages(messages);

  const chain = RunnableSequence.from([
    {
      context: vectorStoreRetriever.pipe((docs) => JSON.stringify(docs)),
      input: new RunnablePassthrough(),
    },
    prompt,
    llm,
    new StringOutputParser(),
  ]);

  return chain;
}
