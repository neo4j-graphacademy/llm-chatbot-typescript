// Input string: rephrased question
// 1. generate a cypher statement
// 2. Run it through the CypherValidator
// 3. Run the statement and get the result
// 4. Pass the original question and result data to answer prompt
// 5. Save cypher statement with the result

import { BaseLanguageModel } from "langchain/base_language";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { CypherValidator } from "./cypher-validator.class";
import initCypherGenerationChain from "./cypher-generation.chain";
import initGenerateAnswerChain from "../../chains/answer-generation.chain";
import initCypherEvaluationChain from "./cypher-evaluation.chain";
import { saveGeneratedCypher } from "../../history";
import { StringOutputParser } from "@langchain/core/output_parsers";


export async function recursivelyEvaluate(validator: CypherValidator, llm: BaseLanguageModel, question: string, cypher: string) {
    const evaluatorChain = await initCypherEvaluationChain(validator, llm)

    let tries = 0;

    let { errors, query } = validator.validate(cypher);

    while (tries < 5 && errors.length > 0) {
      tries++;

      const regenerated = await evaluatorChain.invoke({
        question,
        schema: await validator.getSchema(),
        cypher: query,
        errors,
      });

      const validated = validator.validate(regenerated);

      errors = validated.errors;
      query = validated.query;
    }

    return query;
  }


export async function initCypherQAChain(llm: BaseLanguageModel, graph: Neo4jGraph) {
    const validator = await CypherValidator.load(graph);

    const generatorChain = await initCypherGenerationChain(validator, llm)
    const answerGeneration = await initGenerateAnswerChain(llm)

    return RunnableSequence.from<string, string>([
        {
            question: new RunnablePassthrough(),
            schema: () => validator.getSchema(),
        },
        RunnablePassthrough.assign({
            // 1. generate a cypher statement
            cypher: async (input) => generatorChain.invoke(input.question),
        }),
        RunnablePassthrough.assign({
            // 2. Run it through the CypherValidator
            validatedCypher: (input) => {
                return recursivelyEvaluate(validator, llm, input.question, input.cypher)
            },
        }),
        RunnablePassthrough.assign({
            // 3. Run the statement and get the result
            context: async (input) => {
                const res = await graph.query(input.validatedCypher, {})

                return res?.length === 1 ? JSON.stringify(res[0]) : JSON.stringify(res)
            },
        }),
        // 4. Pass the original question and result data to answer prompt
        RunnablePassthrough.assign({
            output: input => answerGeneration.invoke(input),
        }),

        // 5. Save cypher statement with the result
        async (input, options: any) => {
            await saveGeneratedCypher(input, options)

            return input.output
        }
    ])
}
