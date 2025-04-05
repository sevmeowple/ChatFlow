import type { ChatMessage } from "$lib/types/chat";
import { logger } from "$lib/utils/logger.svelte";
import OpenAI from "openai";

class DeepSeek {
    openai: OpenAI;
    constructor(apiKey: string) {
        this.openai = new OpenAI({
            apiKey: apiKey,
            baseURL: "https://api.deepseek.com",
            dangerouslyAllowBrowser: true
        });
    }

    async chat(model: string = "deepseek-chat", history: ChatMessage[]) {
        let response;
        try {
            response = await this.openai.chat.completions.create({
                model: model,
                messages: history,
            });
        }
        catch (error) {
            logger.error("Error in DeepSeek chat:", error as string);
            return null;
        }

        return response.choices[0].message.content;
    }
}

export { DeepSeek };