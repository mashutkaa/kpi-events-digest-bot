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

// Конвертація entities у HTML
const entitiesToHTML = (text: string, entities: any[]): string => {
    if (!entities || entities.length === 0) return text;

    // Сортуємо entities за offset в зворотньому порядку
    const sortedEntities = [...entities].sort((a, b) => b.offset - a.offset);

    let result = text;
    for (const entity of sortedEntities) {
        const { offset, length, type, url } = entity;
        const beforeText = result.substring(0, offset);
        const entityText = result.substring(offset, offset + length);
        const afterText = result.substring(offset + length);

        let replacement = entityText;
        switch (type) {
            case "text_link":
                replacement = `<a href="${url}">${entityText}</a>`;
                break;
            case "url":
                replacement = `<a href="${entityText}">${entityText}</a>`;
                break;
            case "bold":
                replacement = `<b>${entityText}</b>`;
                break;
            case "italic":
                replacement = `<i>${entityText}</i>`;
                break;
            case "code":
                replacement = `<code>${entityText}</code>`;
                break;
            case "pre":
                replacement = `<pre>${entityText}</pre>`;
                break;
        }

        result = beforeText + replacement + afterText;
    }

    return result;
};

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

// Reply keyboard buttons (text) handlers
telegramBot.hears(
    "Згенерувати дайджест",
    createDigestCommandReply(telegramBot)
);
telegramBot.hears("Допомога", helpCommandReply());

// Обробляємо переслані дописи та звичайні текстові повідомлення
telegramBot.on("text", async (ctx: Context) => {
    if (ctx?.chat?.type === "private") {
        const userId = ctx.from?.id;
        if (!userId) return;

        const message = ctx.message as any;
        const text = message?.text || "";
        const entities = message?.entities || [];

        // Конвертуємо entities у HTML для збереження посилань
        const eventText = entitiesToHTML(text, entities);

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
            const caption = message.caption || "";
            const captionEntities = message?.caption_entities || [];

            // Конвертуємо entities у HTML для збереження посилань
            const eventText = entitiesToHTML(caption, captionEntities);

            if (eventText.trim()) {
                addEvent(userId, eventText);
            }
        }
    }
});

export { telegramBot };
