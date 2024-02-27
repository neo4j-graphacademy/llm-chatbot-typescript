/* eslint-disable indent */
import { Embeddings } from "@langchain/core/embeddings";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";
import initRephraseChain, {
  RephraseQuestionInput,
} from "./chains/rephrase-question.chain";
import { BaseChatModel } from "langchain/chat_models/base";
import { RunnablePassthrough } from "@langchain/core/runnables";
import { getHistory } from "./history";
import initTools from "./tools";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";

// tag::function[]
export default async function initAgent(
  llm: BaseChatModel,
  embeddings: Embeddings,
  graph: Neo4jGraph
) {
  // TODO: Initiate tools
  // const tools = ...
  // TODO: Pull the prompt from the hub
  // const prompt = ...
  // TODO: Create an agent
  // const agent = ...
  // TODO: Create an agent executor
  // const executor = ...
  // TODO: Create a rephrase question chain
  // const rephraseQuestionChain = ...
  // TODO: Return a runnable passthrough
  // return ...
}
// end::function[]
