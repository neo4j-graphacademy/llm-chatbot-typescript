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
};
// end::interface[]

// tag::function[]
export default function initRephraseChain(llm: BaseChatModel) {
  // tag::prompt[]
  // Prompt template
  const rephraseQuestionChainPrompt = PromptTemplate.fromTemplate<
    RephraseQuestionInput,
    string
  >(`
    Given the following conversation and a question,
    rephrase the follow-up question to be a standalone question about the
    subject of the conversation history.

    If you do not have the required information required to construct
    a standalone question, ask for clarification.

    Always include the subject of the history in the question.

    History:
    {history}

    Question:
    {input}
  `);
  // end::prompt[]

  // tag::sequence[]
  return RunnableSequence.from<RephraseQuestionInput, string>([
    // <1> Convert message history to a string
    // tag::assign[]
    RunnablePassthrough.assign({
      history: ({ history }): string => {
        if (history.length == 0) {
          return "No history";
        }
        return history
          .map(
            (response: ChatbotResponse) =>
              `Human: ${response.input}\nAI: ${response.output}`
          )
          .join("\n");
      },
    }),
    // end::assign[]
    // <2> Use the input and formatted history to format the prompt
    rephraseQuestionChainPrompt,
    // <3> Pass the formatted prompt to the LLM
    llm,
    // <4> Coerce the output into a string
    new StringOutputParser(),
  ]);
  // end::sequence[]
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
