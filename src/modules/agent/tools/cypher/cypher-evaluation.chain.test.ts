import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai"
import { config } from "dotenv"
import { BaseChatModel } from "langchain/chat_models/base"
import { Embeddings } from "langchain/embeddings/base"
import { RunnableSequence } from "@langchain/core/runnables"
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph"
import { CypherValidator } from "./cypher-validator.class"
import initCypherEvaluationChain, { CypherEvaluationChain } from "./cypher-evaluation.chain"

describe('Cypher Evaluation Chain', () => {

    let graph: Neo4jGraph
    let llm: BaseChatModel
    let validator: CypherValidator
    let chain: RunnableSequence<CypherEvaluationChain, string>

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

        chain = await initCypherEvaluationChain(validator, llm)
    })

    afterAll(async () => {
        await graph.close()
    })

    it('should fix a non-existent label', async () => {
        const input = {
            question: 'How many movies are in the database?',
            cypher: 'MATCH (m:Muvee) RETURN count(m) AS count',
            schema: await validator.getSchema(),
            errors: [ 'Label Muvee does not exist' ]
        }

        const output = await chain.invoke(input)

        expect(output.toLowerCase()).toContain('match (')
        expect(output).toContain(':Movie)')
        expect(output.toLowerCase()).toContain('return')
        expect(output.toLowerCase()).toContain('count(')
    })

    it('should fix a non-existent relationship', async () => {
        const input = {
            question: 'Who acted in the matrix?',
            cypher: 'MATCH (m:Muvee)-[:ACTS_IN]->(a:Person) WHERE m.name = "The Matrix" RETURN a.name AS actor',
            schema: await validator.getSchema(),
            errors: [ 'Label Muvee does not exist', 'Relationship type ACTS_IN does not exist' ]
        }

        const output = await chain.invoke(input)

        expect(output.toLowerCase()).toContain('match (')
        expect(output).toContain(':Movie)')
        expect(output).toContain(':ACTED_IN]')
        expect(output.toLowerCase()).toContain('return')
    })
})
