import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  MessagesPlaceholder,
  ChatPromptTemplate,
} from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { llm } from "@/modules/llm";

const REPHRASE_QUESTION_SYSTEM_TEMPLATE = `Given the following conversation and a follow up question,
rephrase the follow up question to be a standalone question.`;

const rephraseQuestionChainPrompt = ChatPromptTemplate.fromMessages([
  ["system", REPHRASE_QUESTION_SYSTEM_TEMPLATE],
  new MessagesPlaceholder("history"),
  [
    "human",
    "Rephrase the following question as a standalone question:\n{question}",
  ],
]);

export const rephraseQuestionChain = RunnableSequence.from([
  rephraseQuestionChainPrompt,
  llm,
  new StringOutputParser(),
]);
