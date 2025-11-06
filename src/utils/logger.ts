export class Logger {
    private isDevelopment: boolean;
    private enabledLevels: Set<string>;

    // ANSI color codes
    private colors = {
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        dim: '\x1b[2m',
        
        // Text colors
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        gray: '\x1b[90m',
    };

    constructor() {
        this.isDevelopment = process.env.NODE_ENV === "development";
        this.enabledLevels = new Set(['info', 'warn', 'error', 'debug']);
    }

    setLevel(levels: string | string[]): void {
        if (typeof levels === 'string') {
            if (levels === 'error') {
                this.enabledLevels = new Set(['error']);
            } else {
                this.enabledLevels = new Set(['info', 'warn', 'error', 'debug']);
            }
        } else {
            this.enabledLevels = new Set(levels);
        }
    }

    private formatTimestamp(): string {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    info(...args: any[]): void {
        if (!this.enabledLevels.has('info')) return;
        const timestamp = this.formatTimestamp();
        console.log(
            `${this.colors.gray}[${timestamp}]${this.colors.reset}`,
            `${this.colors.cyan}[INFO]${this.colors.reset}`,
            ...args
        );
    }

    debug(...args: any[]): void {
        if (!this.enabledLevels.has('debug') || !this.isDevelopment) return;
        const timestamp = this.formatTimestamp();
        console.log(
            `${this.colors.gray}[${timestamp}]${this.colors.reset}`,
            `${this.colors.magenta}[DEBUG]${this.colors.reset}`,
            ...args
        );
    }

    warn(...args: any[]): void {
        if (!this.enabledLevels.has('warn')) return;
        const timestamp = this.formatTimestamp();
        console.warn(
            `${this.colors.gray}[${timestamp}]${this.colors.reset}`,
            `${this.colors.yellow}[WARN]${this.colors.reset}`,
            ...args
        );
    }

    error(...args: any[]): void {
        if (!this.enabledLevels.has('error')) return;
        const timestamp = this.formatTimestamp();
        console.error(
            `${this.colors.gray}[${timestamp}]${this.colors.reset}`,
            `${this.colors.red}${this.colors.bright}[ERROR]${this.colors.reset}`,
            ...args
        );
    }
}

export const logger = new Logger();
