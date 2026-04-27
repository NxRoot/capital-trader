// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { TradingBot } from "@/utils/trader";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>,
) {
  TradingBot.getInstance().stop();
  res.status(200).json({ ok: true });
}
