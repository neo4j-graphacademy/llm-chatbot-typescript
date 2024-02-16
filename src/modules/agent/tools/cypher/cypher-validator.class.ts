import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";

export class Relationship {
  constructor(
    public from: string,
    public relationship: string,
    public to: string,
    public properties: Record<string, SchemaProperties>
  ) {}
}

export class Node {
  constructor(
    public label: string,
    public count: number,
    public properties: Record<string, SchemaProperties>
  ) {}
}

export enum RelationshipExistsDecision {
  NOT_FOUND,
  FOUND,
  REVERSE_DIRECTION,
}

export interface SchemaProperties {
  unique: boolean;
  indexed: boolean;
  type: string;
  existence: false;
  array: false;
}

interface SchemaValue {
  count: number;
  labels: string[];
  type: "node" | "relationship";
  properties: Record<string, SchemaProperties>;
  relationships: Record<
    string,
    {
      count: number;
      direction: "out" | "in";
      labels: string[];
      properties: Record<string, SchemaProperties>;
    }
  >;
}

let singleton: CypherValidator;

export class CypherValidator {
  private nodePattern: string = "\\(([^()]*?:[^()]*?)\\)";
  private relationshipPattern: string =
    "\\(([^()]*?:?[^()]*?)\\)(\\<)?-\\[([^\\]]+?)\\]-(\\>)?\\(([^()]*?:?[^()]*?)\\)";

  /* private */
  constructor(
    private readonly graph: Neo4jGraph | null,
    private nodes: Node[] = [],
    private relationships: Relationship[] = []
  ) {}

  /**
   * Reload the schema from the database
   *
   * @returns void
   */
  async reload(): Promise<void> {
    if (!this.graph) {
      return;
    }

    const res = await this.graph.query(`CALL apoc.meta.schema()`);

    if (!res) {
      throw new Error("Could not load schema");
    }

    const [first] = res;
    const rows: Record<string, SchemaValue> = first.value;

    // Build Relationships
    const relationships: Relationship[] = [];
    const nodes: Node[] = [];

    for (const [from, details] of Object.entries(rows)) {
      if (details.type === "node") {
        const node = new Node(from, details.count, details.properties);
        nodes.push(node);

        for (const [type, relDetails] of Object.entries(
          details.relationships
        )) {
          if (relDetails.direction == "out") {
            for (const to of relDetails.labels) {
              relationships.push(
                new Relationship(from, type, to, relDetails.properties)
              );
            }
          }
        }
      }
    }

    this.nodes = nodes;
    this.relationships = relationships;
  }

  /**
   * Get the schema as a string to stuff into a prompt
   *
   * @returns string
   */
  async getSchema(): Promise<string> {
    if (!this.nodes.length || !this.relationships.length) {
      await this.reload();
    }

    const properties = (node: Node | Relationship): string =>
      "{" +
      Object.entries(node.properties)
        .map(([k, v]) => `${k}: ${v.type}`)
        .join(", ") +
      "}";

    const nodes = `Nodes:\n- ${this.nodes
      .map((node) => `(:${node.label} ${properties(node)})`)
      .join("\n- ")}`;
    const relationships = `Relationships:\n- ${this.relationships
      .map(
        (relationship) =>
          `(:${relationship.from})-[:${relationship.relationship} ${properties(
            relationship
          )}]->(:${relationship.to})`
      )
      .join("\n- ")}`;

    return `${nodes}\n\n${relationships}`;
  }

  /**
   * @static
   * Create a new CypherValidator instance and load the schema from the graph
   *
   * @param {Neo4jGraph} graph
   * @returns {Promise<CypherValidator>}
   */
  static async load(graph: Neo4jGraph): Promise<CypherValidator> {
    if (!singleton) {
      singleton = new CypherValidator(graph);
    }

    await singleton.reload();

    return singleton;
  }

  /**
   * Verify that a node label exists in the schema
   *
   * @returns boolean
   */
  private verifyNodeLabel(label: string): boolean {
    return this.nodes.some((node) => node.label == label.trim());
  }

  /**
   * Extract labels from a node pattern
   *
   * @param {string} pattern
   * @returns {string[]}
   */
  private extractLabels(pattern: string | undefined): string[] {
    // Handle anonymous or node variables
    if (pattern === undefined || !pattern.includes(":")) {
      return [""];
    }

    // Strip brackets
    if (pattern.endsWith(")")) {
      pattern = pattern.substring(0, pattern.length - 1);
    }
    if (pattern.startsWith("(")) {
      pattern = pattern.substring(1);
    }

    if (pattern.includes("{")) {
      pattern = pattern.split("{")[0];
    }

    // Split labels
    if (pattern.includes(":")) {
      const labels = pattern.split(":");

      // Remove variable or empty string
      labels.splice(0, 1);

      return labels.map((label) => label.trim());
    }

    return [pattern];
  }

  /**
   * Extract relationship types from a relationship pattern
   *
   * @param {string} pattern
   * @returns {string[]}
   */
  private extractRelationshipTypes(pattern: string): string[] {
    let cleaned = pattern;

    // Strip brackets
    if (cleaned.includes("[")) {
      cleaned = cleaned.split("[")[1];
    }

    if (cleaned.includes("]")) {
      cleaned = cleaned.split("]")[0];
    }

    // Strip properties
    if (cleaned.includes("{")) {
      cleaned = cleaned.split("{")[0];
    }

    //  Strip variable
    if (cleaned.includes(":")) {
      const parts = cleaned.split(":");
      cleaned = parts[parts.length - 1];
    }
    // Strip variable length path
    if (cleaned.includes("*")) {
      const parts = cleaned.split("*");
      cleaned = parts[0];
    }

    return cleaned.split("|");
  }

  /**
   * Determine if any relationship exists between the given node labels.
   * If the relationship does not exist, check if the reverse direction exists
   * and if so, return the instruction to reverse the relationship.
   *
   * @param {string[]} from
   * @param {string[]} rel
   * @param {string[]} to
   * @returns {RelationshipExistsDecision}
   */
  private anyRelationshipExists(
    from: string[],
    rel: string[],
    to: string[]
  ): RelationshipExistsDecision {
    for (const f of from) {
      for (const t of to) {
        for (const r of rel) {
          if (this.relationshipExists(f, r, t)) {
            return RelationshipExistsDecision.FOUND;
          } else if (this.relationshipExists(t, r, f)) {
            return RelationshipExistsDecision.REVERSE_DIRECTION;
          }
        }
      }
    }
    return RelationshipExistsDecision.NOT_FOUND;
  }

  /**
   * Determine whether any of the relationship types exist
   *
   * @param {string[]} rels
   * @returns {boolean}
   */
  private anyRelationshipTypeExists(rels: string[]): boolean {
    for (const rel of rels) {
      if (this.relationshipTypeExists(rel)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Determine whether the relationship type exists in the database
   *
   * @param {string} rel
   * @returns {boolean}
   */
  private relationshipTypeExists(rel: string): boolean {
    return this.relationships.some((schema) => schema.relationship == rel);
  }

  /**
   * Determine whether the relationship exists in the database
   *
   * @param {string} from
   * @param {string} rel
   * @param {string} to
   * @returns {boolean}
   */
  private relationshipExists(from: string, rel: string, to: string): boolean {
    if (from === "") {
      return this.relationships.some(
        (schema) => schema.relationship == rel && schema.to == to
      );
    } else if (to === "") {
      return this.relationships.some(
        (schema) => schema.relationship == rel && schema.from == from
      );
    } else {
      return this.relationships.some(
        (schema) =>
          schema.relationship == rel && schema.from == from && schema.to == to
      );
    }
  }

  /**
   * Helper function to consistently format the error message
   * when a node label is not found in the schema
   *
   * @param {string} label
   * @returns {string}
   */
  private noLabelError(label: string): string {
    return `Node label not found: ${label}`;
  }

  /**
   * Helper function to consistently format the error message
   * when the relationship types are not found in the schema
   *
   * @param {string[]} types
   * @returns {string}
   */
  private noRelationshipTypeError(types: string[]): string {
    return `Relationship type(s) not found: ${types.join("|")}`;
  }

  /**
   * Helper function to consistently format the error message
   * when the relationship type does not exist between the two nodes
   *
   * @param {string[]} types
   * @returns {string}
   */
  private noRelationshipError(
    from: string[],
    rel: string[],
    to: string[]
  ): string {
    return `Relationship combination not found: (:${from.join(
      ":"
    )})-[:${rel.join("|")}]->(:${to.join(":")})`;
  }

  /**
   * Given a query string, validate the query and return the query string and any errors.
   * If a relationship is written in the wrong direction, this function will correct it.
   * If any nodes or patterns do not exist, the details will be returned in the errors array.
   *
   * @param {string} query
   * @returns {{ query: string, errors: string[] }}
   */
  validate(query: string): { query: string; errors: string[] } {
    // Given a query string: MATCH (a:Person)-[:ACTED_IN]->(b:Movie) RETURN a, b)
    // Extract the pattern: (a:Person)-[:ACTED_IN]->(b:Movie)
    const errors = [];

    // Verify labels
    const nodePattern = new RegExp(`${this.nodePattern}`, "g");
    for (const node of query.matchAll(nodePattern)) {
      const labels = this.extractLabels(node[1]);

      for (const label of labels) {
        if (
          !label.includes(".") &&
          label.trim() !== "" &&
          !this.verifyNodeLabel(label)
        ) {
          errors.push(this.noLabelError(label));
        }
      }
    }

    const patternRegex = new RegExp(this.relationshipPattern, "g");
    const matches = query.matchAll(patternRegex);

    for (const match of matches) {
      const [pattern, left, incoming, rel, outgoing, right] = match;

      const leftLabels = this.extractLabels(left);
      const rightLabels = this.extractLabels(right);
      const relationshipTypes = this.extractRelationshipTypes(rel);

      if (!this.anyRelationshipTypeExists(relationshipTypes)) {
        errors.push(this.noRelationshipTypeError(relationshipTypes));
      }
      // - If direction is OUTGOING, find schema items where
      // `from` is the same as the first node label and `relationship`
      //  is the same as the relationship type
      else if (outgoing !== undefined) {
        const exists = this.anyRelationshipExists(
          leftLabels,
          relationshipTypes,
          rightLabels
        );

        if (exists === RelationshipExistsDecision.NOT_FOUND) {
          errors.push(
            this.noRelationshipError(leftLabels, relationshipTypes, rightLabels)
          );
        } else if (exists === RelationshipExistsDecision.REVERSE_DIRECTION) {
          query = query.replace(pattern, `(${left})<-[${rel}]-(${right})`);
        }
      }
      // - if direction is incomingm find schema items where `to` is the
      // same as the first node label and `relationship` is the same
      // as the relationship type
      else if (incoming !== undefined) {
        const exists = this.anyRelationshipExists(
          rightLabels,
          relationshipTypes,
          leftLabels
        );

        if (exists === RelationshipExistsDecision.NOT_FOUND) {
          errors.push(
            this.noRelationshipError(rightLabels, relationshipTypes, leftLabels)
          );
        } else if (exists === RelationshipExistsDecision.REVERSE_DIRECTION) {
          query = query.replace(pattern, `(${left})-[${rel}]->(${right})`);
        }
      }
    }

    return { query, errors };
  }

  call(query: string): string {
    const { query: correctedQuery, errors } = this.validate(query);

    if (errors.length > 0) {
      return `Your query: \n${query} has the following errors: \n${errors.join(
        "\n"
      )} `;
    }

    return correctedQuery;
  }
}
