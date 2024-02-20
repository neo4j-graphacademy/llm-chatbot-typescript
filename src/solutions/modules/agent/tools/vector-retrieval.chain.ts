import {
  Runnable,
  RunnablePassthrough,
  RunnablePick,
} from "@langchain/core/runnables";
import { Embeddings } from "@langchain/core/embeddings";
import initGenerateAnswerChain from "../chains/answer-generation.chain";
import { BaseLanguageModel } from "langchain/base_language";
import initVectorStore from "../vector.store";
import { saveHistory } from "../history";
import { DocumentInterface } from "@langchain/core/documents";
import { AgentToolInput } from "../../../../modules/agent/agent.types";

// tag::throughput[]
type RetrievalChainThroughput = AgentToolInput & {
  context: string;
  output: string;
  ids: string[];
};
// end::throughput[]

// tag::extractDocumentIds[]
// Helper function to extract document IDs from Movie node metadata
const extractDocumentIds = (
  documents: DocumentInterface<{ _id: string; [key: string]: any }>[]
): string[] => documents.map((document) => document.metadata._id);
// end::extractDocumentIds[]

// tag::docsToJson[]
// Convert documents to string to be included in the prompt
const docsToJson = (documents: DocumentInterface[]) =>
  JSON.stringify(documents);
// end::docsToJson[]

// tag::function[]
export default async function initVectorRetrievalChain(
  llm: BaseLanguageModel,
  embeddings: Embeddings
): Promise<Runnable<AgentToolInput, string>> {
  // tag::vectorstore[]
  //  Create vector store instance
  const vectorStore = await initVectorStore(embeddings);
  // end::vectorstore[]

  // tag::retriever[]
  // Initialize a retriever wrapper around the vector store
  const vectorStoreRetriever = vectorStore.asRetriever(5);
  // end::retriever[]

  // tag::answerchain[]
  // Initialize  Answer Chain
  const answerChain = initGenerateAnswerChain(llm);
  // end::answerchain[]

  // tag::getcontext[]
  // Get the rephrased question and generate context
  return (
    RunnablePassthrough.assign({
      documents: new RunnablePick("rephrasedQuestion").pipe(
        vectorStoreRetriever
      ),
    })
      // end::getcontext[]
      // tag::mutatecontext[]
      .assign({
        // Extract the IDs
        ids: new RunnablePick("documents").pipe(extractDocumentIds),
        // convert documents to string
        context: new RunnablePick("documents").pipe(docsToJson),
      })
      // end::mutatecontext[]
      // tag::answer[]
      .assign({
        output: (input: RetrievalChainThroughput) =>
          answerChain.invoke({
            question: input.rephrasedQuestion,
            context: input.context,
          }),
      })
      // end::answer[]
      // tag::save[]
      .assign({
        responseId: async (input: RetrievalChainThroughput, options) =>
          saveHistory(
            options?.config.configurable.sessionId,
            "vector",
            input.input,
            input.rephrasedQuestion,
            input.output,
            input.ids
          ),
      })
      // end::save[]
      // tag::output[]
      .pick("output")
  );
  // end::output[]
}
// end::function[]
