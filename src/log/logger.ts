import { resolve } from 'path';
import { appendFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { format } from 'util';

const styles: { [key: string]: [number, number] } = {
    // styles
    bold: [1, 22],
    italic: [3, 23],
    underline: [4, 24],
    inverse: [7, 27],
    // grayscale
    white: [37, 39],
    grey: [90, 39],
    black: [90, 39],
    // colors
    blue: [34, 39],
    cyan: [36, 39],
    green: [32, 39],
    magenta: [35, 39],
    red: [91, 39],
    yellow: [33, 39],
};

function colorizeStart(style?: string) {
    return style ? `\x1B[${styles[style][0]}m` : '';
}

function colorizeEnd(style?: string) {
    return style ? `\x1B[${styles[style][1]}m` : '';
}
function colorize(str: string, style: string) {
    return colorizeStart(style) + str + colorizeEnd(style);
}

enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 10,
}

export class Logger {
    protected static logDirectoryPath = '';
    protected static fileNameFormat = '';

    constructor(readonly loggerName: string, readonly level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' = 'DEBUG') {
        if (!Logger.fileNameFormat) {
            Logger.logDirectoryPath = resolve(process.cwd(), 'logs');
            if (!existsSync(Logger.logDirectoryPath)) {
                mkdirSync(Logger.logDirectoryPath);
            }
            Logger.updateFileNameFormat();
            setInterval(Logger.updateFileNameFormat, 1000);
        }
    }

    protected static getDateFileNameFormat(date: Date) {
        const newDate = new Date(date);
        newDate.setHours(newDate.getHours() + 8);
        const iosString = newDate.toISOString();
        const fileNameFormat = iosString.substring(0, iosString.indexOf('T')) + '.log';
        return resolve(Logger.logDirectoryPath, fileNameFormat);
    }

    protected static updateFileNameFormat() {
        const curDate = new Date();
        const fileNameFormat = Logger.getDateFileNameFormat(curDate);
        if (fileNameFormat != Logger.fileNameFormat) {
            Logger.fileNameFormat = fileNameFormat;

            // 保留14天日志
            const saveFilePaths: { [path: string]: true } = {};
            for (let day = 0; day < 14; day++) {
                const date = new Date(curDate.getTime() - day * 24 * 60 * 60 * 1000);
                const saveFilePath = Logger.getDateFileNameFormat(date);
                saveFilePaths[saveFilePath] = true;
            }
            const fileList = readdirSync(Logger.logDirectoryPath, {
                withFileTypes: true,
            });

            for (const file of fileList) {
                const filePath = resolve(Logger.logDirectoryPath, file.name);
                if (!saveFilePaths[filePath]) {
                    unlinkSync(filePath);
                }
            }
        }
    }

    protected format(level: string, style: string, message: string, ...optionalParams: any[]) {
        const now = new Date();
        // 北京时间比iso时间快8个小时
        now.setHours(now.getHours() + 8);
        // 当前已经是北京时间了 可以移除Z了
        const time = now.toISOString().replace('Z', '');

        const head = format('[%s] [%s] %s - ', time, level, this.loggerName);

        const msg = format(message, ...optionalParams);

        const formatStr = head + msg;
        // 写日志
        appendFileSync(Logger.fileNameFormat, formatStr + '\n');

        const formatColorStr = colorize(head, style) + msg;
        return formatColorStr;
    }

    public debug(message: string, ...optionalParams: any[]) {
        if (LogLevel[this.level] <= LogLevel.DEBUG) {
            this.format('DEBUG', 'grey', message, ...optionalParams);
        }
    }

    public log(message: string, ...optionalParams: any[]) {
        if (LogLevel[this.level] <= LogLevel.INFO) {
            console.log(this.format('INFO', 'green', message, ...optionalParams));
        }
    }

    public warn(message: string, ...optionalParams: any[]) {
        if (LogLevel[this.level] <= LogLevel.WARN) {
            console.warn(this.format('WARN', 'yellow', message, ...optionalParams));
        }
    }

    public error(message: string | unknown, ...optionalParams: any[]) {
        if (LogLevel[this.level] <= LogLevel.ERROR) {
            if (typeof message == 'string') {
                console.error(this.format('ERROR', 'red', message, ...optionalParams));
            } else if (message && (<any>message).message && (<any>message).stack) {
                console.error(this.format('ERROR', 'red', (<any>message).message));
                console.error(this.format('ERROR', 'red', 'stack: ' + (<any>message).stack));
            } else {
                console.error(this.format('ERROR', 'red', String(message), ...optionalParams));
            }
        }
    }
}
