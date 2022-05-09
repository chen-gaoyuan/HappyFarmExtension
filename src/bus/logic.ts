import { request } from 'https';
import { Logger } from 'src/log';
import { Robot } from './robot';

export class Logic<T = any> {
    constructor(readonly logger: Logger, readonly robot: Robot, readonly config: T) {}

    onInit() {}

    protected reqest(req: {
        type: 'farm';
        url: string;
        data: { [key: string]: number | string };
        cd?: number;
        callback: (data: any, statusCode: number) => void;
    }) {
        const reqCoolDownTime = 0.5;
        this.robot.addOperation('request', reqCoolDownTime, () => {
            const opCoolDownTime = req.cd || 0;
            this.robot.addOperation(req.url, opCoolDownTime, () => {
                const reqObj = request(
                    req.url,
                    {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/x-www-form-urlencoded',
                            'user-agent': this.robot.getUserAgent(),
                            referer: this.robot.getReferer(),
                            cookie: this.robot.getCookie(),
                            'x-flash-version': this.robot.getFlashVersion(),
                        },
                    },
                    (res) => {
                        let data = '';
                        res.on('data', (chunk) => {
                            data += chunk;
                        });
                        res.on('end', () => {
                            if (!this.robot.hasLogic(this)) {
                                return;
                            }
                            data = data.trim();
                            if (res.statusCode != 200 || data == '') {
                                this.logger.error('recv %s <= %d %s', req.url, res.statusCode, data);

                                req.callback.call(this, {}, res.statusCode);
                            } else {
                                this.logger.debug('recv %s <= %d %s', req.url, res.statusCode, data);

                                const obj = JSON.parse(data);
                                if (obj.ecode == -10004) {
                                    this.robot.removeSelf('session已过期 需要重新登录');
                                    return;
                                }
                                if (obj.ecode < 0 && obj.direction) {
                                    this.logger.warn('%s ecode: %d', obj.direction, obj.ecode);
                                }
                                if (obj.ecode == -10000) {
                                    // 系统繁忙 三十秒后再处理
                                    this.delay(30, () => {
                                        req.callback.call(this, obj, res.statusCode);
                                    });
                                } else {
                                    req.callback.call(this, obj, res.statusCode);
                                }
                            }
                        });
                    },
                );

                const farmTime = this.robot.calculateFarmTime();
                const farmKey = this.robot.calculateFarmKey(farmTime);
                const farmKey2 = this.robot.calculateFarmKey2(farmTime);

                let bodyStr = '';
                bodyStr += `farmKey=${farmKey}&`;
                bodyStr += `farmKey2=${farmKey2}&`;
                bodyStr += `uinY=${this.robot.uinY}&`;
                bodyStr += `uIdx=${this.robot.uIdx}&`;
                for (const key in req.data) {
                    bodyStr += `${key}=${req.data[key]}&`;
                }
                bodyStr += `farmTime=${farmTime}`;
                reqObj.write(bodyStr);
                reqObj.end();

                this.logger.debug('send %s => %s', req.url, bodyStr);
            });
        });
    }

    protected delay(delay: number, callback: () => void) {
        this.robot.addCallback(delay, () => {
            callback.call(this);
        });
    }
}
