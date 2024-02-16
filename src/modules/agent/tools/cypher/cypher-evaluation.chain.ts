import { BaseLanguageModel } from "langchain/base_language";
import { PromptTemplate } from "@langchain/core/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { JsonOutputParser } from "@langchain/core/output_parsers";

import { GraphCypherQAChain } from "langchain/chains/graph_qa/cypher";

// tag::interface[]
export type CypherEvaluationChainInput = {
  question: string;
  cypher: string;
  schema: string;
  errors: string[] | string | undefined;
};
// end::interface[]

// tag::output[]
export type CypherEvaluationChainOutput = {
  cypher: string;
  errors: string[];
};
// end::output[]

// tag::function[]
export default async function initCypherEvaluationChain(
  llm: BaseLanguageModel
) {
  // tag::prompt[]
  // TODO: Create prompt template
  // const prompt = PromptTemplate.fromTemplate(...)
  const prompt = PromptTemplate.fromTemplate(`
    Given the following schema, will the Cypher statement provided
    return the correct information to answer the question.

    You must:
    * Only use the nodes, relationships and properties mentioned in the schema.
    * Attempt to correct the Cypher statement where possible.
    * Check that node labels and relationship types exist.
    * Check that a property exists for the node or relationship.
    * Check the direction of a relationship between two nodes.  If it is in the wrong direction, correct it.



    If the statement is correct, return the statement.
    If the statement is incorrect, rewrite the statement.

    When checking a node property for a null value, use \`prop IS NOT NULL\`.

    Return a JSON object with keys for "cypher" and "errors".
    - "cypher" - the corrected cypher statement
    - "corrected" - a boolean
    - "errors" - A list of uncorrectable errors.  For example, if a label,
        relationship type or property does not exist in the schema.
        Provide a hint to the correct element where possible.

    Only include errors that cannot be corrected.

    Example input: MATCH (p:Person)<-[:DRKT]-(m:Movie) RETURN p.personName AS name
    Example output:
    {{
      "cypher" : "MATCH (p:Person)<-[:DRKT]-(m:Movie) RETURN p.personName AS name"
      "corrected": "false",
      "errors": [
        "The relationship type DRKT does not exist in the schema.  Did you mean (:Person)-[:DIRECTED]->(:Movie)?",
        "The property :Person.personName does not exist in the schema.  Use person.name",
      ]
    }}

    Example input: "MATCH (p:Person)<-[:DIRECTED_BY]-(m:Movie) RETURN p.personName AS name"
    Example output:
    {{
      "cypher" : "MATCH (p:Person)-[:DIRECTED]->(m:Movie) RETURN p.personName AS name"
      "corrected": "true",
      "errors": []
    }}

    Example input: "MATCH (p:Person)-[:DIRECTED]->(m:Movie) RETURN p.personName AS name"
    Example output:
    {{
      "cypher" : "MATCH (p:Person)-[:DIRECTED]->(m:Movie) RETURN p.personName AS name"
      "corrected": "true",
      "errors": []
    }}


    Always return the Cypher statement on a single line.
    Do not provide any preamble or markdown.

    Schema:
    {schema}

    Question:
    {question}

    Cypher Statement:
    {cypher}

    {errors}
  `);
  // end::prompt[]

  // TODO: Return runnable
  // tag::runnable[]
  return RunnableSequence.from<
    CypherEvaluationChainInput,
    CypherEvaluationChainOutput
  >([
    // tag::assign[]
    RunnablePassthrough.assign({
      // Convert errors into an LLM-friendly list
      errors: ({ errors }) => {
        if (
          errors === undefined ||
          (Array.isArray(errors) && errors.length === 0)
        ) {
          return "";
        }

        return `Errors: * ${
          Array.isArray(errors) ? errors?.join("\n* ") : errors
        }`;
      },
    }),
    // end::assign[]
    // tag::rest[]
    prompt,
    llm,
    new JsonOutputParser<CypherEvaluationChainOutput>(),
    // end::rest[]
  ]);
}
// end::function[]
