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
  // TODO: Create Prompt Template
  // const cypherPrompt = PromptTemplate.fromTemplate( ... )

  // TODO: Create the runnable sequence
  // return RunnableSequence.from<string, string>([

  // tag::prompt[]
  // Create Prompt Template
  const cypherPrompt = PromptTemplate.fromTemplate(`
    You are a Neo4j Developer translating user questions into Cypher to answer questions
    about movies and provide recommendations.
    Convert the user's question into a Cypher statement based on the schema.

    You must:
    * Only use the nodes, relationships and properties mentioned in the schema.
    * Use \`IS NOT NULL\` to check for property existence, and not the exists() function.
    * Use the \`elementId()\` function to return the unique identifier for a node or relationship as \`_id\`.
      For example:
      \`\`\`
      MATCH (a:Person)-[:ACTED_IN]->(m:Movie)
      WHERE a.name = 'Emil Eifrem'
      RETURN m.title AS title, elementId(m) AS _id, a.role AS role
      \`\`\`
    * Include extra information about the nodes that may help an LLM provide a more informative answer,
      for example the release date, rating or
    * For movies, use the tmdbId property to return a source URL.
      For example: \`'https://www.themoviedb.org/movie/'+ m.tmdbId AS source\`.
    * For movie titles that begin with "The", move "the" to the end.
      For example "The 39 Steps" becomes "39 Steps, The" or "the matrix" becomes "Matrix, The".
    * Limit the maximum number of results to 10.

    Important:
    * The "role" property exists on the ACTED_IN relationship.
    * The "rating" property exists on the RATED relationship.


    Schema:
    {schema}

    Question:
    {question}

    Respond with only the Cypher statement.
  `);
  // end::prompt[]

  // tag::sequence[]
  // Create the runnable sequence
  return RunnableSequence.from<string, string>([
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
  ]);
  // end::sequence[]
}
// end::function[]
