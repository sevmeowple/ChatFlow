<script lang="ts">
  import { chat } from "$lib/chat.svelte";
  import type { ChatNode } from "$lib/types/chat";
  import MiniUnit from "./miniuint.svelte";
  import { Button } from "$lib/components/ui/button";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Minimize2 from "@lucide/svelte/icons/minimize-2";
  import Maximize2 from "@lucide/svelte/icons/maximize-2";
  import { logger } from "$lib/utils/logger.svelte";

  // 控制面板是否展开
  let expanded = $state(true);

  // 追踪折叠状态的节点
  let collapsedNodes = $state<Set<string>>(new Set());
  let rootNodeId: string | undefined = $state(undefined);
  let treeItems = $state<any[]>([]);
  let nodeCount = $state(0);
  let visibleNodeCount = $state(0);

  // 树缓存，避免不必要的重建
  let treeCache = $state<{
    historyId: string | null;
    collapsedState: string;
    items: any[];
  }>({
    historyId: null,
    collapsedState: "",
    items: [],
  });

  // 节点选择处理
  function handleNodeSelect(nodeId: string) {
    chat.selectedNodeId = nodeId;
  }

  // 切换节点折叠状态
  function toggleCollapsed(nodeId: string) {
    if (collapsedNodes.has(nodeId)) {
      collapsedNodes.delete(nodeId);
    } else {
      collapsedNodes.add(nodeId);
    }

    // 更新折叠状态后，强制更新树结构
    updateTreeItems();
  }

  // 展开所有节点
  function expandAll() {
    collapsedNodes.clear();
    updateTreeItems();
  }

  // 折叠所有非根节点
  function collapseAll() {
    const currentHistory = chat.ChatHistoryList[chat.currentHistory];
    if (!currentHistory?.nodes) return;

    // 找出所有非叶子节点
    const nonLeafNodes = currentHistory.nodes
      .filter((node) => node.children_ids.length > 0)
      .map((node) => node.id);

    collapsedNodes = new Set(nonLeafNodes);
    updateTreeItems();
  }

  // 当前历史ID变化时，重置折叠状态
  $effect(() => {
    if (chat.currentHistory) {
      collapsedNodes.clear();
      updateTreeItems();
    }
  });

  // 优化：使用单次遍历构建完整树
  function buildFlattenedTree(rootNodeId: string): any[] {
    const result: any[] = [];
    const index = chat.nodeIndex[chat.currentHistory] || {};
    const history = chat.ChatHistoryList[chat.currentHistory];

    // 如果节点索引为空，但有节点数据，初始化索引
    if (
      Object.keys(index).length === 0 &&
      history.nodes?.length &&
      history?.nodes?.length > 0
    ) {
      // 尝试重建索引
      if (!chat.nodeIndex[chat.currentHistory]) {
        chat.nodeIndex[chat.currentHistory] = {};
      }

      for (const node of history.nodes) {
        chat.nodeIndex[chat.currentHistory][node.id] = node;
      }
    }

    // 修改的递归辅助函数
    function traverse(nodeId: string, depth: number) {
      const node = index[nodeId];
      if (!node) return;

      // 对于新对话，可能需要包含根节点以显示初始状态
      const isRootNode = node.is_root && depth === 0;

      // 如果是根节点且有子节点，处理子节点
      if (isRootNode) {
        // 如果根节点没有子节点但有其他节点，可能是索引问题
        if (
          node.children_ids.length === 0 &&
          history.nodes?.length &&
          history?.nodes?.length > 1
        ) {
          // 尝试找出应该是根节点子节点的节点
          const possibleChildren = history.nodes?.filter(
            (n) => n.parent_id === rootNodeId && !n.is_root
          );

          // 如果找到，添加到子节点列表并更新索引
          if (possibleChildren) {
            if (possibleChildren.length > 0) {
              node.children_ids = possibleChildren.map((n) => n.id);
            }
          }
        }

        // 处理子节点
        node.children_ids.forEach((childId) => traverse(childId, depth + 1));

        // 如果没有子节点可能是新对话，显示根节点本身
        if (
          node.children_ids.length === 0 &&
          history.nodes?.length &&
          history?.nodes?.length <= 1
        ) {
          // 添加提示性占位节点而非根节点
          result.push({
            placeholderMessage: "新建对话，开始聊天吧",
            depth: depth + 1,
            hasChildren: false,
            isCollapsed: false,
          });
        }

        return;
      }

      const hasChildren = node.children_ids.length > 0;
      const isCollapsed = collapsedNodes.has(node.id);

      // 添加当前节点
      result.push({
        node,
        depth,
        hasChildren,
        isCollapsed,
      });

      // 如果未折叠且有子节点，递归处理子节点
      if (hasChildren && !isCollapsed) {
        node.children_ids.forEach((childId) => traverse(childId, depth + 1));
      }
    }

    traverse(rootNodeId, 0);

    // 如果结果为空但有节点数据，可能是结构问题
    if (
      result.length === 0 &&
      history.nodes?.length &&
      history?.nodes?.length > 1
    ) {
      // 添加所有非根节点，可能是树结构损坏了
      for (const node of history.nodes) {
        if (!node.is_root) {
          result.push({
            node,
            depth: 0,
            hasChildren: node.children_ids.length > 0,
            isCollapsed: collapsedNodes.has(node.id),
          });
        }
      }
    }

    return result;
  }
  // 修正计数逻辑
  function updateNodeCounts(items: any[], totalNodes: number) {
    // 可见节点数量
    visibleNodeCount = items.length;

    // 总节点数（排除根节点）
    nodeCount = totalNodes > 0 ? totalNodes - 1 : 0;
  }
  // 更新树项目，包含缓存逻辑
  function updateTreeItems() {
    const currentHistoryId = chat.currentHistory;
    const history = chat.ChatHistoryList[currentHistoryId];
    const rootId = history?.root_id;

    if (!rootId) {
      treeItems = [];
      updateNodeCounts([], 0);
      return;
    }

    const totalNodes = history?.nodes?.length || 0;

    // 创建折叠状态的指纹
    const collapsedStateFingerprint = Array.from(collapsedNodes)
      .sort()
      .join(",");

    // 检查是否需要重建树
    const needsRebuild =
      treeCache.historyId !== currentHistoryId ||
      treeCache.collapsedState !== collapsedStateFingerprint;

    if (needsRebuild) {
      const newItems = buildFlattenedTree(rootId);

      // 更新缓存
      treeCache = {
        historyId: currentHistoryId,
        collapsedState: collapsedStateFingerprint,
        items: newItems,
      };

      // 更新UI状态
      treeItems = newItems;
      updateNodeCounts(newItems, totalNodes);

      logger.info(
        "构建完成",
        `${JSON.stringify(
          newItems.map((item) => ({
            id: item.node?.id || "占位符",
            depth: item.depth,
            parent_id: item.node?.parent_id || "",
            content_preview:
              item.node?.user_content.content.substring(0, 20) || "",
          }))
        )}`
      );
    }
  }

  // 初始化和依赖更新
  $effect(() => {
    rootNodeId = chat.ChatHistoryList[chat.currentHistory]?.root_id;
    updateTreeItems();
  });
</script>

<div
  class="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden"
>
  <!-- 标题栏 -->
  <div
    class="px-3 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900"
  >
    <div class="font-medium text-sm flex items-center gap-2">
      对话历史树
      <span class="text-xs text-gray-500">
        ({visibleNodeCount}/{nodeCount}个节点)
      </span>
    </div>

    <div class="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        class="h-6 w-6"
        onclick={expandAll}
        title="展开所有"
      >
        <Maximize2 class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-6 w-6"
        onclick={collapseAll}
        title="折叠所有"
      >
        <Minimize2 class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-6 w-6"
        onclick={() => (expanded = !expanded)}
        title={expanded ? "隐藏树图" : "显示树图"}
      >
        {#if expanded}
          <ChevronDown class="h-3.5 w-3.5" />
        {:else}
          <ChevronRight class="h-3.5 w-3.5" />
        {/if}
      </Button>
    </div>
  </div>

  <!-- 树内容 -->
  <!-- 树内容 -->
  {#if expanded}
    <div class="tree-view h-[300px] overflow-auto">
      <div class="p-2">
        {#if treeItems.length > 0}
          <div class="tree">
            {#each treeItems as item}
              {#if item.placeholderMessage}
                <div
                  class="tree-placeholder py-4 text-center text-gray-500 text-sm"
                >
                  {item.placeholderMessage}
                </div>
              {:else}
                <div
                  class="tree-node"
                  style="--tree-depth: {item.depth};"
                  data-node-id={item.node.id}
                  class:tree-node-selected={chat.selectedNodeId ===
                    item.node.id}
                >
                  <div class="tree-line-area">
                    <!-- 垂直连接线 -->
                    {#if item.depth > 0}
                      <div class="tree-line-vertical"></div>
                    {/if}

                    <!-- 水平连接线 -->
                    {#if item.depth > 0}
                      <div class="tree-line-horizontal"></div>
                    {/if}
                  </div>

                  <div class="tree-toggle">
                    {#if item.hasChildren}
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-6 w-6 p-0"
                        onclick={() => toggleCollapsed(item.node.id)}
                      >
                        {#if item.isCollapsed}
                          <ChevronRight class="h-3.5 w-3.5" />
                        {:else}
                          <ChevronDown class="h-3.5 w-3.5" />
                        {/if}
                      </Button>
                    {:else}
                      <div class="w-6 h-6"></div>
                    {/if}
                  </div>

                  <div class="tree-content">
                    <MiniUnit
                      node={item.node}
                      depth={0}
                      selected={chat.selectedNodeId === item.node.id}
                      onSelect={handleNodeSelect}
                    />
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        {:else if chat.currentHistory}
          <div class="p-4 text-center text-gray-500 text-sm">
            当前对话还没有历史记录
          </div>
        {:else}
          <div class="p-4 text-center text-gray-500 text-sm">
            请选择或创建一个对话
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .tree-view {
    position: relative;
  }

  .tree {
    --node-indent: 24px;
    --line-color: #e2e8f0;
    --line-width: 1px;
    --toggle-size: 24px;

    position: relative;
    font-size: 14px;
  }

  :global(.dark) .tree {
    --line-color: #2d3748;
  }

  .tree-node {
    position: relative;
    display: flex;
    align-items: flex-start;
    padding: 2px 0;
    margin-left: calc(var(--tree-depth) * var(--node-indent));
  }

  .tree-line-area {
    position: absolute;
    top: 0;
    left: calc(-1 * var(--node-indent));
    bottom: 0;
    width: var(--node-indent);
    pointer-events: none;
  }

  .tree-line-vertical {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 50%;
    width: var(--line-width);
    background-color: var(--line-color);
  }

  .tree-line-horizontal {
    position: absolute;
    top: 50%;
    left: 0;
    width: var(--node-indent);
    height: var(--line-width);
    background-color: var(--line-color);
    transform: translateY(-50%);
  }

  .tree-toggle {
    flex: 0 0 var(--toggle-size);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tree-content {
    flex: 1;
    min-width: 0;
  }

  .tree-node-selected > .tree-content {
    background-color: rgba(59, 130, 246, 0.05);
  }

  /* 只为最后一个子节点显示一半的垂直线 */
  .tree-node:last-child > .tree-line-area > .tree-line-vertical {
    bottom: 50%;
  }
</style>
