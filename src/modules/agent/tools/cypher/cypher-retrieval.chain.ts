import { BaseLanguageModel } from "langchain/base_language";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { RunnablePassthrough } from "@langchain/core/runnables";
import initCypherGenerationChain from "./cypher-generation.chain";
import initCypherEvaluationChain from "./cypher-evaluation.chain";
import { saveHistory } from "../../history";
import { AgentToolInput } from "../../agent.types";
import { extractIds } from "../../../../utils";
import initGenerateAuthoritativeAnswerChain from "../../chains/authoritative-answer-generation.chain";

// tag::input[]
type CypherRetrievalThroughput = AgentToolInput & {
  context: string;
  output: string;
  cypher: string;
  results: Record<string, any> | Record<string, any>[];
  ids: string[];
};
// end::input[]

// tag::recursive[]
/**
 * Use database the schema to generate and subsequently validate
 * a Cypher statement based on the user question
 *
 * @param {Neo4jGraph}        graph     The graph
 * @param {BaseLanguageModel} llm       An LLM to generate the Cypher
 * @param {string}            question  The rephrased question
 * @returns {string}
 */
export async function recursivelyEvaluate(
  graph: Neo4jGraph,
  llm: BaseLanguageModel,
  question: string
): Promise<string> {
  // TODO: Create Cypher Generation Chain
  // const generationChain = ...
  // TODO: Create Cypher Evaluation Chain
  // const evaluatorChain = ...
  // TODO: Generate Initial cypher
  // let cypher = ...
  // TODO: Recursively evaluate the cypher until there are no errors
  // tag::evaluatereturn[]
  // Bug fix: GPT-4 is adamant that it should use id() regardless of
  // the instructions in the prompt.  As a quick fix, replace it here
  // cypher = cypher.replace(/\sid\(([^)]+)\)/g, " elementId($1)");
  // return cypher;
  // end::evaluatereturn[]
}
// end::recursive[]

// tag::results[]
/**
 * Attempt to get the results, and if there is a syntax error in the Cypher statement,
 * attempt to correct the errors.
 *
 * @param {Neo4jGraph}        graph  The graph instance to get the results from
 * @param {BaseLanguageModel} llm    The LLM to evaluate the Cypher statement if anything goes wrong
 * @param {string}            input  The input built up by the Cypher Retrieval Chain
 * @returns {Promise<Record<string, any>[]>}
 */
export async function getResults(
  graph: Neo4jGraph,
  llm: BaseLanguageModel,
  input: { question: string; cypher: string }
): Promise<any | undefined> {
  // TODO: catch Cypher errors and pass to the Cypher evaluation chain
}
// end::results[]

// tag::function[]
export default async function initCypherRetrievalChain(
  llm: BaseLanguageModel,
  graph: Neo4jGraph
) {
  // TODO: initiate answer chain
  // const answerGeneration = ...
  // TODO: return RunnablePassthrough
}
// end::function[]
