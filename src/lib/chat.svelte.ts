import type { ChatMessage, ChatNode, ChatHistory, ChatHistoryList } from './types/chat';
import * as uuid from 'uuid';

import { AI_Name } from './types/chat';
import { adapter } from './plugins';
import { logger } from './utils/logger.svelte';
import Database from '@tauri-apps/plugin-sql';
class Chat {
    ChatHistoryList: ChatHistoryList = $state({})
    currentHistory = $state<string>('')
    selectedNodeId: string | undefined = $state(undefined);
    // chat(model:string,)
    nodeIndex: Record<string, Record<string, ChatNode>> = {};
    db: Database | null = null;
    private updateNodeIndex(historyId: string, node: ChatNode) {
        // 如果这个历史ID的索引不存在，先创建
        if (!this.nodeIndex[historyId]) {
            this.nodeIndex[historyId] = {};
        }
        // 将节点添加到相应的索引中
        this.nodeIndex[historyId][node.id] = node;
    }


    // 可选：添加批量初始化索引的方法
    private initNodeIndex(historyId: string, nodes: ChatNode[]) {
        const nodeMap: Record<string, ChatNode> = {};
        for (const node of nodes) {
            nodeMap[node.id] = node;
        }
        this.nodeIndex[historyId] = nodeMap;
    }

    createChat() {
        const chatId = uuid.v4();
        const chatHistory: ChatHistory = {
            id: chatId,
            name: 'New Chat',
            created_at: Date.now(),
            // messages: [],
            nodes: [],
            root_id: uuid.v4(),
        }
        const root_node: ChatNode = {
            user_content: {
                role: 'user',
                content: '',
            },
            ai_content: {
                role: 'assistant',
                content: '',
            },
            ai_name: AI_Name.root,
            created_at: Date.now(),
            id: chatHistory.root_id,
            parent_id: '',
            children_ids: [],
            is_root: true,
        }
        if (!chatHistory.nodes)
            chatHistory.nodes = [];
        chatHistory.nodes.push(root_node);

        this.currentHistory = chatId;
        this.ChatHistoryList[chatId] = chatHistory;

        this.updateNodeIndex(chatId, root_node);

        return chatId;
    }

    async chat(prompt: string, model: AI_Name, parent_id?: string) {
        // 从currentHistory中获取当前的聊天记录一直到根节点
        // 并合并成ChatMessage数组
        const chatHistory = this.ChatHistoryList[this.currentHistory];
        if (!chatHistory) {
            logger.error("chatHistory is undefined in chat.svelte.ts");
            return null
        }
        // 获取当前聊天历史的节点索引
        const historyIndex = this.nodeIndex[this.currentHistory];
        if (!historyIndex) {
            // 如果索引不存在，初始化它（可能是从存储加载的历史）
            if (chatHistory.nodes) {
                this.initNodeIndex(this.currentHistory, chatHistory.nodes);
            }
        }


        // 使用索引快速构建消息历史
        let messages: ChatMessage[] = [];
        let nodes: ChatNode[] = [];
        let currentNodeId = parent_id || chatHistory.root_id;

        // 通过索引高效查找节点
        while (currentNodeId && historyIndex[currentNodeId]) {
            const currentNode = historyIndex[currentNodeId];
            // 仅添加非根节点
            if (!currentNode.is_root) {
                nodes.push(currentNode);
            }
            currentNodeId = currentNode.parent_id;
        }
        nodes.reverse();
        for (const node of nodes) {
            // 只添加非空消息
            if (node.user_content && node.user_content.content.trim()) {
                messages.push(node.user_content);
            }
            if (node.ai_content && node.ai_content.content.trim()) {
                messages.push(node.ai_content);
            }
        }

        if (model === AI_Name.deepseek_reasoner && messages.length > 0) {
            // 确保第一条消息是用户消息
            if (messages[0].role !== 'user') {
                logger.error("deepseek-reasoner 要求第一条消息必须是用户消息");
            }
        }

        // 添加新的用户消息
        messages.push({
            role: 'user',
            content: prompt
        });
        // 调用adapter进行聊天
        if (adapter) {
            const result = await adapter.chat( model, messages);
            if (result) {
                // 将结果添加到聊天记录中
                const chatNode: ChatNode = {
                    user_content: {
                        role: 'user',
                        content: prompt,
                    },
                    ai_content: {
                        role: 'assistant',
                        content: result,
                    },
                    ai_name: model,
                    created_at: Date.now(),
                    id: uuid.v4(),
                    parent_id: parent_id || chatHistory.root_id,
                    children_ids: [],
                    is_root: false,
                }
                chatHistory.nodes?.push(chatNode);
                this.updateNodeIndex(this.currentHistory, chatNode);
                if (parent_id) {
                    const parentNode = historyIndex[parent_id];
                    if (parentNode) {
                        parentNode.children_ids.push(chatNode.id);
                    }
                }

                return chatNode.id;
            }
        }
        else {
            logger.error("adapter is undefined in chat.svelte.ts");
        }

        return null
    }

    async init() {
        try {
            this.db = await Database.load('sqlite:chat.db');

            // 创建表结构（如果不存在）
            await this.db.execute(`
            CREATE TABLE IF NOT EXISTS chatHistory (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              created_at INTEGER NOT NULL,
              root_id TEXT NOT NULL
            )
          `);

            await this.db.execute(`
            CREATE TABLE IF NOT EXISTS chatNode (
              id TEXT PRIMARY KEY,
              history_id TEXT NOT NULL,
              user_content_role TEXT NOT NULL,
              user_content_content TEXT NOT NULL,
              ai_content_role TEXT NOT NULL,
              ai_content_content TEXT NOT NULL,
              ai_name TEXT NOT NULL,
              created_at INTEGER NOT NULL,
              parent_id TEXT NOT NULL,
              is_root BOOLEAN NOT NULL,
              FOREIGN KEY (history_id) REFERENCES chatHistory(id) ON DELETE CASCADE
            )
          `);

            // 创建节点关系表
            await this.db.execute(`
            CREATE TABLE IF NOT EXISTS nodeRelation (
              parent_id TEXT NOT NULL,
              child_id TEXT NOT NULL,
              PRIMARY KEY (parent_id, child_id),
              FOREIGN KEY (parent_id) REFERENCES chatNode(id) ON DELETE CASCADE,
              FOREIGN KEY (child_id) REFERENCES chatNode(id) ON DELETE CASCADE
            )
          `);

            // 加载历史记录
            await this.loadHistory();
            logger.info("初始化聊天数据库成功");
        } catch (error) {
            logger.error("初始化聊天数据库失败", error instanceof Error ? error.message : String(error));
        }
    }

    async loadHistory() {
        if (!this.db) {
            logger.error("数据库未初始化");
            return;
        }

        try {
            // 清空当前历史记录
            this.ChatHistoryList = {};
            this.nodeIndex = {};

            // 加载所有聊天历史
            const historiesResult = await this.db.select<{ id: string; name: string; created_at: number; root_id: string; }>("SELECT * FROM chatHistory");

            for (const historyRow of Array.isArray(historiesResult) ? historiesResult : []) {
                const history: ChatHistory = {
                    id: historyRow.id,
                    name: historyRow.name,
                    created_at: historyRow.created_at,
                    root_id: historyRow.root_id,
                    nodes: []
                };

                // 加载该历史的所有节点
                const nodesResult = await this.db.select(
                    "SELECT * FROM chatNode WHERE history_id = $1",
                    [history.id]
                );

                // 创建节点映射，方便后续构建关系
                const nodeMap: Record<string, ChatNode> = {};

                // 首先创建所有节点对象
                for (const nodeRow of nodesResult as Array<{ id: string; user_content_role: "user" | "assistant" | "system"; user_content_content: string; ai_content_role: "user" | "assistant" | "system"; ai_content_content: string; ai_name: AI_Name; created_at: number; parent_id: string; is_root: number; }>) {
                    const node: ChatNode = {
                        id: nodeRow.id,
                        user_content: {
                            role: nodeRow.user_content_role,
                            content: nodeRow.user_content_content
                        },
                        ai_content: {
                            role: nodeRow.ai_content_role,
                            content: nodeRow.ai_content_content
                        },
                        ai_name: nodeRow.ai_name,
                        created_at: nodeRow.created_at,
                        parent_id: nodeRow.parent_id,
                        children_ids: [],
                        is_root: nodeRow.is_root === 1
                    };

                    nodeMap[node.id] = node;
                    history.nodes?.push(node);
                }

                // 加载节点关系
                const relationsResult = await this.db.select<{ parent_id: string; child_id: string }>(
                    "SELECT * FROM nodeRelation WHERE parent_id IN (SELECT id FROM chatNode WHERE history_id = $1)",
                    [history.id]
                );

                // 构建节点之间的父子关系
                for (const relation of Array.isArray(relationsResult) ? relationsResult : []) {
                    const parentNode = nodeMap[relation.parent_id];
                    if (parentNode) {
                        parentNode.children_ids.push(relation.child_id);
                    }
                }

                // 添加历史记录
                this.ChatHistoryList[history.id] = history;

                // 初始化节点索引
                this.initNodeIndex(history.id, history.nodes as ChatNode[]);
            }

            // 如果有聊天历史，设置当前选中的为最新的一个
            const historyIds = Object.keys(this.ChatHistoryList);
            if (historyIds.length > 0) {
                // 按创建时间排序，选择最新的
                const sortedHistories = [...historyIds]
                    .map(id => this.ChatHistoryList[id])
                    .sort((a, b) => b.created_at - a.created_at);

                this.currentHistory = sortedHistories[0].id;
            }

            logger.info(`加载了 ${historyIds.length} 条聊天历史`);
        } catch (error) {
            logger.error("加载聊天历史失败", error instanceof Error ? error.message : String(error));
        }
    }

    async saveHistory(historyId?: string) {
        if (!this.db) {
            logger.error("数据库未初始化");
            return;
        }

        try {
            // 如果未指定历史ID，则保存所有历史
            const historiesToSave = historyId
                ? [this.ChatHistoryList[historyId]].filter(Boolean)
                : Object.values(this.ChatHistoryList);

            for (const history of historiesToSave) {
                // 首先检查历史记录是否存在
                const existingHistory = await this.db.select<[{ id: string }]>(
                    "SELECT id FROM chatHistory WHERE id = $1",
                    [history.id]
                );

                if (existingHistory.length > 0) {
                    // 更新现有历史
                    await this.db.execute(
                        "UPDATE chatHistory SET name = $1, created_at = $2, root_id = $3 WHERE id = $4",
                        [history.name, history.created_at, history.root_id, history.id]
                    );
                } else {
                    // 插入新历史
                    await this.db.execute(
                        "INSERT INTO chatHistory (id, name, created_at, root_id) VALUES ($1, $2, $3, $4)",
                        [history.id, history.name, history.created_at, history.root_id]
                    );
                }

                // 处理节点
                if (history.nodes) {
                    // 获取数据库中该历史的所有现有节点
                    const existingNodesResult = await this.db.select<[{ id: string }]>(
                        "SELECT id FROM chatNode WHERE history_id = $1",
                        [history.id]
                    );
                    const existingNodeIds = new Set(existingNodesResult.map(row => row.id));

                    // 跟踪已处理的节点ID
                    const processedNodeIds = new Set<string>();

                    // 批量处理节点关系
                    const relationBatch: [string, string][] = [];

                    for (const node of history.nodes) {
                        processedNodeIds.add(node.id);

                        if (existingNodeIds.has(node.id)) {
                            // 更新现有节点
                            await this.db.execute(`
                    UPDATE chatNode SET 
                      user_content_role = $1,
                      user_content_content = $2,
                      ai_content_role = $3,
                      ai_content_content = $4,
                      ai_name = $5,
                      created_at = $6,
                      parent_id = $7,
                      is_root = $8
                    WHERE id = $9 AND history_id = $10
                  `, [
                                node.user_content.role,
                                node.user_content.content,
                                node.ai_content.role,
                                node.ai_content.content,
                                node.ai_name,
                                node.created_at,
                                node.parent_id,
                                node.is_root ? 1 : 0,
                                node.id,
                                history.id
                            ]);
                        } else {
                            // 插入新节点
                            await this.db.execute(`
                    INSERT INTO chatNode (
                      id, history_id, user_content_role, user_content_content, 
                      ai_content_role, ai_content_content, ai_name, 
                      created_at, parent_id, is_root
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                  `, [
                                node.id,
                                history.id,
                                node.user_content.role,
                                node.user_content.content,
                                node.ai_content.role,
                                node.ai_content.content,
                                node.ai_name,
                                node.created_at,
                                node.parent_id,
                                node.is_root ? 1 : 0
                            ]);
                        }

                        // 收集节点关系
                        for (const childId of node.children_ids) {
                            relationBatch.push([node.id, childId]);
                        }
                    }

                    // 删除不再存在的节点
                    for (const existingId of existingNodeIds) {
                        if (!processedNodeIds.has(existingId)) {
                            await this.db.execute(
                                "DELETE FROM chatNode WHERE id = $1",
                                [existingId]
                            );
                        }
                    }

                    // 清除并重新创建所有节点关系
                    await this.db.execute(
                        "DELETE FROM nodeRelation WHERE parent_id IN (SELECT id FROM chatNode WHERE history_id = $1)",
                        [history.id]
                    );

                    // 批量插入关系
                    if (relationBatch.length > 0) {
                        // SQLite不支持批量插入，需要逐个插入
                        for (const [parentId, childId] of relationBatch) {
                            await this.db.execute(
                                "INSERT INTO nodeRelation (parent_id, child_id) VALUES ($1, $2)",
                                [parentId, childId]
                            );
                        }
                    }
                }
            }

            logger.info(`保存了 ${historiesToSave.length} 条聊天历史`);
        } catch (error) {
            logger.error("保存聊天历史失败", error instanceof Error ? error.message : String(error));
        }
    }
}

const chat = new Chat();
export { chat };