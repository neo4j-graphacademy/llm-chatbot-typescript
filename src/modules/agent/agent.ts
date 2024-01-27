import { Embeddings } from "@langchain/core/embeddings";
import { BaseLanguageModel } from "langchain/base_language";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { initRetrievalChain } from "./tools/vector-retrieval.chain";
import { initCypherQAChain } from "./tools/cypher/cypher-qa.chain";
import { DynamicTool } from "@langchain/core/tools";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { pull } from "langchain/hub";
import initRephraseChain from "./chains/rephrase-question.chain";
import { BaseChatModel } from "langchain/chat_models/base";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { getHistory, saveHistory } from "./history";
import { BaseMessage } from "langchain/schema";
import { StringOutputParser } from "@langchain/core/output_parsers";


export default async function initAgent(llm: BaseChatModel, embeddings: Embeddings, graph: Neo4jGraph) {
    const retrievalChain = await initRetrievalChain(llm, embeddings)
    const cypherChain = await initCypherQAChain(llm, graph)

    const tools = [
        new DynamicTool({
            name: 'graph-cypher-qa-chain',
            description: "For retrieving movie information from the database including movie recommendations, actors and user ratings",
             func: async (input) => cypherChain.invoke(input),
        }),
        new DynamicTool({
            name: "neo4j-vector-retrieval-qa",
            description: "For finding or comparing movies by their plot",
            func: async (input: any) => {
                const res = await retrievalChain.invoke(input)
                return res.answer
            }
      }),
    ]

    const prompt = await pull<ChatPromptTemplate>(
        "hwchase17/openai-functions-agent"
      );

      // agent = await createReactAgent({
      const agent = await createOpenAIFunctionsAgent({
        llm,
        tools,
        prompt,
        // prompt: agentprompt,
      });

      const executor = new AgentExecutor({
        agent,
        tools,
        verbose: true,
      });

      const rephraseQuestionChain = await initRephraseChain(llm)

      return RunnableSequence.from<{input: string}, string>([
          // {input: string}
          RunnablePassthrough.assign({
            // Assign a response ID up front
            // TODO: Generate a UUID
            // TODO: Move to a configurable?
            responseId: () => Math.random().toString(),
            // Get Message History
            history: (input_, options) => getHistory(options?.config.configurable.sessionId),
          }),
          // {input: string, responseId: string, history: string}
          RunnablePassthrough.assign({
            // Rephrase the question
            rephrasedQuestion: (input: { input: string, history: BaseMessage[], responseId: string }) => rephraseQuestionChain.invoke(input),
          }),
          // {input: string, responseId: string, history: BaseMessage, rephrasedQuestion: string}
          RunnablePassthrough.assign({
            // Get the response - tool will save info to graph using responseId
            output: async (input: { input: string, history: BaseMessage[], responseId: string, rephrasedQuestion: string }, options) => {
              const res = await executor.invoke({ input: input.rephrasedQuestion }, { configurable: { sessionId: options?.config.sessionId }})
              return res.output
            },
          }),
          // {input: string, responseId: string, history: BaseMessage, rephrasedQuestion: string, output: string}
          RunnablePassthrough.assign({
            responseId: async (input, options): Promise<string | undefined> => {
              if (options?.config.sessionId) {
                await saveHistory(options?.config.sessionId, "human", input, undefined);
                const id = await saveHistory(options?.config.sessionId, "ai", input.output, input.responseId);

                return id
              }
            },
          }),
          // {input: string, history: BaseMessage, rephrasedQuestion: string, output: string, responseId: string }
          // TODO: stream
          (res) => {
            console.log('>>', res);

            return res.output
          }
        ]);

}