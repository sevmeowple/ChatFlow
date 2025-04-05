import type { Store } from '@tauri-apps/plugin-store';
import type { Config, Setting } from './types/setting';
import * as fs from "@tauri-apps/plugin-fs"
import { storeManager } from './utils/store';
import { logger } from './utils/logger.svelte';
import JSON5 from 'json5';

class Set {
    config?: Config;
    setting?: Store;

    async init() {
        this.setting = await storeManager.getStore('setting.json');
        const path = await this.setting.get<string>('config_path');
        if (path) {
            this.config = await this.readConfig(path);
        }
        else {
            logger.error('config_path not found in setting.json');
        }
    }

    async readConfig(path: string): Promise<Config> {
        const data = await fs.readTextFile(path);
        const config: Config = JSON5.parse(data);
        return config;
    }

    async loadConfig(): Promise<Config | undefined> {
        this.config = await this.readConfig(await this.setting?.get<string>('config_path') || '');
        return this.config;
    }

    async saveConfig(config: Config) {
        this.config = config;
        if (!this.setting) {
            logger.error('setting.json not found');
            return;
        }
        const path = await this.setting.get<string>('config_path');
        if (!path) {
            logger.error('config_path not found in setting.json');
            return;
        }
        let encoder = new TextEncoder();
        let data = encoder.encode(JSON5.stringify(config, null, 2));
        await fs.writeFile(
            path,
            data
        );
    }
}

const settingManger = new Set();
export { settingManger };
