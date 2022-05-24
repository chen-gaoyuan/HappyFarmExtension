import { createHash } from 'crypto';
import { Logger } from '../log';
import { Logic } from './logic';
import { RuleLogic as VipLandLogic } from './logics/vip_land/Logic';

export class Robot {
    protected env: any;
    protected logger: Logger;
    // 同步信息时的本机时间
    protected syncTime: number;
    // 同步信息时的农场时间
    protected farmTime: string;

    protected market: string;
    protected platform: string;
    protected appid: string;
    protected version: string;
    protected userAgent: string;
    protected flashVersion: string;
    protected referer: string;
    protected cookie: string;

    protected logics = new Set<Logic>();
    protected operationCoolDownTime: { [op: string]: number } = {};
    protected operationQueue: { opKey: string; coolDownTime: number; callback: () => void }[] = [];

    protected callbackQueue: { time: number; callback: () => void }[] = [];

    constructor(readonly server: any, readonly uinY: string, readonly uIdx: string) {
        this.logger = new Logger(`${uinY}`);
    }

    public removeSelf(reason: string) {
        this.server.removeRobot(this, reason);
    }
    public getSyncTime() {
        return this.syncTime;
    }

    public getUserAgent() {
        return this.userAgent;
    }

    public getReferer() {
        return this.referer;
    }

    public getCookie() {
        return this.cookie;
    }

    public getFlashVersion() {
        return this.flashVersion;
    }

    public hasLogic(logic: Logic) {
        return this.logics.has(logic);
    }

    public onUpdate(dt: number) {
        for (let idx = this.callbackQueue.length - 1; idx >= 0; idx--) {
            const callback = this.callbackQueue[idx];
            callback.time -= dt;
            if (callback.time < 0) {
                this.callbackQueue.splice(idx, 1);
                try {
                    callback.callback();
                } catch (err) {
                    this.logger.error(err);
                }
            }
        }

        for (const opKey in this.operationCoolDownTime) {
            if (this.operationCoolDownTime[opKey] > 0) {
                this.operationCoolDownTime[opKey] -= dt;
            } else {
                delete this.operationCoolDownTime[opKey];
            }
        }

        if (this.operationQueue.length == 0) {
            return;
        }

        const operation = this.operationQueue[0];

        if (this.operationCoolDownTime[operation.opKey] > 0) {
            return;
        }
        this.operationQueue.shift();

        if (operation.coolDownTime > 0) {
            this.operationCoolDownTime[operation.opKey] = operation.coolDownTime;
        }
        try {
            operation.callback();
        } catch (err) {
            this.logger.error(err);
        }
    }

    public syncAuthData(authData: any) {
        this.syncTime = Date.now();
        this.farmTime = authData['farmTime'];
        this.market = authData['market'];
        this.platform = authData['platform'];
        this.appid = authData['appid'];
        this.version = authData['version'];

        this.userAgent = authData['user-agent'];
        this.flashVersion = authData['x-flash-version'];
        this.referer = authData['referer'];
        this.cookie = authData['cookie'];
    }

    public reloadConfig(env, config) {
        this.env = env;
        this.logics.clear();
        this.operationQueue.length = 0;
        this.callbackQueue.length = 0;

        if (config.VIP_LAND.enable) {
            this.logics.add(new VipLandLogic(this.logger, this, config.VIP_LAND));
        }

        for (const logic of this.logics) {
            try {
                logic.onInit();
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    public calculateFarmTime() {
        const deltaTime = Math.floor((Date.now() - this.syncTime) / 1000);
        const farmTimeNow = Number(this.farmTime) + deltaTime;
        const farmTime = farmTimeNow.toString();
        return farmTime;
    }

    protected calculateKey(farmTime: string, farmKey: string) {
        const md5 = createHash('md5');
        const pos = parseInt(farmTime.substr(farmTime.length - 1), 10);
        const key = md5.update(farmTime + farmKey.substr(pos)).digest('hex');
        return key;
    }

    public calculateFarmKey(farmTime: string) {
        return this.calculateKey(farmTime, this.env.FARM_KEY1);
    }

    public calculateFarmKey2(farmTime: string) {
        return this.calculateKey(farmTime, this.env.FARM_KEY1);
    }

    public calculatePastureKey(farmTime: string) {
        return this.calculateKey(farmTime, this.env.PASTURE_KEY);
    }

    public addOperation(opKey: string, coolDownTime: number, callback: () => void) {
        this.operationQueue.push({ opKey, coolDownTime, callback });
    }

    public addCallback(time: number, callback: () => void) {
        this.callbackQueue.push({ time, callback });
    }
}
