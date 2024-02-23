import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";

import { BaseChatModel } from "langchain/chat_models/base";
import { ChatbotResponse } from "../history";

// tag::interface[]
export type RephraseQuestionInput = {
  // The user's question
  input: string;
  // Conversation history of {input, output} from the database
  history: ChatbotResponse[];
}
// end::interface[]

// tag::function[]
export default function initRephraseChain(llm: BaseChatModel) {
  // TODO: Create Prompt template
  // const rephraseQuestionChainPrompt = PromptTemplate.fromTemplate<RephraseQuestionInput, string>(...)
  // TODO: Create Runnable Sequence
  // return RunnableSequence.from<RephraseQuestionInput, string>(
}
// end::function[]

/**
 * How to use this chain in your application:

// tag::usage[]
const llm = new OpenAI() // Or the LLM of your choice
const rephraseAnswerChain = initRephraseChain(llm)

const output = await rephraseAnswerChain.invoke({
  input: 'What else did they act in?',
  history: [{
    input: 'Who played Woody in Toy Story?',
    output: 'Tom Hanks played Woody in Toy Story',
  }]
}) // Other than Toy Story, what movies has Tom Hanks acted in?
// end::usage[]
 */
