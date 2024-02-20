import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";

/**
 * Create a new vector search index that uses the existing
 * `moviePlots` index.
 *
 * @param {EmbeddingsInterface} embeddings  The embeddings model
 * @returns {Promise<Neo4jVectorStore>}
 */
// tag::function[]
export default async function initVectorStore(
  embeddings: EmbeddingsInterface
): Promise<Neo4jVectorStore> {
  // tag::store[]
  const vectorStore = await Neo4jVectorStore.fromExistingIndex(embeddings, {
    url: process.env.NEO4J_URI as string,
    username: process.env.NEO4J_USERNAME as string,
    password: process.env.NEO4J_PASSWORD as string,
    indexName: "moviePlots",
    textNodeProperty: "plot",
    embeddingNodeProperty: "embedding",
    retrievalQuery: `
      RETURN
        node.plot AS text,
        score,
        {
          _id: elementid(node),
          title: node.title,
          directors: [ (person)-[:DIRECTED]->(node) | person.name ],
          actors: [ (person)-[r:ACTED_IN]->(node) | [person.name, r.role] ],
          tmdbId: node.tmdbId,
          source: 'https://www.themoviedb.org/movie/'+ node.tmdbId
        } AS metadata
    `,
  });
  // end::store[]

  // tag::return[]
  return vectorStore;
  // end::return[]
}
// end::function[]
