import { Context, Telegraf } from "telegraf";
import { BOT_TOKEN } from "../config";
import {
    helpCommandReply,
    startCommandReply,
    createDigestCommandReply,
} from "../commands";
import type { Event } from "../interfaces";

const telegramBot = new Telegraf(BOT_TOKEN);

// Зберігання дописів у пам'яті
const userEvents = new Map<number, Event[]>();

// Отримання дописів користувача
export const getUserEvents = (userId: number): Event[] => {
    return userEvents.get(userId) || [];
};

// Очищення дописів користувача
export const clearUserEvents = (userId: number): void => {
    userEvents.delete(userId);
};

// Додавання допису
export const addEvent = (userId: number, text: string): void => {
    if (!userEvents.has(userId)) {
        userEvents.set(userId, []);
    }

    const events = userEvents.get(userId)!;
    events.push({
        id: `${userId}-${Date.now()}`,
        text,
        userId,
        timestamp: Date.now(),
    });
};

telegramBot.command("start", startCommandReply());
telegramBot.command("help", helpCommandReply());
telegramBot.command("generate", createDigestCommandReply(telegramBot));

// Обробляємо переслані дописи та звичайні текстові повідомлення
telegramBot.on("text", async (ctx: Context) => {
    if (ctx?.chat?.type === "private") {
        const userId = ctx.from?.id;
        if (!userId) return;

        const message = ctx.message as any;
        let eventText = "";

        // Якщо це переслане повідомлення або звичайне текстове повідомлення
        eventText = message?.text || "";

        if (eventText.trim()) {
            addEvent(userId, eventText);
        }
    }
});

// Обробляємо переслані дописи
telegramBot.on("message", async (ctx: Context) => {
    if (ctx?.chat?.type === "private") {
        const userId = ctx.from?.id;
        if (!userId) return;

        const message = ctx.message as any;

        if (message?.forward_from_chat && message?.caption) {
            const eventText = message.caption || "";

            if (eventText.trim()) {
                addEvent(userId, eventText);
            }
        }
    }
});

export { telegramBot };
