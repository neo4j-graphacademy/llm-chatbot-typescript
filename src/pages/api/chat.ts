import { call } from "@/modules/agent";
// import call from "@/modules/agent/vector-store";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method === "POST") {
    const body = JSON.parse(req.body);
    const message = body.message;

    // TODO: Sessions
    const sessionId = "4";

    try {
      // TODO: Replace with a call to the agent
      // setTimeout(() => {
      //   res.status(201).json({
      //     message,
      //   });
      // }, 1000);

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
