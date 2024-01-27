import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai"
import { config } from "dotenv"
import { BaseChatModel } from "langchain/chat_models/base"
import { Embeddings } from "langchain/embeddings/base"
import { RunnableSequence } from "@langchain/core/runnables"
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph"
import initCypherGenerationChain from "./cypher-generation.chain"
import { CypherValidator } from "./cypher-validator.class"
import { initCypherQAChain } from "./cypher-qa.chain"

describe('Cypher QA Chain', () => {

    let graph: Neo4jGraph
    let llm: BaseChatModel
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

        chain = await initCypherQAChain(llm, graph)
    })

    afterAll(async () => {
        await graph.close()
    })

    it('should answer a simple question', async () => {
        const res = await graph.query(`MATCH (n:Movie) RETURN count(n) AS count`) as {count: number}[]

        expect(res).toBeDefined()

        const output = await chain.invoke('How many Movies are in the database?')

        expect(output).toContain(res[0].count)


    }, 20000)

    it('should answer a random question', async () => {
        const person = 'Emil Eifrem'
        const role = 'The Chief'
        const movie = 'Neo4j - Into the Graph'

        const res = await graph.query(`
            MERGE (m:Movie {title: $movie})
            MERGE (p:Person {name: $person}) SET p:Actor
            MERGE (p)-[r:ACTED_IN]->(m)
            SET r.role = $role
            RETURN *
        `, { movie, person, role })

        console.log('om', res);


        const output = await chain.invoke(`What role did ${person} play in ${movie}`)

        console.log(output);


        expect(output).toContain(person)
        expect(output).toContain(role)
        expect(output).toContain(movie)
    }, 20000)
})
