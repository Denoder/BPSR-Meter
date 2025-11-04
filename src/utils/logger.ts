const isDevelopment = process.env.NODE_ENV === "development";

export const devLog = (...args: any[]): void => {
    if (isDevelopment) {
        console.log(...args);
    }
};

export const devWarn = (...args: any[]): void => {
    if (isDevelopment) {
        console.warn(...args);
    }
};

export const devError = (...args: any[]): void => {
    if (isDevelopment) {
        console.error(...args);
    }
};

export const prodError = (...args: any[]): void => {
    console.error(...args);
};
