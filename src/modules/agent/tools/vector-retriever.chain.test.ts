import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai"
import { config } from "dotenv"
import { BaseChatModel } from "langchain/chat_models/base"
import { Embeddings } from "langchain/embeddings/base"
import { RunnableSequence } from "@langchain/core/runnables"
import { RetrievalChainOutput, initRetrievalChain } from "./vector-retrieval.chain"
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph"

describe('Vector Retrieval Chain', () => {

    let graph: Neo4jGraph
    let llm: BaseChatModel
    let embeddings: Embeddings
    let chain: RunnableSequence<string, RetrievalChainOutput>

    beforeAll(async () => {
        config({path: '.env.local'})

        graph = new Neo4jGraph({
            url: process.env.NEO4J_URI as string,
            username: process.env.NEO4J_USERNAME as string,
            password: process.env.NEO4J_PASSWORD as string,
            database: process.env.NEO4J_DATABASE as string | undefined,
        });

        llm = new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "gpt-4",
            temperature: 0,
        });

        embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY as string,
        });

        chain = await initRetrievalChain(llm, embeddings)
    })

    afterAll(async () => {
        await graph.close()
    })

    it('should provide a recommendation', async () => {
        const question = "Recommend a movie about ghosts"
        const output = await chain.invoke(question)

        // Should generate an answer
        expect(output.answer).toBeDefined()
        expect(output.question).toEqual(question)

        // Should retrieve context
        expect(output.context).toBeDefined()

        // Should be a JSON string
        expect(output.context.substring(0, 2)).toEqual('[{')

        // With pageContent and metadata
        expect(output.context).toContain('pageContent')
        expect(output.context).toContain('metadata')

        // Should mention titles from the context
        const sources: Record<string, any>[] = JSON.parse(output.context)

        for (const source of sources) {
            expect(output.answer).toContain(source.metadata.title.replace(", The", ""))
        }
    }, 20000)
})
