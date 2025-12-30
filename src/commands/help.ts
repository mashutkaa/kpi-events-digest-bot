import createDebug from "debug";
import { helpMessage } from "../utils";
import { Markup } from "telegraf";
import type { Context } from "telegraf";

const debug = createDebug("bot:help");

export const helpCommandReply = () => async (ctx: Context) => {
    debug('Triggered "help" command');
    await ctx.reply(helpMessage, {
        parse_mode: "HTML",
        ...Markup.keyboard([["Згенерувати дайджест"], ["Допомога"]])
            .resize()
            .persistent(),
    });
};
