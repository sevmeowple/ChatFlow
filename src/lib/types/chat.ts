/**
 * @description 定义chat相关的类型
 */



/**
 * @description AI的枚举
 *
 * @enum {number}
 * @property {string} deepseek - DeepSeek
 * 
 */
enum AI_Name {
    root = 'root',
    deepseek_chat = 'deepseek-chat',
    deepseek_reasoner = 'deepseek-reasoner',
}

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatNode {
    user_content: ChatMessage;
    ai_content: ChatMessage;
    ai_name: AI_Name;
    created_at: number;
    id: string;
    parent_id: string;
    children_ids: string[];
    is_root: boolean;
}

interface ChatHistory {
    id: string;
    name: string;
    nodes?: ChatNode[];
    created_at: number;
    root_id: string;
}

interface ChatHistoryList {
    [key: string]: ChatHistory;   
}


export type { ChatMessage, ChatNode, ChatHistory, ChatHistoryList };
export { AI_Name };