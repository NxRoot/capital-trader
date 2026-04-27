// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { callAnthropic, makePrompt } from "@/utils/ai";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>,
) {
  const config = await req.body;
  const request = await callAnthropic(config, [
    { role: "user", content: makePrompt(config) },
    { role: "user", content: config.text }
  ]);
  res.status(200).json({ ok: true, data: request.code });
}
