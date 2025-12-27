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
                model: "openai/gpt-oss-120b",
                messages: [
                    {
                        role: "user",
                        content: `Згенеруй дайджест подій на основі пачки дописів. Уникай дублювання подій. 

ВАЖЛИВО: Використовуй ТІЛЬКИ ЦІ HTML теги:
- <b>жирний текст</b> для назв подій
- <i>курсив</i> для виділення
- <a href="URL">текст посилання</a> для гіперпосилань
- НЕ використовуй <br>, <p>, <div> - замість них використовуй звичайні переноси рядків

Формат дайджесту:

📆 Дайджест заходів на найближчий час

<b>Назва події 1</b>
Коли та де: {Де відбувається}
Як потрапити: {інструкції з посиланнями, якщо є, наприклад: <a href="https://forms.gle/xxx">зареєструватися</a>}

<b>Назва події 2</b>
Коли та де: {Де відбувається}
Як потрапити: {інструкції}

<b>Назва події N</b>
Коли та де: {Де відбувається}
Як потрапити: {інструкції}

👉 Обирай захід до душі та не упускай можливостей

Ось дописи для дайджесту:

${eventsText}`,
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

            // Очищаємо неприпустимі HTML теги для Telegram
            fullResponse = fullResponse
                .replace(/<br\s*\/?>/gi, "\n") // <br> замінюємо на перенос рядка
                .replace(/<\/?p>/gi, "\n") // <p> замінюємо на перенос
                .replace(/<\/?div>/gi, "\n") // <div> замінюємо на перенос
                .replace(/\n{3,}/g, "\n\n"); // Видаляємо зайві переноси

            // Відправляємо дайджест користувачу частинами (якщо він великий)
            const maxLength = 4096; // Максимальна довжина повідомлення в Telegram
            for (let i = 0; i < fullResponse.length; i += maxLength) {
                await ctx.reply(fullResponse.substring(i, i + maxLength), {
                    parse_mode: "HTML",
                    link_preview_options: { is_disabled: true },
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
