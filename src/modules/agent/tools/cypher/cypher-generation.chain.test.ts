import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai"
import { config } from "dotenv"
import { BaseChatModel } from "langchain/chat_models/base"
import { Embeddings } from "langchain/embeddings/base"
import { RunnableSequence } from "@langchain/core/runnables"
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph"
import initCypherGenerationChain from "./cypher-generation.chain"
import { CypherValidator } from "./cypher-validator.class"

describe('Cypher Generation Chain', () => {

    let graph: Neo4jGraph
    let llm: BaseChatModel
    let validator: CypherValidator
    let chain: RunnableSequence<string, string>

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

        validator = new CypherValidator(graph)

        chain = await initCypherGenerationChain(validator, llm)
    })

    afterAll(async () => {
        await graph.close()
    })

    it('should generate a simple count query', async () => {
        const output = await chain.invoke('How many movies are in the database?')

        expect(output.toLowerCase()).toContain('match (')
        expect(output).toContain(':Movie)')
        expect(output.toLowerCase()).toContain('return')
        expect(output.toLowerCase()).toContain('count(')

    }, 20000)

    it('should generate a Cypher statement with a relationship', async () => {
        const output = await chain.invoke('Who directed The Matrix?')

        expect(output.toLowerCase()).toContain('match (')
        expect(output).toContain(':Movie)')
        expect(output).toContain(':DIRECTED]')
        expect(output.toLowerCase()).toContain('return')
    }, 20000)
})
