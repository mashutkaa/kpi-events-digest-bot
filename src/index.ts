import { development, production, telegramBot } from "./core";
import { ENVIRONMENT } from "./config";

import type { VercelRequest, VercelResponse } from "@vercel/node";

export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
    await production(req, res, telegramBot);
};

// Запуск в режимі розробки
if (ENVIRONMENT !== "production") {
    development(telegramBot).catch(console.error);
}
