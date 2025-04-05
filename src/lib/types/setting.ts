interface Config {
    api: {
        deepseek: string;
    }
}

interface Setting {
    config_path: string;
}

export type { Config, Setting };