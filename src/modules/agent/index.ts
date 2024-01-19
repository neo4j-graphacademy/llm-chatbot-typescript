import {
  AgentExecutor,
  createOpenAIFunctionsAgent,
  createReactAgent,
} from "langchain/agents";
import { DynamicStructuredTool, DynamicTool, Tool } from "langchain/tools";
import { llm } from "../llm";
import { initRetrievalChain } from "./tools/vector";
import {
  Runnable,
  RunnablePassthrough,
  RunnableSequence,
} from "langchain/runnables";
import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "langchain/prompts";
import { clearHistory, getHistory, saveHistory } from "./history";
import { rephraseQuestionChain } from "./chains/rephrase";
import { initGraphCypherQAChain } from "./tools/cypher";

let agent: RunnableSequence;
let executor: AgentExecutor;

export interface AgentInput {
  input: string;
  tools: Tool[];
}

export async function call(input: string, sessionId: string): Promise<string> {
  if (!executor) {
    const cypherChain = await initGraphCypherQAChain();
    // const retrievalChain = await initRetrievalChain();

    const tools = [
      new DynamicTool({
        name: "graph-cypher-qa-chain",
        description:
          "For retrieving movie information from the database including movie recommendations, actors and user ratings",
        func: async (input) => cypherChain.invoke(input),
      }),
      // new ChainTool({
      //   name: "neo4j-vector-retrieval-qa",
      //   description: "For finding or comparing movies by their plot",
      //   chain: async (input: any) => retrievalChain.invoke(input),
      // }),
      // new DynamicTool({
      //   name: "neo4j-vector-retrieval-qa",
      //   description: "For finding or comparing movies by their plot",
      //   func: async (input: any) => {
      //     return retrievalChain.invoke(input);
      //   },
      // }),
      // new DynamicStructuredTool({
      //   name: "random-number-generator",
      //   description: "generates a random number between two input numbers",
      //   schema: z.object({
      //     low: z.number().describe("The lower bound of the generated number"),
      //     high: z.number().describe("The upper bound of the generated number"),
      //   }),
      //   func: async ({ low, high }: { low: number; high: number }) =>
      //     (Math.random() * (high - low) + low).toString(), // Outputs still must be strings
      // }),
      // Forget memory
      new DynamicTool({
        name: "forget-conversation-memory",
        description:
          "for when the user asks for the memory to be cleared or for you to forget the recent messages",
        // returnDirect: true,
        func: async (_input: any, options: any) => {
          await clearHistory(options.configurable.sessionId);

          return "I have anmesia, lets start again";
        },
      }),
    ];

    // executor = await initializeAgentExecutorWithOptions(tools, llm, {
    //   memory,
    //   agentType: "openai-functions",
    //   verbose: true,
    //   agentArgs: {
    //     prefix: `
    //       You are Ebert, a movie recommendation chatbot.
    //       Answer the following questions truthfully, to the vest of your ability using the functions below.
    //       Refuse to answer any questions not related to movies or actors.
    //     `,
    //   },
    // });

    const agentprompt = ChatPromptTemplate.fromMessages([
      [
        "ai",
        `
      You are Ebert, a movie expert providing information about movies.
      Be as helpful as possible and return as much information as possible.
      Do not answer any questions that do not relate to movies, actors or directors.

      Do not answer any questions using your pre-trained knowledge, only use the information provided in the context.

      TOOLS:
      ------

      You have access to the following tools:

      {tools}

      To use a tool, please use the following format:


      \`\`\`
      Thought: Do I need to use a tool? Yes
      Action: the action to take, should be one of [{tool_names}]
      Action Input: the input to the action
      Observation: the result of the action
      \`\`\`

      When you have a response to say to the Human, or if you do not need to use a tool, you MUST use the format:

      \`\`\`
      Thought: Do I need to use a tool? No
      Final Answer: [your response here]
      \`\`\`

      Begin!

      Previous conversation history:
      {history}

      New input: {input}
      {agent_scratchpad}`,
      ],
    ]);

    const prompt = await pull<ChatPromptTemplate>(
      "hwchase17/openai-functions-agent"
    );

    // agent = await createReactAgent({
    agent = await createOpenAIFunctionsAgent({
      llm,
      tools,
      prompt,
      // prompt: agentprompt,
    });

    executor = new AgentExecutor({
      agent,
      tools,
      // verbose: true,
    });
  }

  // Get Conversation History
  // const history = await getHistory(sessionId);

  sessionId = Math.random().toString();

  const agentChain = await RunnableSequence.from([
    RunnablePassthrough.assign({
      history: () => [], // getHistory(sessionId),
    }),
    RunnablePassthrough.assign({
      input: () => rephraseQuestionChain,
    }),
    executor,
  ]);

  // console.log(history);

  // const result = await executor.invoke({
  //   input,
  //   history,
  // });

  const result = await agentChain.invoke(
    { question: input },
    { configurable: { sessionId } }
  );

  // Save History
  await saveHistory(sessionId, "human", input);
  await saveHistory(sessionId, "ai", result.output);

  return result.output;
}
