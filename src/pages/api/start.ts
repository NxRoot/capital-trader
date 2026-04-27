// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { TradingBot } from "@/utils/trader";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>,
) {
  const config = await req.body;
  const bot = TradingBot.getInstance()
  bot.setConfig(config);
  await bot.start();
  res.status(200).json({ ok: true });
}
