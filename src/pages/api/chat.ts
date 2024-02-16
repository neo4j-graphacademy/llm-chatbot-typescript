import { call } from "@/modules/agent";
import { randomUUID } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  message: string;
};

function getSessionId(req: NextApiRequest, res: NextApiResponse): string {
  let sessionId: string | undefined = req.cookies["session"];

  if (typeof sessionId === "string") {
    return sessionId;
  }

  // Assign a new session
  sessionId = randomUUID();
  res.setHeader("Set-Cookie", `session=${sessionId}`);

  return sessionId;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method === "POST") {
    const body = JSON.parse(req.body);
    const message = body.message;

    // Get or assign the Session ID
    const sessionId = getSessionId(req, res);

    try {
      const result = await call(message, sessionId);

      res.status(201).json({
        message: result,
      });
    } catch (e: any) {
      res.status(500).json({
        message: `I'm suffering from brain fog...\n\n${e.message}`,
      });
    }
  } else {
    res.status(404).send({ message: "Route not found" });
  }
}
