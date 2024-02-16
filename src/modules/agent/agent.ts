import { Embeddings } from "@langchain/core/embeddings";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import {
  DynamicStructuredTool,
  DynamicTool,
  StructuredTool,
} from "@langchain/core/tools";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  AgentExecutor,
  createOpenAIFunctionsAgent,
  createReactAgent,
} from "langchain/agents";
import { pull } from "langchain/hub";
import initRephraseChain, {
  RephraseQuestionInput,
} from "./chains/rephrase-question.chain";
import { BaseChatModel } from "langchain/chat_models/base";
import { RunnablePassthrough } from "@langchain/core/runnables";
import { getHistory } from "./history";
import { initVectorRetrievalChain } from "./tools/vector-retrieval.chain";
import initCypherRetrievalChain from "./tools/cypher/cypher-retrieval.chain";
import {
  AgentToolInput,
  AgentToolInputSchema,
  ChatAgentInput,
} from "./agent.types";

export default async function initAgent(
  llm: BaseChatModel,
  embeddings: Embeddings,
  graph: Neo4jGraph
) {
  const retrievalChain = await initVectorRetrievalChain(llm, embeddings);
  const cypherChain = await initCypherRetrievalChain(llm, graph);

  const tools = [
    new DynamicStructuredTool({
      name: "graph-cypher-retrieval-chain",
      description:
        "For retrieving movie information from the database including movie recommendations, actors and user ratings",
      schema: AgentToolInputSchema,
      func: (input, runManager_, config) => {
        console.log("func", { config });

        return cypherChain.invoke(input, config);
      },
    }),
    // new DynamicStructuredTool({
    //   name: "graph-vector-retrieval-chain",
    //   description: "For finding or comparing movies by their plot",
    //   schema: AgentToolInputSchema,
    //   // @ts-ignore
    //   func: (input, runManager_, config) =>
    //     retrievalChain.invoke(input, config),
    // }),
  ];

  const prompt = await pull<ChatPromptTemplate>(
    "hwchase17/openai-functions-agent"
  );
  // const prompt = await pull<ChatPromptTemplate>("hwchase17/react");

  // const agent = await createReactAgent({
  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools,
    prompt,
    // prompt: agentprompt,
  });

  const executor = new AgentExecutor({
    agent,
    tools,
    // verbose: true,
  });

  const rephraseQuestionChain = await initRephraseChain(llm);

  return (
    RunnablePassthrough.assign<{ input: string; sessionId: string }, any>({
      // Get Message History
      history: async (input_, options) => {
        const history = await getHistory(
          options?.config.configurable.sessionId
        );

        return history;
      },
    })
      .assign({
        // Use History to rephrase the question
        rephrasedQuestion: (input: RephraseQuestionInput, config: any) =>
          rephraseQuestionChain.invoke(input, config),
      })

      // Pass to the executor
      .assign({
        output: async (input, options) => {
          console.log("before", options?.configurable.sessionId);

          const res = await executor.invoke(input, {
            configurable: { sessionId: options?.configurable.sessionId },
          });

          return res.output;
        },
      })
      .pick("output")
  );
}
