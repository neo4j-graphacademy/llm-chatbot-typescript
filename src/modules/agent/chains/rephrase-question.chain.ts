import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  MessagesPlaceholder,
  ChatPromptTemplate,
  PromptTemplate,
} from "@langchain/core/prompts";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";

import { BaseChatModel } from "langchain/chat_models/base";
import { BaseMessage } from "langchain/schema";

export interface RephraseQuestionInput {
  input: string;
  history: BaseMessage[];
}

export default function initRephraseChain(llm: BaseChatModel) {
  // const rephraseQuestionChainPrompt = ChatPromptTemplate.fromMessages([
  //   [
  //     "system",
  //     `
  //       Given the following conversation and a follow up question,
  //       rephrase the follow up question to be a standalone question that is syntatically complete.

  //       If you do not have full information required to construct a
  //       standalone question that makes sense, ask for clarification.
  //     `
  //   ],
  //   new MessagesPlaceholder("history"),
  //   [
  //     "human",
  //     `
  //       Question: {input}
  //     `,
  //   ],
  // ]);
  const rephraseQuestionChainPrompt = PromptTemplate.fromTemplate(`
    Given the following conversation and a follow up question,
    rephrase the follow up question to be a standalone question that is syntatically complete.

    If you do not have full information required to construct a
    standalone question that makes sense, ask for clarification.

    History:
    {history}

    Question:
    {input}
  `)

  return RunnableSequence.from([
    RunnablePassthrough.assign({
      history: ({history}: {history:BaseMessage[]}) =>
        history.map(message => `${message._getType()}: ${message.content.toString()}`)
        .join('\n')
    }),
    rephraseQuestionChainPrompt,
    llm,
    new StringOutputParser(),
  ])
}
