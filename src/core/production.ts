import createDebug from "debug";
import type { Context, Telegraf } from "telegraf";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Update } from "telegraf/typings/core/types/typegram";

const debug = createDebug("bot:dev");

const PORT = (process.env.PORT && parseInt(process.env.PORT, 10)) || 3000;

const WEBHOOK_BASE =
    process.env.WEBHOOK_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
const WEBHOOK_URL = WEBHOOK_BASE ? `${WEBHOOK_BASE}/api` : "";

const production = async (
    req: VercelRequest,
    res: VercelResponse,
    bot: Telegraf<Context<Update>>
) => {
    debug("Bot runs in production mode");

    if (!WEBHOOK_URL) {
        throw new Error("WEBHOOK_URL/VERCEL_URL is not set.");
    }

    debug(`setting webhook: ${WEBHOOK_URL}`);

    const getWebhookInfo = await bot.telegram.getWebhookInfo();
    if (getWebhookInfo.url !== WEBHOOK_URL) {
        debug(`deleting webhook ${WEBHOOK_URL}`);
        await bot.telegram.deleteWebhook();
        debug(`setting webhook: ${WEBHOOK_URL}`);
        await bot.telegram.setWebhook(WEBHOOK_URL);
    }

    if (req.method === "POST") {
        await bot.handleUpdate(req.body as unknown as Update, res);
    } else {
        res.status(200).json("Listening to bot events...");
    }

    debug(`starting webhook on port: ${PORT}`);
};

export { production };
