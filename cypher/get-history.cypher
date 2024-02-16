MATCH (:Session {id: $sessionId})-[:LAST_RESPONSE]->(last)
// Use string templating to make the limit dynamic: 0..${limit}
MATCH path = (start)-[:NEXT*0..5]->(last)
WHERE length(path) = 5 OR NOT EXISTS { ()-[:NEXT]->(start) }
UNWIND nodes(path) AS response
RETURN response.id AS id,
  response.input AS input,
  response.rephrasedQuestion AS rephrasedQuestion,
  response.output AS output,
  response.cypher AS cypher,
  response.createdAt AS createdAt,
  [ (response)-[:CONTEXT]->(n) | elementId(n) ] AS context