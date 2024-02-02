import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  PromptTemplate,
} from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { BaseLanguageModel } from "langchain/base_language";

// tag::interface[]
export interface GenerateAnswerInput {
  question: string;
  context: string;
}
// end::interface[]

// tag::signature[]
export default function initGenerateAnswerChain(llm: BaseLanguageModel): RunnableSequence<GenerateAnswerInput, string> {
// end::signature[]

    // tag::prompt[]
    const answerQuestionPrompt = PromptTemplate.fromTemplate(`
      Use only the following context to answer the following question.

      Question:
      {question}

      Context:
      {context}

      Answer as if you have been asked the original question.
      Do not use your pre-trained knowledge.

      If you don't know the answer, just say that you don't know, don't try to make up an answer.
      Include links and sources where possible.
    `);
    // end::prompt[]

    // tag::sequence[]
    return RunnableSequence.from<GenerateAnswerInput, string>([
      answerQuestionPrompt,
      llm,
      new StringOutputParser(),
    ])
    // end::sequence[]

// tag::signature[]
}
// end::signature[]
