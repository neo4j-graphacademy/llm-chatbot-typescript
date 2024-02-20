import neo4j, { Driver } from "neo4j-driver";
// tag::import[]
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
// end::import[]

// tag::driver[]
// A singleton instance of Neo4j that can be used across the app
let driver: Driver;

export async function initDriver(): Promise<Driver> {
  // tag::create[]
  if (!graph) {
    // Create singleton and wait for connection to be verified
    graph = await Neo4jGraph.initialize({
      url: process.env.NEO4J_URI as string,
      username: process.env.NEO4J_USERNAME as string,
      password: process.env.NEO4J_PASSWORD as string,
      database: process.env.NEO4J_DATABASE as string | undefined,
    });
  }
  // end::create[]

  // tag::return[]
  return graph;
  // end::return[]
}
// end::driver[]

// tag::graph[]
// <1> The singleton instance
let graph: Neo4jGraph;

/**
 * Return the existing `graph` object or create one
 * has not already been created
 *
 * @returns {Promise<Neo4jGraph>}
 */
export async function initGraph(): Promise<Neo4jGraph> {
  // tag::create[]
  if (!graph) {
    // Create singleton and wait for connection to be verified
    graph = await Neo4jGraph.initialize({
      url: process.env.NEO4J_URI as string,
      username: process.env.NEO4J_USERNAME as string,
      password: process.env.NEO4J_PASSWORD as string,
      database: process.env.NEO4J_DATABASE as string | undefined,
    });
  }
  // end::create[]

  // tag::return[]
  return graph;
  // end::return[]
}
// end::graph[]

// tag::read[]
/**
 * Execute a Cypher statement in a read transaction
 *
 * @param {string} cypher               The cypher statement
 * @param {Record<string, any>} params  Parameters
 * @returns {Record<string, any>[]}
 */
export async function read<T extends Record<string, any>>(
  cypher: string,
  params: Record<string, any>
): Promise<T[]> {
  const driver = await initDriver();
  const session = driver.session();
  const res = await session.executeRead((tx) => tx.run<T>(cypher, params));
  await session.close();
  return res.records.map((record) => record.toObject());
}
// end::read[]

// tag::write[]
/**
 * Execute a Cypher statement in a write transaction
 *
 * @param {string} cypher               The cypher statement
 * @param {Record<string, any>} params  Parameters
 * @returns {Record<string, any>[]}
 */
export async function write<T extends Record<string, any>>(
  cypher: string,
  params: Record<string, any>
): Promise<T[]> {
  const driver = await initDriver();
  const session = driver.session();
  const res = await session.executeWrite((tx) => tx.run<T>(cypher, params));
  await session.close();
  return res.records.map((record) => record.toObject());
}
// end::write[]
