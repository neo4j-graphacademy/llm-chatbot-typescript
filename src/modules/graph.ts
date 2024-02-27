// tag::import[]
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
// end::import[]

// tag::graph[]
// <1> The singleton instance
let graph: Neo4jGraph;

/**
 * <2> Return the existing `graph` object or create one
 * has not already been created
 * @returns {Promise<Neo4jGraph>}
 */
export async function initGraph(): Promise<Neo4jGraph> {
  if (!graph) {
    // TODO: Create singleton and wait for connection to be verified
  }

  return graph;
}
// end::graph[]

/**
 * Close any connections to Neo4j initiated in this file.
 *
 * @returns {Promise<void>}
 */
export async function close(): Promise<void> {
  if (graph) {
    await graph.close();
  }
}
