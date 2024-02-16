import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import initAgent from "./agent";
import initLangGraphAgent from "./tools/graph-agent";
import { HumanMessage } from "langchain/schema";

// tag::call[]
export async function call(input: string, sessionId: string): Promise<string> {
  // // TODO: Replace this code with an agent
  // return new Promise((resolve) => {
  //   setTimeout(() => {
  //     resolve(input)
  //   }, 1000)
  // })

  // TODO: Singletons
  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const graph = await Neo4jGraph.initialize({
    url: process.env.NEO4J_URI as string,
    username: process.env.NEO4J_USERNAME as string,
    password: process.env.NEO4J_PASSWORD as string,
    database: process.env.NEO4J_DATABASE as string | undefined,
  });

  // const agent = await initAgent(llm, embeddings, graph);
  // const res = await agent.invoke({ input }, { configurable: { sessionId } });

  // console.log(res);

  // return res;

  const agent = await initLangGraphAgent(llm, embeddings, graph);

  const messages = [new HumanMessage(input)];
  const res = await agent.invoke({ sessionId, messages });

  console.log(res);

  return res.messages.reverse()[0].content;
}
// end::call[]
