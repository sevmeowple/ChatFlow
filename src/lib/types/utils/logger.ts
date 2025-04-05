interface LogMessage {
    level: 'info' | 'warn' | 'error';
    message: string;
    detail?: string;
    timestamp: Date;
}

export type { LogMessage };