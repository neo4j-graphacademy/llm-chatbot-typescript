import { config } from "dotenv"
import initGenerateAnswerChain from "./answer-generation.chain"
import { BaseChatModel } from "langchain/chat_models/base"
import { RunnableSequence } from "@langchain/core/runnables"
import { ChatOpenAI } from "@langchain/openai"
import { PromptTemplate } from "@langchain/core/prompts"
import { StringOutputParser } from "@langchain/core/output_parsers"
import initRephraseChain, { RephraseQuestionInput } from "./rephrase-question.chain"
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages"


describe('Rephrase Question Chain', () => {
    let llm: BaseChatModel
    let chain: RunnableSequence<RephraseQuestionInput, string>
    let evalChain: RunnableSequence<any, any>

    beforeAll(async () => {
        config({path: '.env.local'})

        llm = new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "gpt-3.5-turbo",
            temperature: 0,
        });

        chain = await initRephraseChain(llm)

        evalChain = RunnableSequence.from([
            PromptTemplate.fromTemplate(`
                Is the rephrased version a suitable complete standalone question that can be answered by an LLM?

                Original: {input}
                Rephrased: {response}

                If the question is a suitable standalone question, respond "yes".
                If not, respond with "no".
                If the rephrased question asks for more information, respond with "missing".
            `),
            llm,
            new StringOutputParser(),
        ])
    })

    describe('Rephrasing Questions', () => {
        it('should handle a question with no history', async () => {
            const input = 'Who directed the matrix?'
            const history: BaseMessage[] = []

            const response = await chain.invoke({
                input,
                history,
            })

            const evaluation = await evalChain.invoke({ input, response })
            expect(`${evaluation.toLowerCase()} - ${response}`).toContain('yes')
        })

        it('should rephrase a question based on its history', async () => {
            const input = 'Who directed it?'
            const history: BaseMessage[] = [
                new HumanMessage('Can you recommend me a film?'),
                new AIMessage('Sure, I recommend The Matrix'),
            ]

            const response = await chain.invoke({
                input,
                history,
            })

            expect(response).toContain('The Matrix')

            const evaluation = await evalChain.invoke({ input, response })
            expect(`${evaluation.toLowerCase()} - ${response}`).toContain('yes')
        })

        // TODO: Reinstate and fix prompt
        // it('should ask for clarification if a question does not make sense', async () => {
        //     const input = 'What about last week?'
        //     const history: BaseMessage[] = []

        //     const response = await chain.invoke({
        //         input,
        //         history,
        //     })

        //     const evaluation = await evalChain.invoke({ input, response })
        //     expect(`${evaluation.toLowerCase()} - ${response}`).toContain('missing')
        // })

        // it('should refuse to answer if information is not in context', async () => {
        //     const question = 'Who directed the matrix?'
        //     const response = await chain.invoke({
        //         question,
        //         context: 'The Matrix is a 1999 science fiction action film starring Keanu Reeves',
        //     })

        //     const evaluation = await evalChain.invoke({ question, response })
        //     expect(`${evaluation.toLowerCase()} - ${response}`).toContain('no')
        // })
    })
})
