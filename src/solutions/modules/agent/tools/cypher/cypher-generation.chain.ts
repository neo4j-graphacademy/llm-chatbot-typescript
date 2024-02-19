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
    Convert the user's question based on the schema.

    Instructions:

    Include extra information to help answer the question: for example, the roles that an actor
    played in the movie, the release date and the average rating.
    For movie titles that begin with "The", move "the" to the end.
    For example "The 39 Steps" becomes "39 Steps, The" or "the matrix" becomes "Matrix, The".

    When you return a node, always use the elementId() function to return an  \`_id\` property.
    For example:

    \`\`\`
    RETURN p.name AS name, elementId(p) AS _id
    \`\`\`

    Important: Use elementId(), never id() - the id() function has been deprecated.

    When checking a node property for a null value, use \`prop IS NOT NULL\`.

    Use only the provided relationship types and properties in the schema.
    Do not use any labels, relationship types or properties that are not provided in the schema.

    Limit the maximum number of results to 10.

    Schema:
    {schema}

    Question:
    {question}

    Respond with only the Cypher statement.
  `);
  // end::prompt[]

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
}
// end::function[]
