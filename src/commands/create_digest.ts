import createDebug from "debug";
import { Groq } from "groq-sdk";
import type { Context, Telegraf } from "telegraf";
import { getUserEvents, clearUserEvents } from "../core/telegram_bot";

const debug = createDebug("bot:create_digest");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export const createDigestCommandReply =
    (bot: Telegraf) => async (ctx: Context) => {
        debug('Triggered "generate" command');

        const userId = ctx.from?.id;
        if (!userId) {
            ctx.reply("Помилка: не вдалось визначити користувача");
            return;
        }

        const events = getUserEvents(userId);

        if (events.length === 0) {
            ctx.reply(
                "Дописів немає. Надішліть дописи перед генеруванням дайджесту."
            );
            return;
        }

        const eventsText = events.map((e) => e.text).join("\n\n---\n\n");

        await ctx.reply("Генеруємо дайджест...");

        try {
            const stream = await groq.chat.completions.create({
                model: "mixtral-8x7b-32768",
                messages: [
                    {
                        role: "user",
                        content: `Згенеруй дайджест подій на основі пачки дописів. Уникай дублювання подій. Формат дайджесту:\n\n📆 Дайджест заходів на найближчий час\n\n{Назва події 1}\nКоли та де: {Де відбувається}\n{Як потрапити}\n\n{Назва події 2}\nКоли та де: {Де відбувається}\n{Як потрапити}\n\n...\n\n{Назва події N}\nКоли та де: {Де відбувається}\n{Як потрапити}\n\n👉 Обирай захід до душі та не упускай можливостей\n\nВот дописи для дайджесту:\n\n${eventsText}`,
                    },
                ],
                temperature: 1,
                max_completion_tokens: 8192,
                top_p: 1,
                stream: true,
            });

            let fullResponse = "";

            for await (const chunk of stream) {
                const content = chunk.choices[0].delta.content;
                if (content) {
                    fullResponse += content;
                }
            }

            // Відправляємо дайджест користувачу частинами (якщо він великий)
            const maxLength = 4096; // Максимальна довжина повідомлення в Telegram
            for (let i = 0; i < fullResponse.length; i += maxLength) {
                await ctx.reply(fullResponse.substring(i, i + maxLength), {
                    parse_mode: "HTML",
                });
            }

            // Очищуємо дописи після генерування
            clearUserEvents(userId);
            await ctx.reply("Дайджест згенерований.");

            debug("Digest generated successfully");
        } catch (error: unknown) {
            debug("Error generating digest:", error);
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            ctx.reply(`Помилка при генеруванні дайджесту: ${errorMessage}`);
        }
    };
