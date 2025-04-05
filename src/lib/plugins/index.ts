import { DeepSeek } from "./deepseek";
import { settingManger } from "$lib/setting";
import { logger } from "$lib/utils/logger.svelte";
import type { ChatMessage } from "$lib/types/chat";
import { AI_Name } from "$lib/types/chat";

class Adapter {
    deepseek?: DeepSeek;
    async init() {
        if (settingManger.config) {
            if (settingManger.config.api) {
                if (settingManger.config.api.deepseek) {
                    this.deepseek = new DeepSeek(settingManger.config.api.deepseek);
                }
                else {
                    logger.error("settingManger.config.api.deepseek is undefined");
                }
            }
            else {
                logger.error("settingManger.config.api is undefined");
            }
        }
        else {
            logger.error("settingManger.config is undefined");
        }

    }

    async chat( model: AI_Name = AI_Name.deepseek_chat, history: ChatMessage[]) {
        switch (model) {
            case AI_Name.deepseek_chat:
                if (this.deepseek) {
                    return await this.deepseek.chat( model, history);
                }
                else {
                    logger.error("this.deepseek is undefined");
                }
                break;
            case AI_Name.deepseek_reasoner:
                if (this.deepseek) {
                    return await this.deepseek.chat( model, history);
                }
                else {
                    logger.error("this.deepseek is undefined");
                }
                break;
            default:
                logger.error("model is not supported");
                break;
        }
        return "服务不可达,请检查logger重试";
    }
}

const adapter = new Adapter();
export { adapter };