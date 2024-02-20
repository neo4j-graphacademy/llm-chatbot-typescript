import { BaseLanguageModel } from "langchain/base_language";
import { PromptTemplate } from "@langchain/core/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";

// tag::function[]
export default async function initCypherGenerationChain(
  graph: Neo4jGraph,
  llm: BaseLanguageModel
) {
  // tag::prompt[]
  // Create Prompt Template
  const cypherPrompt = PromptTemplate.fromTemplate(`
    You are a Neo4j Developer translating user questions into Cypher to answer questions
    about movies and provide recommendations.
    Convert the user's question into a Cypher statement based on the schema.

    You must:
    * Only use the nodes, relationships and properties mentioned in the schema.
    * When required, \`IS NOT NULL\` to check for property existence, and not the exists() function.
    * Use the \`elementId()\` function to return the unique identifier for a node or relationship as \`_id\`.
      For example:
      \`\`\`
      MATCH (a:Person)-[:ACTED_IN]->(m:Movie)
      WHERE a.name = 'Emil Eifrem'
      RETURN m.title AS title, elementId(m) AS _id, a.role AS role
      \`\`\`
    * Include extra information about the nodes that may help an LLM provide a more informative answer,
      for example the release date, rating or budget.
    * For movies, use the tmdbId property to return a source URL.
      For example: \`'https://www.themoviedb.org/movie/'+ m.tmdbId AS source\`.
    * For movie titles that begin with "The", move "the" to the end.
      For example "The 39 Steps" becomes "39 Steps, The" or "the matrix" becomes "Matrix, The".
    * Limit the maximum number of results to 10.
    * Respond with only a Cypher statement.  No preamble.


    Example Question: What role did Tom Hanks play in Toy Story?
    Example Cypher:
    MATCH (a:Actor {{name: 'Tom Hanks'}})-[rel:ACTED_IN]->(m:Movie {{title: 'Toy Story'}})
    RETURN a.name AS Actor, m.title AS Movie, elementId(m) AS _id, rel.role AS RoleInMovie

    Schema:
    {schema}

    Question:
    {question}
  `);
  // end::prompt[]

  // tag::sequence[]
  // tag::startsequence[]
  // Create the runnable sequence
  return RunnableSequence.from<string, string>([
    // end::startsequence[]
    // tag::assign[]
    {
      // Take the input and assign it to the question key
      question: new RunnablePassthrough(),
      // Get the schema
      schema: () => graph.getSchema(),
    },
    // end::assign[]
    // tag::rest[]
    cypherPrompt,
    llm,
    new StringOutputParser(),
    // end::rest[]
    // tag::endsequence[]
  ]);
  // end::endsequence[]
  // end::sequence[]
}
// end::function[]
