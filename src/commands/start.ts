import createDebug from "debug";
import { startMessage } from "../utils";
import { Markup } from "telegraf";
import type { Context } from "telegraf";

const debug = createDebug("bot:start");

export const startCommandReply = () => async (ctx: Context) => {
    debug('Triggered "start" command');
    await ctx.reply(
        startMessage,
        Markup.keyboard([["Згенерувати дайджест"], ["Допомога"]])
            .resize()
            .persistent()
    );
};
