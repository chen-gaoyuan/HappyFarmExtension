import { createServer, Server as HttpServer } from 'http';
import { readFileSync, watch, FSWatcher, WatchEventType } from 'fs';
import { join } from 'path';
import { parse } from './../yaml';
import { Logger } from './../log';
import { Robot } from './robot';

const envFilePath = join(process.cwd(), 'env.yml');

export class Server {
    private logger = new Logger('明月扩展服务器');
    private httpServer: HttpServer;
    private robots = new Map<string, Robot>();
    private watchers: FSWatcher[] = [];
    private env: any;
    private configs: any[] = [];

    private leftReloadTime = 0;
    private lastUpdate: number = Date.now();

    constructor() {
        this.httpServer = createServer(this.onRequest.bind(this));
    }

    public start() {
        this.logger.log(
            '本插件代码开源免费, 感谢支持! 开源地址: %s',
            'https://github.com/chen-gaoyuan/HappyFarmExtension',
        );
        this.readConfigFile();
        try {
            this.httpServer.listen(parseInt(this.env.PORT || '8080'), this.env.HOST || 'localhost');
            this.logger.warn(`Server running at http://${this.env.HOST}:${this.env.PORT}/`);
        } catch (err) {
            this.logger.error(err);
            throw err;
        }

        watch(envFilePath, this.onFileChange.bind(this));
        setInterval(this.checkRobotTimeout.bind(this), 60 * 1000);
        setInterval(this.onUpdate.bind(this), 100);
    }

    private readConfigFile() {
        // 三十分钟后再读取配置文件
        this.leftReloadTime = 30 * 60;

        this.logger.log(`重新加载配置文件...`);

        const envData = readFileSync(envFilePath, 'utf-8');
        const newEnv = parse(envData);
        if (this.env && (newEnv.PORT != this.env.PORT || newEnv.HOST != this.env.HOST)) {
            this.httpServer.close((err) => {
                if (err) {
                    this.logger.error(err);
                    return;
                }
                this.httpServer.listen(parseInt(newEnv.PORT || '8080'), newEnv.HOST || 'localhost');
                this.logger.warn(`Server running at http://${newEnv.HOST}:${newEnv.PORT}/`);
            });
        }
        this.env = newEnv;

        for (const watcher of this.watchers) {
            watcher.close();
        }

        this.watchers.length = 0;
        this.configs.length = 0;

        for (const fileName of this.env.LOGIC_CONFIG) {
            const filePath = join(process.cwd(), fileName);

            const fileData = readFileSync(filePath, 'utf-8');
            this.configs.push(parse(fileData));
            this.watchers.push(watch(filePath, this.onFileChange.bind(this)));
        }
    }

    private onFileChange(event: WatchEventType, filename: string) {
        this.logger.log(filename + ' ' + event + '...');
        // 文件修改30秒后生效
        this.leftReloadTime = 30;
    }

    private checkRobotTimeout() {
        // 检查机器人是否超时
        for (const [uinY, robot] of this.robots) {
            if (Date.now() - robot.getSyncTime() > 1000 * 60 * 10) {
                this.robots.delete(uinY);
                this.logger.warn(`[${robot.uinY}] 同步授权数据超时, 已下线!`);
            }
        }
    }

    private onUpdate() {
        const now = Date.now();
        const dt = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        this.leftReloadTime -= dt;
        if (this.leftReloadTime <= 0) {
            this.readConfigFile();

            // 更新了配置 把逻辑也重启一下
            for (const [uinY, robot] of this.robots) {
                const config = this.getConfig(uinY);
                if (config) {
                    robot.reloadConfig(this.env, config);
                } else {
                    this.robots.delete(uinY);
                    this.logger.warn(`修改配置后, [${robot.uinY}] 无可用配置, 已下线!`);
                }
            }
        }

        for (const [_, robot] of this.robots) {
            robot.onUpdate(dt);
        }
    }

    private getConfig(uinY: string) {
        let config = null;
        for (const configItem of this.configs) {
            if (configItem.QQ == '*') {
                config = configItem;
            } else {
                const qqs = configItem.QQ.split(',');
                for (const qq of qqs) {
                    if (qq === uinY) {
                        config = configItem;
                        break;
                    }
                }
            }
        }
        return config;
    }

    private onRequest(request, response) {
        let data = [];
        request.on('data', (chunk) => {
            data.push(chunk);
        });
        request.on('end', () => {
            response.writeHead(200, { 'Content-Type': 'text/plain' });
            response.end('OK\n');

            const body = Buffer.concat(data).toString();
            const pairs = body.split('&');
            const params = {};
            pairs.forEach((pair) => {
                const [key, value] = pair.split('=');
                params[key] = value;
            });
            if (!params['uinY']) {
                return;
            }
            this.syncAuthData(params, request.headers);
        });
    }

    private syncAuthData(params, headers) {
        const config = this.getConfig(params['uinY']);
        if (!config) {
            return;
        }

        const oldRobot = this.robots.get(params['uinY']);
        if (oldRobot) {
            oldRobot.syncAuthData({
                ...params,
                ...headers,
            });
            this.logger.log(`[${params['uinY']}] 同步授权数据成功!`);
        } else {
            const newRobot = new Robot(params['uinY'], params['uIdx']);
            this.robots.set(params['uinY'], newRobot);
            newRobot.syncAuthData({
                ...params,
                ...headers,
            });
            this.logger.log(`[${params['uinY']}] 同步授权数据成功!`);

            newRobot.reloadConfig(this.env, config);
        }
    }
}
