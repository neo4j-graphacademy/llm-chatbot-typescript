import neo4j from "neo4j-driver";

import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";


export async function read<T extends Record<string, any>>(
  cypher: string,
  params: Record<string, any>
): Promise<T[]> {
  const driver = neo4j.driver(
    process.env.NEO4J_URI as string,
    neo4j.auth.basic(
      process.env.NEO4J_USERNAME as string,
      process.env.NEO4J_PASSWORD as string
    )
  );

  const session = driver.session();
  const res = await session.executeRead((tx) => tx.run<T>(cypher, params));
  await session.close();
  return res.records.map((record) => record.toObject());
}

export async function write<T extends Record<string, any>>(
  cypher: string,
  params: Record<string, any>
): Promise<T[]> {
  const driver = neo4j.driver(
    process.env.NEO4J_URI as string,
    neo4j.auth.basic(
      process.env.NEO4J_USERNAME as string,
      process.env.NEO4J_PASSWORD as string
    )
  );

  const session = driver.session();
  const res = await session.executeWrite((tx) => tx.run<T>(cypher, params));
  await session.close();
  return res.records.map((record) => record.toObject());
}
