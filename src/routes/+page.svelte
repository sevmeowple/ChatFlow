<script lang="ts">
  import { onMount, tick } from "svelte";
  import { chat } from "$lib/chat.svelte";
  import { AI_Name } from "$lib/types/chat";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import * as Table from "$lib/components/ui/table";
  import * as Select from "$lib/components/ui/select";
  // import Markdown from "@magidoc/plugin-svelte-marked"
  // import SvelteMakrdown from "svelte-markdown";
  import { marked } from "marked";
  import DOMPurify from "dompurify";

  // import {PlusCircle, Send, MessageCircle, Settings } from "@lucide/svelte
  import PlusCircle from "@lucide/svelte/icons/plus-circle";
  import Send from "@lucide/svelte/icons/send";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import Edit from "@lucide/svelte/icons/edit";
  import Check from "@lucide/svelte/icons/check";
  import X from "@lucide/svelte/icons/x";
  import Settings from "@lucide/svelte/icons/settings";

  const aiOptions = [
    { value: AI_Name.deepseek_chat, label: "DeepSeek Chat" },
    { value: AI_Name.deepseek_reasoner, label: "DeepSeek Reasoner" },
  ];

  let input = $state("");
  let selectedModel = $state<AI_Name>(AI_Name.deepseek_chat);
  let loading = $state(false);
  let selectedNodeId: string | undefined = $state(undefined);
  let lastNodeId: string | undefined = $state(undefined);

  // 添加编辑状态管理
  let editingHistoryId: string | null = $state(null);
  let editingHistoryName: string = $state("");

  // 开始编辑聊天历史名称
  async function startEditing(
    historyId: string,
    currentName: string,
    event: MouseEvent
  ) {
    event.stopPropagation(); // 阻止冒泡，防止触发聊天切换
    editingHistoryId = historyId;
    editingHistoryName = currentName;

    // 等待DOM更新后聚焦输入框
    await tick();
    const inputElement = document.getElementById(`edit-history-${historyId}`);
    if (inputElement) {
      inputElement.focus();
    }
  }

  // 保存编辑的名称
  function saveHistoryName(historyId: string, event: MouseEvent) {
    event.stopPropagation();
    if (editingHistoryName.trim()) {
      chat.ChatHistoryList[historyId].name = editingHistoryName.trim();
      // 如果有保存到持久化存储的需要，可以在这里调用保存方法
    }
    editingHistoryId = null;
  }

  // 取消编辑
  function cancelEditing(event: MouseEvent) {
    event.stopPropagation();
    editingHistoryId = null;
  }

  // 创建初始聊天，如果没有聊天历史
  onMount(() => {
    if (Object.keys(chat.ChatHistoryList).length === 0) {
      chat.createChat();
    } else {
      updateLastNodeId();
    }
  });

  // 当切换聊天历史时更新lastNodeId
  function updateLastNodeId() {
    const currentChat = chat.ChatHistoryList[chat.currentHistory];
    if (currentChat?.nodes) {
      // 找出最新的非根节点
      const nonRootNodes = currentChat.nodes.filter((node) => !node.is_root);
      if (nonRootNodes.length > 0) {
        // 按创建时间排序，取最新的
        const latestNode = nonRootNodes.sort(
          (a, b) => b.created_at - a.created_at
        )[0];
        lastNodeId = latestNode.id;
      } else {
        // 如果没有非根节点，则使用根节点ID
        lastNodeId = currentChat.root_id;
      }
    }
  }
  // 修改handleSend函数
  async function handleSend() {
    if (!input.trim() || loading) return;

    loading = true;
    try {
      // 使用选择的节点ID或最后一个节点ID
      const parentId = selectedNodeId || lastNodeId;

      // 调用chat方法并获取结果
      const newNodeId = await chat.chat(input, selectedModel, parentId);

      // 更新最后一个节点ID
      if (newNodeId !== undefined && newNodeId !== null) {
        lastNodeId = newNodeId;
      }

      input = ""; // 清空输入框
      selectedNodeId = undefined; // 重置选择的节点
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      loading = false;
    }
  }

  // 创建新对话
  function createNewChat() {
    chat.createChat();
    lastNodeId = undefined; // 重置lastNodeId
  }

  // 选择节点进行回复
  function selectNode(nodeId: string) {
    selectedNodeId = nodeId;
    lastNodeId = nodeId; // 同时更新lastNodeId
  }

  // 格式化日期
  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  }

  const triggerContent = $derived(
    aiOptions.find((option) => option.value === selectedModel)?.label ||
      "选择模型"
  );

  // 当currentHistory变化时，更新lastNodeId
  $effect(() => {
    if (chat.currentHistory) {
      updateLastNodeId();
    }
  });
</script>

<main class="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
  <!-- 侧边栏：聊天历史 -->
  <div
    class="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col"
  >
    <div class="p-4 border-b border-gray-200 dark:border-gray-800">
      <Button
        variant="outline"
        class="w-full justify-start gap-2"
        onclick={createNewChat}
      >
        <PlusCircle class="w-4 h-4" />
        新建对话
      </Button>
      <Button
        variant="outline"
        class="w-full justify-start gap-2"
        onclick={()=>{
          chat.loadHistory();
        }}
      >
        <PlusCircle class="w-4 h-4" />
        加载对话
      </Button>
      <Button
        variant="outline"
        class="w-full justify-start gap-2"
        onclick={() => {
          chat.saveHistory();
        }}
      >
        <PlusCircle class="w-4 h-4" />
        保存对话
      </Button>
      
    </div>

    <div class="overflow-y-auto flex-1">
      <Table.Root>
        <Table.Caption class="text-sm text-gray-500">聊天历史记录</Table.Caption
        >
        <Table.Body>
          {#each Object.values(chat.ChatHistoryList).sort((a, b) => b.created_at - a.created_at) as history}
            <Table.Row
              class="hover:bg-gray-400/10 dark:hover:bg-gray-800/50 cursor-pointer"
              data-state={chat.currentHistory === history.id ? "selected" : ""}
              onclick={() => (chat.currentHistory = history.id)}
            >
              <Table.Cell class="py-2">
                <div class="flex items-center gap-2">
                  <MessageCircle class="w-4 h-4 text-gray-500 flex-shrink-0" />

                  {#if editingHistoryId === history.id}
                    <!-- 编辑模式 -->
                    <div class="flex-1 flex items-center gap-1">
                      <input
                        id={`edit-history-${history.id}`}
                        type="text"
                        bind:value={editingHistoryName}
                        class="w-full border border-gray-300 dark:border-gray-700 rounded px-1 py-0.5 text-sm bg-white dark:bg-gray-800"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        class="h-6 w-6 p-1 bg-transparent hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                        onclick={(e) => saveHistoryName(history.id, e)}
                      >
                        <Check class="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        class="h-6 w-6 p-1 bg-transparent hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                        onclick={cancelEditing}
                      >
                        <X class="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  {:else}
                    <!-- 显示模式 -->
                    <div class="truncate font-medium">
                      {history.name}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-6 w-6 p-1 ml-auto bg-transparent hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                      onclick={(e) => startEditing(history.id, history.name, e)}
                    >
                      <Edit class="h-4 w-4 text-gray-400 dark:text-gray-200" />
                    </Button>
                  {/if}
                </div>
              </Table.Cell>
              <Table.Cell
                class="text-xs text-gray-400 dark:text-gray-200 text-right"
              >
                {formatDate(history.created_at)}
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  </div>

  <!-- 主聊天区域 -->
  <div class="flex-1 flex flex-col">
    <!-- 聊天消息 -->
    <ScrollArea class="flex-1 p-4 h-full">
      <div class="space-y-4 max-w-3xl mx-auto">
        {#if chat.ChatHistoryList[chat.currentHistory]?.nodes}
          {#each (chat.ChatHistoryList[chat.currentHistory]?.nodes ?? []).filter((node) => !node.is_root) as node}
            <!-- 用户消息 -->
            <div class="flex flex-col w-full">
              <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-2">
                <div
                  class="font-medium text-sm text-blue-700 dark:text-blue-300 mb-1"
                >
                  你
                </div>
                <div class="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {node.user_content.content}
                </div>
              </div>
    
              <!-- AI响应 -->
              <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <div class="flex items-center gap-2 mb-2">
                  <div
                    class="font-medium text-sm text-gray-700 dark:text-gray-300"
                  >
                    {node.ai_name}
                  </div>
                </div>
                <!-- <div
                  class="text-gray-800 dark:text-gray-200 prose dark:prose-invert prose-sm max-w-none whitespace-pre-wrap"
                >
                  {node.ai_content.content}
                </div> -->
                {#await marked.parse(node.ai_content.content)}
                  <p>Loading...</p>
                {:then parsedContent}
                  {@html DOMPurify.sanitize(parsedContent)}
                {:catch error}
                  <p>Error: {error.message}</p>
                {/await}
                <div class="mt-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-xs"
                    onclick={() => selectNode(node.id)}
                  >
                    回复此消息
                  </Button>
                </div>
              </div>
            </div>
          {/each}
        {/if}
    
        {#if loading}
          <div class="flex justify-center py-4">
            <div class="animate-pulse text-gray-500">正在生成回复...</div>
          </div>
        {/if}
      </div>
    </ScrollArea>

    <!-- 选中的回复节点显示 -->
    {#if selectedNodeId}
      <div
        class="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-sm"
      >
        回复中：{chat.nodeIndex[chat.currentHistory][
          selectedNodeId
        ]?.user_content.content.substring(0, 50)}...
        <Button
          variant="ghost"
          size="sm"
          class="ml-2"
          onclick={() => (selectedNodeId = undefined)}>取消</Button
        >
      </div>
    {/if}

    <!-- 输入区域 -->
    <div
      class="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-950"
    >
      <div class="max-w-3xl mx-auto">
        <div class="relative">
          <Textarea
            bind:value={input}
            placeholder="输入消息..."
            rows={1}
            class="min-h-[60px] resize-none pr-10 w-full"
            onkeydown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            class="absolute right-2 bottom-2"
            disabled={!input.trim() || loading}
            onclick={handleSend}
          >
            <Send class="w-4 h-4" />
            <span class="sr-only">发送</span>
          </Button>
        </div>

        <div class="flex justify-between items-center mt-2">
          <div class="flex items-center">
            <Select.Root
              type="single"
              name="modelselect"
              bind:value={selectedModel}
            >
              <Select.Trigger class="w-40 text-xs">
                {triggerContent}
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.GroupHeading>AI 模型</Select.GroupHeading>
                  {#each aiOptions as option}
                    <Select.Item value={option.value} label={option.label}>
                      {option.label}
                    </Select.Item>
                  {/each}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </div>
          <div class="text-xs text-gray-500">
            按 Enter 发送，Shift+Enter 换行
          </div>
        </div>
      </div>
    </div>
  </div>
</main>
