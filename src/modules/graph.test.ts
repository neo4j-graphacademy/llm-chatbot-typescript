import { initGraph } from "./graph";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";

describe("Neo4j Graph", () => {
  it("should have environment variables defined", () => {
    expect(process.env.NEO4J_URI).toBeDefined();
    expect(process.env.NEO4J_USERNAME).toBeDefined();
    expect(process.env.NEO4J_PASSWORD).toBeDefined();
  });

  describe("initGraph", () => {
    it("should instantiate Neo4jGraph", async () => {
      const graph = await initGraph();

      expect(graph).toBeInstanceOf(Neo4jGraph);

      await graph.query("MERGE (t:DriverTest {working: true})");

      await graph.close();
    });
  });
});
