<script lang="ts">
  import "../app.css";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import Calendar from "@lucide/svelte/icons/calendar";
  import House from "@lucide/svelte/icons/house";
  import Log from "@lucide/svelte/icons/logs";
  import Inbox from "@lucide/svelte/icons/inbox";
  import Search from "@lucide/svelte/icons/search";
  import Settings from "@lucide/svelte/icons/settings";
  import PencilLine from "@lucide/svelte/icons/pencil-line";
  import Cat from "@lucide/svelte/icons/cat";

  import { onMount } from "svelte";
  // import { useSidebar } from '$lib/components/ui/sidebar/context.svelte';
  // import Sidebar from '$lib/components/ui/sidebar/sidebar.svelte';
  import { sidebarStyle } from "./style";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as Drawer from "$lib/components/ui/drawer/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { settingManger } from "$lib/setting";
  import { adapter } from "$lib/plugins";
  import { marked } from "marked";
  import markedKatex from "marked-katex-extension";
  import { chat } from "$lib/chat.svelte";
  // const { toggle } = useSidebar();

  import MiniMap from "$lib/components/app/minimap/minimap.svelte";
  const items = [
    {
      title: "Home",
      url: "/",
      icon: House,
    },
    {
      title: "Setting",
      url: "/setting",
      icon: Settings,
    },
    {
      title: "Logger",
      url: "/logger",
      icon: Log,
    },
  ];
  let { children } = $props();

  const options = {
    throwOnError: false,
  };

  onMount(async () => {
    await settingManger.init();
    await adapter.init();
    await chat.init();
    marked.use(
      {
        async: true,
        pedantic: false,
        gfm: true,
      },
      markedKatex(options)
    );
  });
  // 控制 MiniMap 的显示状态
  let showMiniMap = $state(true);

  // 切换 MiniMap 显示/隐藏
  function toggleMiniMap() {
    showMiniMap = !showMiniMap;
  }
  // const sidebar = useSidebar();
</script>

<div class="flex min-h-screen">
  <Sidebar.Provider>
    <div class="flex h-screen flex-1">
      <Sidebar.Root
        variant={sidebarStyle.RootStyle.variant}
        collapsible={sidebarStyle.RootStyle.collapsible}
        class="h-full"
      >
        <Sidebar.Content class="h-full">
          <Sidebar.Header>
            <Sidebar.Trigger />
          </Sidebar.Header>

          <Sidebar.Group>
            <Sidebar.GroupLabel>
              <!-- <Inbox class="h-10 w-10" />  -->
            </Sidebar.GroupLabel>
            <Sidebar.GroupContent>
              <Sidebar.Menu>
                {#each items as item (item.title)}
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton>
                      {#snippet child({ props })}
                        <a href={item.url} {...props}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      {/snippet}
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                {/each}
              </Sidebar.Menu>
            </Sidebar.GroupContent>
          </Sidebar.Group>
        </Sidebar.Content>
      </Sidebar.Root>

      <main
        class="flex-1 overflow-auto transition-all duration-200 ease-in-out"
      >
        {#if showMiniMap}
          <div class="absolute top-2 right-2 z-10 w-64">
            <MiniMap />
          </div>
        {/if}

        <!-- 切换 MiniMap 的按钮 -->
        <Button
          variant="outline"
          size="icon"
          class="absolute top-2 right-[17rem] z-10"
          onclick={toggleMiniMap}
          title={showMiniMap ? "隐藏历史树图" : "显示历史树图"}
        >
          <Cat class="h-4 w-4" />
        </Button>
        <!-- <Drawer.Root
        direction="right"
        >
          <Drawer.Trigger>
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger class={buttonVariants({ variant: "outline" })}>
                  <Cat class="h-4 w-4" />
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p>
                    {showMiniMap ? "隐藏历史树图" : "显示历史树图"}
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Drawer.Trigger>
          <Drawer.Content> -->
            <!-- <Drawer.Header>
              <Drawer.Title>Are you sure absolutely sure?</Drawer.Title>
              <Drawer.Description
                >This action cannot be undone.</Drawer.Description
              >
            </Drawer.Header> -->
            <!-- <Drawer.Footer>
              <Button>Submit</Button>
              <Drawer.Close>Cancel</Drawer.Close>
            </Drawer.Footer> -->
            <!-- <MiniMap />
          </Drawer.Content>
        </Drawer.Root> -->

        <!-- <div class="h-full p-4"> -->
        {@render children?.()}
        <!-- </div> -->
      </main>
    </div>
  </Sidebar.Provider>
</div>

<style>
</style>
