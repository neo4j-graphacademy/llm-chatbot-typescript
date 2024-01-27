import { BaseLanguageModel } from "langchain/base_language";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { CypherValidator } from "./cypher-validator.class";

export interface CypherEvaluationChain {
    question: string;
    cypher: string;
    schema: string;
    errors: string[];
}

export default async function initCypherEvaluationChain(validator: CypherValidator, llm: BaseLanguageModel) {
    const prompt = PromptTemplate.fromTemplate(`
        Given the following schema, will the Cypher statement provided
        return the correct information to answer the question.

        If the statement is correct, return the statement.
        If the statement is incorrect, rewrite the statement.

        Return only a valid Cypher statement.
        Do not provide any preamble or markdown.

        Schema:
        {schema}

        Question:
        {question}

        Cypher Statement:
        {cypher}

        Errors:
        {errors}
    `)

    return RunnableSequence.from<CypherEvaluationChain, string>([
        RunnablePassthrough.assign({
            // Convert array of strings into single string
            errors: ({ errors }: { errors: string[]}) => errors.join('\n')
        }),
        prompt,
        llm,
        new StringOutputParser,
    ])
}