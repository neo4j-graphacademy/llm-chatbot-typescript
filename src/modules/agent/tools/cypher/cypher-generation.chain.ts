import { BaseLanguageModel } from "langchain/base_language";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { CypherValidator } from "./cypher-validator.class";
import { StringOutputParser } from "@langchain/core/output_parsers";

export default async function initCypherGenerationChain(validator: CypherValidator, llm: BaseLanguageModel) {
    const cypherPrompt = PromptTemplate.fromTemplate(`
        You are an expert Neo4j Developer translating user questions into Cypher to answer questions
        about movies and provide recommendations.
        Convert the user's question based on the schema.

        Use only the provided relationship types and properties in the schema.
        Do not use any other relationship types or properties that are not provided.

        Fine Tuning:

        Include extra information to help answer the question: for example, the roles that an actor
        played in the movie, the release date and the average rating.
        For movie titles that begin with "The", move "the" to the end.
        For example "The 39 Steps" becomes "39 Steps, The" or "the matrix" becomes "Matrix, The".

        Schema:
        {schema}

        Question:
        {question}

        Cypher Query:
    `);


    return RunnableSequence.from<string, string>([
        {
            question: new RunnablePassthrough(),
            schema: () => validator.getSchema(),
        },
        cypherPrompt,
        llm,
        new StringOutputParser()
    ])
}