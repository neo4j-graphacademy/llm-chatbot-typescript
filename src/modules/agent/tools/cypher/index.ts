import { Neo4jGraph } from "langchain/graphs/neo4j_graph";
// import { GraphCypherQAChain } from "@langchain/community/graphs";
import { llm } from "../../../llm";
import { PromptTemplate } from "langchain/prompts";
import {
  Runnable,
  RunnablePassthrough,
  RunnableSequence,
} from "langchain/runnables";
import { CypherValidator } from "./cypher-validator";
import { graph } from "@/modules/graph";
import { StringOutputParser } from "langchain/schema/output_parser";

const cypherPrompt = PromptTemplate.fromTemplate(`
You are an expert Neo4j Developer translating user questions into Cypher to answer questions about movies and provide recommendations.
Convert the user's question based on the schema.

Use only the provided relationship types and properties in the schema.
Do not use any other relationship types or properties that are not provided.

Fine Tuning:

Include extra information to help answer the question: for example, the roles that an actor played in the movie, the release date and the average rating.
For movie titles that begin with "The", move "the" to the end. For example "The 39 Steps" becomes "39 Steps, The" or "the matrix" becomes "Matrix, The".


Schema:
{schema}

Question:
{input}

Cypher Query:
`);

// export async function initCommunityGraphCypherQAChain(): Promise<GraphCypherQAChain> {
//   const graph = await Neo4jGraph.initialize({
//     url: process.env.NEO4J_URI as string,
//     username: process.env.NEO4J_USERNAME as string,
//     password: process.env.NEO4J_PASSWORD as string,
//   });

//   const chain = GraphCypherQAChain.fromLLM({
//     llm,
//     graph,
//     cypherPrompt,
//   });

//   return chain;
// }

interface CypherEvaluatorChainInput {
  input: string;
  cypher: string;
  errors: string[];
}

export async function initGraphCypherQAChain(): Promise<RunnableSequence> {
  const validator = await CypherValidator.load(graph);

  const evaluate = PromptTemplate.fromTemplate<CypherEvaluatorChainInput>(
    `
  Evaluate the following Cypher statement and identify suggestions for improvement
  based on the errors.
  Use those suggestions to rewrite the statement.
  Only use relationships and properties that are provided in the schema.

  Original question: {question}
  Cypher Statement: {cypher}
  Errors: {errors}

  Return only a single, valid Cypher statement containing the improvements.
`
  )
    .pipe(llm)
    .pipe(new StringOutputParser());

  const cypherValidation = async (input: Record<string, any>) => {
    let tries = 0;

    let { errors, query } = validator.validate(input.cypher);

    while (tries < 5 && errors.length > 0) {
      tries++;

      const regenerated = await evaluate.invoke({
        input: input.input,
        cypher: query,
        errors,
      });

      const validated = validator.validate(regenerated);

      errors = validated.errors;
      query = validated.query;

      console.log(">>", { errors, query });
    }

    return query;
  };

  const answerPrompt = PromptTemplate.fromTemplate(`
    Use the following context to answer the user's question.

    Question: {input}
    Context: {context}
  `);

  const answerGenerationChain = RunnableSequence.from([
    RunnablePassthrough.assign({
      query: new RunnablePassthrough(),
    }),
    RunnablePassthrough.assign({
      context: async (input: { query: string }) => {
        const context = await graph.query(input.query);

        return JSON.stringify(context);
      },
    }),
    answerPrompt,
    llm,
    new StringOutputParser(),
  ]);

  // 1. Use the question to create a Cypher statement
  const cypherGenerationChain = RunnableSequence.from([
    RunnablePassthrough.assign({
      schema: () => validator.getSchema(),
      input: new RunnablePassthrough(),
    }),
    cypherPrompt,
    llm,
  ]);

  // 2. validate the query and correct if possible.  If there are still errors, go again
  const cypherEvaluationChain = RunnableSequence.from([
    RunnablePassthrough.assign({
      schema: () => validator.getSchema(),
    }),
    cypherValidation,
  ]);

  return RunnableSequence.from([
    // Generate a query
    RunnablePassthrough.assign({
      query: cypherGenerationChain
        // Evaluate it
        .pipe(cypherEvaluationChain),
    }),
    RunnablePassthrough.assign({
      output: answerGenerationChain,
    }),
  ]);
}
