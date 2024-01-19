import {
  Relationship,
  CypherValidator,
  RelationshipExistsDecision,
  Node,
  SchemaProperties,
} from "./cypher-validator";

describe("Cypher Validator", () => {
  const properties = {
    unique: true,
    indexed: true,
    type: "STRING",
    existence: false,
  } as SchemaProperties;

  const nodes: Node[] = [
    new Node("Person", 100, { id: properties, name: properties }),
    new Node("Enrolment", 100, {}),
    new Node("User", 100, {}),
    new Node("Course", 100, {}),
    new Node("Attempt", 100, {}),
    new Node("Actor", 100, {}),
    new Node("Movie", 100, {}),
  ];
  const relationships: Relationship[] = [
    new Relationship("Person", "FRIEND_OF", "Person", {}),
    new Relationship("Person", "ENEMY_OF", "Person", {}),
    new Relationship("Person", "HAS_ENROLMENT", "Enrolment", {}),
    new Relationship("Enrolment", "FOR_COURSE", "Course", {}),
    new Relationship("Enrolment", "HAS_ATTEMPT", "Attempt", {}),
    new Relationship("Actor", "ACTED_IN", "Movie", {}),
    new Relationship("User", "RATED", "Movie", {
      rating: { type: "FLOAT" } as SchemaProperties,
    }),
  ];

  const queryCorrector = new CypherValidator(null, nodes, relationships);

  describe("getSchema", () => {
    it("should return the schema as a string", async () => {
      const schema = await queryCorrector.getSchema();
      const expected = `Nodes:
- (:Person {id: STRING, name: STRING})
- (:Enrolment {})
- (:User {})
- (:Course {})
- (:Attempt {})
- (:Actor {})
- (:Movie {})

Relationships:
- (:Person)-[:FRIEND_OF {}]->(:Person)
- (:Person)-[:ENEMY_OF {}]->(:Person)
- (:Person)-[:HAS_ENROLMENT {}]->(:Enrolment)
- (:Enrolment)-[:FOR_COURSE {}]->(:Course)
- (:Enrolment)-[:HAS_ATTEMPT {}]->(:Attempt)
- (:Actor)-[:ACTED_IN {}]->(:Movie)
- (:User)-[:RATED {rating: FLOAT}]->(:Movie)`;

      expect(schema).toEqual(expected);
    });
  });

  describe("extractLabels", () => {
    it("should identify a single label", () => {
      expect(queryCorrector["extractLabels"]("(a:Person)")).toEqual(["Person"]);
    });

    it("should identify multiple labels", () => {
      expect(queryCorrector["extractLabels"]("(a:Person:Student)")).toEqual([
        "Person",
        "Student",
      ]);
    });
  });

  describe("extractRelationshipTypes", () => {
    it("should identify a single relationship type", () => {
      expect(
        queryCorrector["extractRelationshipTypes"]("[:FRIEND_OF]")
      ).toEqual(["FRIEND_OF"]);
    });

    it("should identify multiple relationship types", () => {
      expect(
        queryCorrector["extractRelationshipTypes"]("-[:FRIEND_OF|ENEMY_OF]->")
      ).toEqual(["FRIEND_OF", "ENEMY_OF"]);
    });

    it("should identify multiple relationship types in variable length path", () => {
      expect(
        queryCorrector["extractRelationshipTypes"]("[:FRIEND_OF|ENEMY_OF*2..]")
      ).toEqual(["FRIEND_OF", "ENEMY_OF"]);
    });

    it("should ignore the variable", () => {
      expect(
        queryCorrector["extractRelationshipTypes"]("[r:FRIEND_OF|ENEMY_OF*2..]")
      ).toEqual(["FRIEND_OF", "ENEMY_OF"]);
    });
  });

  describe("relationshipExists", () => {
    it("should return true if the relationship exists", () => {
      expect(
        queryCorrector["relationshipExists"]("Person", "FRIEND_OF", "Person")
      ).toEqual(true);
      expect(
        queryCorrector["relationshipExists"]("Person", "ENEMY_OF", "Person")
      ).toEqual(true);
    });

    it("should return false if relationship does not exist", () => {
      expect(
        queryCorrector["relationshipExists"]("Person", "FRIEND_OF", "Enrolment")
      ).toEqual(false);
    });
  });

  describe("anyRelationshipExists", () => {
    it("should return true if any relationship exists", () => {
      expect(
        queryCorrector["anyRelationshipExists"](
          ["Person", "Student"],
          ["FRIEND_OF"],
          ["Person"]
        )
      ).toEqual(RelationshipExistsDecision.FOUND);
      expect(
        queryCorrector["anyRelationshipExists"](
          ["Person"],
          ["ENEMY_OF"],
          ["Person", "Student"]
        )
      ).toEqual(RelationshipExistsDecision.FOUND);
    });

    it("should return false if no relationship exists", () => {
      expect(
        queryCorrector["anyRelationshipExists"](
          ["Person"],
          ["FRIEND_OF"],
          ["Enrolment"]
        )
      ).toEqual(RelationshipExistsDecision.NOT_FOUND);
    });
  });

  describe("validate", () => {
    it("should identify a valid query", () => {
      expect(
        queryCorrector.validate(
          "MATCH (a:Person)-[:HAS_ENROLMENT]->(b:Enrolment) RETURN a, b"
        )
      ).toEqual({
        query: "MATCH (a:Person)-[:HAS_ENROLMENT]->(b:Enrolment) RETURN a, b",
        errors: [],
      });
    });

    it("should identify an invalid outgoing label", () => {
      const { errors } = queryCorrector.validate(
        "MATCH (a:Foo)-[:HAS_ENROLMENT]->(b:Person) RETURN a, b"
      );

      expect(errors).toEqual(
        expect.arrayContaining([queryCorrector["noLabelError"]("Foo")])
      );
    });

    it("should identify an invalid incoming label", () => {
      const { errors } = queryCorrector.validate(
        "MATCH (a:Person)-[:HAS_ENROLMENT]->(b:Foo) RETURN a, b"
      );

      expect(errors).toEqual(
        expect.arrayContaining([queryCorrector["noLabelError"]("Foo")])
      );
    });

    it("should identify a single invalid outgoing relationship", () => {
      const { errors } = queryCorrector.validate(
        "MATCH (a:Person)-[:HAS_FOO]->(b:Foo) RETURN a, b"
      );

      expect(errors).toEqual(
        expect.arrayContaining([queryCorrector["noLabelError"]("Foo")])
      );
    });

    it("should redirect an outgoing relationship going in the wrong direction", () => {
      const { query, errors } = queryCorrector.validate(
        "MATCH (a:Enrolment)-[:HAS_ENROLMENT]->(b:Person) RETURN a, b"
      );

      expect(query).toEqual(
        "MATCH (a:Enrolment)<-[:HAS_ENROLMENT]-(b:Person) RETURN a, b"
      );
      expect(errors.length).toEqual(0);
    });

    it("should redirect an incoming relationship going in the wrong direction", () => {
      const { query, errors } = queryCorrector.validate(
        "MATCH (a:Person)<-[:HAS_ENROLMENT]-(b:Enrolment) RETURN a, b"
      );

      expect(query).toEqual(
        "MATCH (a:Person)-[:HAS_ENROLMENT]->(b:Enrolment) RETURN a, b"
      );
      expect(errors.length).toEqual(0);
    });

    it("should handle anonymous nodes at the end of a pattern", () => {
      const { query, errors } = queryCorrector.validate(
        "MATCH (m:Movie)<-[r:RATED]-() RETURN m.title, AVG(r.rating) AS average_rating ORDER BY average_rating DESC LIMIT 1"
      );

      expect(query).toEqual(
        "MATCH (m:Movie)<-[r:RATED]-() RETURN m.title, AVG(r.rating) AS average_rating ORDER BY average_rating DESC LIMIT 1"
      );
      expect(errors.length).toEqual(0);
    });

    it("should handle anonymous nodes at the start of a pattern", () => {
      const { query, errors } = queryCorrector.validate(
        "MATCH ()-[r:RATED]->(m:Movie) RETURN m.title, AVG(r.rating) AS average_rating ORDER BY average_rating DESC LIMIT 1"
      );

      expect(query).toEqual(
        "MATCH ()-[r:RATED]->(m:Movie) RETURN m.title, AVG(r.rating) AS average_rating ORDER BY average_rating DESC LIMIT 1"
      );
      expect(errors.length).toEqual(0);
    });

    it("should not identify aggregate functions as labels", () => {
      const { query, errors } = queryCorrector.validate(
        "MATCH (m:Movie)<-[:RATED]-(u:User) RETURN m.title, COUNT(u) AS num_ratings ORDER BY num_ratings DESC LIMIT 1"
      );

      expect(query).toEqual(
        "MATCH (m:Movie)<-[:RATED]-(u:User) RETURN m.title, COUNT(u) AS num_ratings ORDER BY num_ratings DESC LIMIT 1"
      );
      expect(errors.length).toEqual(0);
    });

    it("should handle variable at start of pattern", () => {
      const original =
        "MATCH (m:Movie)<-[:ACTED_IN]-(a:Actor) WITH m, COUNT(a) AS actorCount WHERE actorCount > 3 MATCH (m)-[:RATED]->(u:User) RETURN m.title, AVG(u.rating) AS averageRating ORDER BY averageRating DESC";
      const expected =
        "MATCH (m:Movie)<-[:ACTED_IN]-(a:Actor) WITH m, COUNT(a) AS actorCount WHERE actorCount > 3 MATCH (m)<-[:RATED]-(u:User) RETURN m.title, AVG(u.rating) AS averageRating ORDER BY averageRating DESC";
      const { query, errors } = queryCorrector.validate(original);

      expect(query).toEqual(expected);
      expect(errors.length).toEqual(0);
    });

    it("should handle variable at end of pattern", () => {
      const original =
        "MATCH (m:Movie)<-[:ACTED_IN]-(a:Actor) WITH m, COUNT(a) AS actorCount WHERE actorCount > 3 MATCH (m:Movie)-[:RATED]->(u) RETURN m.title, AVG(u.rating) AS averageRating ORDER BY averageRating DESC";
      const expected =
        "MATCH (m:Movie)<-[:ACTED_IN]-(a:Actor) WITH m, COUNT(a) AS actorCount WHERE actorCount > 3 MATCH (m:Movie)<-[:RATED]-(u) RETURN m.title, AVG(u.rating) AS averageRating ORDER BY averageRating DESC";
      const { query, errors } = queryCorrector.validate(original);

      expect(query).toEqual(expected);
      expect(errors.length).toEqual(0);
    });
  });
});
