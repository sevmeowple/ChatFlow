<script lang="ts">
    import { logger } from '$lib/utils/logger.svelte';
    import { onMount } from 'svelte';
    
    // 过滤选项
    let filterType: "all" | "warn" | "error" | "info" = "all";
    let searchTerm = "";
    let showDetails: Record<string, boolean> = {};
    
    $: filteredLogs = logger.logMessage.filter(log => {
        const matchesType = filterType === "all" || log.level === filterType;
        const matchesSearch = searchTerm === "" || 
            log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.detail && log.detail.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return matchesType && matchesSearch;
    });
    
    
    // 切换日志详情的显示
    function toggleDetails(logId: number) {
        showDetails[logId] = !showDetails[logId];
        showDetails = showDetails;
    }
    
    // 获取展示时间的格式化字符串
    function formatDate(date: Date): string {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(date);
    }
</script>

<div class="log-container">
    <h1>系统日志</h1>
    
    <div class="controls">
        <div class="filter">
            <input 
                type="text" 
                placeholder="搜索日志..." 
                bind:value={searchTerm}
                class="search-input"
            />
            
            <div class="type-filter">
                <button 
                    class:active={filterType === "all"} 
                    onclick={() => filterType = "all"}
                >
                    全部
                </button>
                <button 
                    class:active={filterType === "info"} 
                    onclick={() => filterType = "info"}
                >
                    信息
                </button>
                <button 
                    class:active={filterType === "warn"} 
                    onclick={() => filterType = "warn"}
                >
                    警告
                </button>
                <button 
                    class:active={filterType === "error"} 
                    onclick={() => filterType = "error"}
                >
                    错误
                </button>
            </div>
        </div>
        
        <div class="stats">
            共 {logger.logMessage.length} 条日志，显示 {filteredLogs.length} 条
        </div>
    </div>
    
    <div class="logs-list">
        {#if filteredLogs.length === 0}
            <div class="empty-state">
                没有符合条件的日志记录
            </div>
        {:else}
            {#each filteredLogs as log, index}
                <div class="log-item log-{log.level}">
                    <button class="log-header" onclick={() => toggleDetails(index)}>
                        <span class="log-type">{log.level === "info" ? "📝" : log.level === "warn" ? "⚠️" : "❌"}</span>
                        <span class="log-message">{log.message}</span>
                        <span class="log-time">{formatDate(log.timestamp)}</span>
                        <span class="toggle-icon">{showDetails[index] ? '▼' : '▶'}</span>
                    </button>
                    
                    {#if showDetails[index] && log.detail}
                        <div class="log-details">
                            <pre>{log.detail}</pre>
                        </div>
                    {/if}
                </div>
            {/each}
        {/if}
    </div>
</div>

<style>
    .log-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    h1 {
        color: #333;
        border-bottom: 1px solid #eee;
        padding-bottom: 10px;
        margin-bottom: 20px;
    }
    
    .controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    
    .filter {
        display: flex;
        gap: 15px;
        align-items: center;
    }
    
    .search-input {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        min-width: 250px;
    }
    
    .type-filter {
        display: flex;
        gap: 5px;
    }
    
    .type-filter button {
        padding: 6px 12px;
        border: 1px solid #ddd;
        background: #f5f5f5;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .type-filter button.active {
        background: #e0e0e0;
        font-weight: bold;
    }
    
    .stats {
        font-size: 0.9em;
        color: #666;
    }
    
    .logs-list {
        border: 1px solid #eee;
        border-radius: 4px;
        max-height: 70vh;
        overflow-y: auto;
    }
    
    .empty-state {
        padding: 20px;
        text-align: center;
        color: #888;
    }
    
    .log-item {
        border-bottom: 1px solid #eee;
    }
    
    .log-header {
        padding: 10px 15px;
        display: grid;
        grid-template-columns: 30px 1fr auto auto 30px;
        gap: 10px;
        align-items: center;
        cursor: pointer;
    }
    
    .log-header:hover {
        background-color: #f9f9f9;
    }
    
    .log-info {
        background-color: #f0f7ff;
    }
    
    .log-warn {
        background-color: #fff9e6;
    }
    
    .log-error {
        background-color: #ffeeee;
    }
    
    .log-time, .log-by {
        color: #666;
        font-size: 0.9em;
    }
    
    .log-details {
        padding: 10px 15px 15px 50px;
        background-color: #f5f5f5;
        border-top: 1px solid #eee;
    }
    
    .log-details pre {
        margin: 0;
        white-space: pre-wrap;
        font-family: monospace;
    }
    
    .toggle-icon {
        color: #999;
        font-size: 0.8em;
    }
</style>