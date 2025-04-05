import type { LogMessage } from "$lib/types/utils/logger";

class Logger {
    logMessage=$state<LogMessage[]>([]);

    constructor() {
        // this.logMessage = $state([]);
    }

    info(message: string, detail?: string) {
        if (detail) {
            this.logMessage.push({
                level: 'info',
                message,
                timestamp: new Date(),
                detail,
            });
        }
        else {
            this.logMessage.push({
                level: 'info',
                message,
                timestamp: new Date(),
            });
        }
    }

    warn(message: string, detail?: string) {
        if (detail) {
            this.logMessage.push({
                level: 'warn',
                message,
                timestamp: new Date(),
                detail,
            });
        }
        else {
            this.logMessage.push({
                level: 'warn',
                message,
                timestamp: new Date(),
            });
        }
    }

    error(message: string, detail?: string) {
        if (detail) {
            this.logMessage.push({
                level: 'error',
                message,
                timestamp: new Date(),
                detail,
            });
        }
        else {
            this.logMessage.push({
                level: 'error',
                message,
                timestamp: new Date(),
            });
        }
        
    }
}

export const logger = new Logger();