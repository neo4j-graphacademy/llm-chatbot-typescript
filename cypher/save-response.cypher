MERGE (session:Session { id: $sessionId }) // <1>

// <2> Create new response
CREATE (response:Response {
  id: randomUuid(),
  createdAt: datetime(),
  source: $source,
  input: $input,
  output: $output,
  rephrasedQuestion: $rephrasedQuestion,
  cypher: $cypher
})
CREATE (session)-[:HAS_RESPONSE]->(response)

WITH session, response

CALL {
  WITH session, response

  // <3> Remove existing :LAST_RESPONSE relationship if it exists
  MATCH (session)-[lrel:LAST_RESPONSE]->(last)
  DELETE lrel

  // <4? Create :NEXT relationship
  CREATE (last)-[:NEXT]->(response)
}

// <5> Create new :LAST_RESPONSE relationship
CREATE (session)-[:LAST_RESPONSE]->(response)

// <6> Create relationship to context nodes
WITH response

CALL {
  WITH response
  UNWIND $ids AS id
  MATCH (context)
  WHERE elementId(context) = id
  CREATE (response)-[:CONTEXT]->(context)

  RETURN count(*) AS count
}

RETURN DISTINCT response.id AS id