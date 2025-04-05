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
  import { settingManger } from "$lib/setting";
  import { adapter } from "$lib/plugins";
  import { marked } from "marked";
  import markedKatex from "marked-katex-extension";
  import { chat } from "$lib/chat.svelte";
  // const { toggle } = useSidebar();
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
        <!-- <div class="h-full p-4"> -->
        {@render children?.()}
        <!-- </div> -->
      </main>
    </div>
  </Sidebar.Provider>
</div>

<style>
  /* 适应侧边栏状态的主内容区域样式 */
  /* :global([data-collapsed="true"] + main) {
    margin-left: 4rem;
  }

  :global([data-collapsed="false"] + main) {
    margin-left: 16rem;
  } */
</style>
