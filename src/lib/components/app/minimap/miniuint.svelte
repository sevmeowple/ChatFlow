<script lang="ts">
    import type { ChatNode } from "$lib/types/chat";
    import { Button } from "$lib/components/ui/button";
  
    // 组件属性
    export let node: ChatNode;
    export let selected: boolean = false;
    export let depth: number = 0; // 节点深度，用于缩进
    
    // 使用回调属性代替事件分发器
    export let onSelect: (nodeId: string) => void = () => {};
  
    // 选择节点的处理函数
    function handleSelect() {
      onSelect(node.id);
    }
  
    // 根据深度计算缩进样式
    $: indentStyle = `margin-left: ${depth * 20}px`;
  
    // 简单格式化时间戳
    function formatTime(timestamp: number): string {
      return new Date(timestamp).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  
    // 截断用户消息作为预览
    $: previewText =
      node.user_content.content.length > 20
        ? node.user_content.content.substring(0, 20) + "..."
        : node.user_content.content;
  </script>
  
  <!-- 节点容器 -->
  <Button
    variant="ghost"
    style={indentStyle}
    class="py-1 px-2 my-1 rounded cursor-pointer transition-colors w-full flex items-center justify-start h-auto {selected
      ? 'bg-blue-100 dark:bg-blue-900/40 border-l-2 border-blue-500'
      : 'hover:bg-gray-100 dark:hover:bg-gray-800/60 border-l-2 border-transparent'}"
    onclick={handleSelect}
  >
    <!-- 简化内容展示 -->
    <div class="flex-1 overflow-hidden text-left">
      <!-- AI名称和时间 -->
      <div class="flex justify-between text-xs w-full">
        <span class="font-medium text-gray-700 dark:text-gray-300">
          {node.ai_name}
        </span>
        <span class="text-gray-500">
          {formatTime(node.created_at)}
        </span>
      </div>
  
      <!-- 简短预览 -->
      <div class="text-xs text-gray-500 truncate">
        {previewText}
      </div>
    </div>
  </Button>