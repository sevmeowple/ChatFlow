<script lang="ts">
  import { onMount } from "svelte";
  import { settingManger } from "$lib/setting";
  import { logger } from "$lib/utils/logger.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Separator } from "$lib/components/ui/separator";
  import type { Config } from "$lib/types/setting";
  import Database from "@tauri-apps/plugin-sql";

  let configPath: string = "";
  let config: Config | undefined;
  let isLoading: boolean = true;
  let isSaving: boolean = false;

  onMount(async () => {
    try {
      await settingManger.init();

      // 获取配置文件路径
      if (settingManger.setting) {
        configPath = (await settingManger.setting.get("config_path")) || "";
      }

      // 加载配置
      config = settingManger.config;
      isLoading = false;
    } catch (error) {
      logger.error("Failed to load settings:", error as string);
      isLoading = false;
    }
  });

  async function saveSettings() {
    if (!config) return;

    isSaving = true;
    try {
      await settingManger.saveConfig(config);
    } catch (error) {
      logger.error("Failed to save settings:", error as string);
    } finally {
      isSaving = false;
    }
  }

  async function updateConfigPath() {
    if (!settingManger.setting) {
      logger.error("Setting manager is not initialized.");
      return;
    }

    if (!configPath) {
      logger.error("Config path cannot be empty.");
      return;
    }

    isLoading = true;

    try {
      await settingManger.setting.set("config_path", configPath);
      await settingManger.setting.save();
      config = await settingManger.loadConfig();
    } catch (error) {
      logger.error("Failed to update config path:", error as string);
    }
  }
</script>

<div class="container mx-auto py-10">
  <div class="flex flex-col gap-8">
    <h2 class="text-3xl font-bold tracking-tight">设置</h2>

    {#if isLoading}
      <div class="flex items-center justify-center h-40">
        <div
          class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
        ></div>
      </div>
    {:else}
      <Card>
        <CardHeader>
          <CardTitle>配置文件</CardTitle>
          <CardDescription>设置配置文件的路径</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex flex-row gap-4 items-end">
            <div class="grid w-full items-center gap-1.5 flex-1">
              <Label for="config-path">配置文件路径</Label>
              <Input id="config-path" bind:value={configPath} />
            </div>
            <Button variant="outline" onclick={updateConfigPath}
              >更新路径</Button
            >
          </div>
        </CardContent>
      </Card>

      {#if config}
        <Card>
          <CardHeader>
            <CardTitle>API 设置</CardTitle>
            <CardDescription>设置用于API调用的密钥和端点</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid gap-4">
              <div class="grid grid-cols-1 gap-2">
                <Label for="deepseek-api">DeepSeek API 密钥</Label>
                <Input
                  id="deepseek-api"
                  type="password"
                  bind:value={config.api.deepseek}
                  placeholder="输入 DeepSeek API 密钥"
                />
              </div>

              <!-- 可以根据需要添加更多API配置 -->

              <Separator class="my-2" />

              <!-- 预留位置，可以添加更多设置类别 -->
            </div>
          </CardContent>
          <CardFooter class="flex justify-end">
            <Button onclick={saveSettings} disabled={isSaving}>
              {isSaving ? "保存中..." : "保存设置"}
            </Button>
          </CardFooter>
        </Card>
      {:else}
        <div
          class="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded shadow"
        >
          <p>未能加载配置文件。请确保配置路径正确，并点击"更新路径"。</p>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style lang="postcss">
  :global(body) {
    @apply bg-background text-foreground;
  }
</style>
