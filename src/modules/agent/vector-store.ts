import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import { llm, embeddings } from "../llm";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

import { Document } from "@langchain/core/documents";

const convertDocsToString = (documents: Document[]): string => {
  return JSON.stringify(documents);
};

export async function initVectorStore() {
  const vectorStore = await Neo4jVectorStore.fromExistingIndex(embeddings, {
    url: process.env.NEO4J_URI as string,
    username: process.env.NEO4J_USERNAME as string,
    password: process.env.NEO4J_PASSWORD as string,
    indexName: "moviePlots",
    textNodeProperty: "plot",
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

const TEMPLATE_STRING = `You are movie expert providing
information about movies based on provided sources.
Answer the user's question in the first person
to the best of your ability using only the resources provided.
Be verbose!
Include links to movies when a source field is included, for example: [The Adventures of Priscilla, Queen of the Desert](https://www.themoviedb.org/movie/2759) is a movie about...

<context>
{context}
</context>

Now, answer this question using the above context.

{question}`;

const answerGenerationPrompt = ChatPromptTemplate.fromTemplate(TEMPLATE_STRING);

export default async function call(
  question: string,
  sessionId: string
): Promise<string> {
  const store = await initVectorStore();
  const retriever = store.asRetriever();

  const documentRetrievalChain = RunnableSequence.from([
    (input) => input.question,
    retriever,
    convertDocsToString,
  ]);

  const retrievalChain = RunnableSequence.from([
    {
      context: documentRetrievalChain,
      question: (input: any) => input.question,
    },
    answerGenerationPrompt,
    llm,
    new StringOutputParser(),
  ]);

  const res = await retrievalChain.invoke({ question });

  return res;
}
