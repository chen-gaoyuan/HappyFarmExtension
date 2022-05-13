import { Logic } from '../logic';

interface Config {
    // # 那几块地需要种植迷人藤 例如 只要第一块和第八块 [1, 8]
    lands: number[];
    // # 药水最多用几轮
    max_turn: number;
    // # 0: 不自动使用土地药水 1: 自动使用红土地药水
    use_land_tool: number;
    // # 0: 不自动使用加速药水 1: 自动使用加速药水
    use_speed_tool: number;
    // # 0: 不自动使用叶子药水 1: 自动使用掌状复叶药水
    use_leaf_tool: number;
    // # 0: 不自动展示最高魅力值的花藤 1: 自动展示最高魅力值的花藤
    auto_show: number;
    // # 0: 不自动出售花藤 1: 自动出售花藤
    auto_sale: number;
    // # 出售时最少保留几个迷人藤
    save_amount: number;
}

const TOOL_TIME = 1 * 60 * 60;

export class VipLandLogic extends Logic<Config> {
    // 能否上下花藤
    canShow = true;

    // 新土地信息
    newland: {
        bitmap: number;
        cropId: number;
        cropStatus: number;
        harvestTimes: number;
        lanid: number;
        level: number;
        output: number;
        plantTime: number;
    }[] = [];

    // 花园等级
    lv: number = 0;
    // v币数量
    vcoin: number = 0;
    // 种子列表
    seedlist: {
        id: number; // 种子id 现在只有一种种子
        num: number; // 种子数量
    }[] = [];
    // 工具列表
    toollist: {
        id: number; // 工具id
        num: number; // 工具数量
    }[] = [];
    // 花园列表
    garden: {
        id: number; //  id 对应仓库列表里的no
        index: number; // 土地索引
    }[] = [];
    // 仓库列表
    replist: {
        id: number; // 种子id 现在只有一种种子
        ml: number; // 魅力值
        no: number; //  序号 对应花园列表里的id
        price: number; // 价格
        show: 0 | 1; // 是否展示在花园里 0不展示 1展示
        harvest: number; // 收获时间
    }[] = [];
    // 土地列表
    land: {
        index: number; // 第几块地
        id: number; // 种子id 现在只有一种种子
        ml: number; // 魅力值
        plant_t: number; // 播种时间 使用加速药水会使时间提前1小时
        harvest_t: number; // 收获时间

        rs: number; // 是否使用了土地药水
        rs_t: number; // 土地药水到期时间?

        cd: number; // 道具使用冷却时间
        sum_tool: number; // 总共使用了多少次道具了

        color: number; // 植物颜色
        element: []; // 植物元素
    }[] = [];

    // 启动流程
    onInit() {
        this.getVipLandInfo();
    }
    // 获取vip土地信息
    getVipLandInfo() {
        this.logger.log('获取vip土地信息...');
        this.reqest({
            type: 'farm',
            url: 'https://nc.qzone.qq.com/cgi-bin/query?act=2033006',
            data: {},
            cd: 10,
            callback: this.onSyncVipLandInfo,
        });
    }

    // 同步vip土地信息
    onSyncVipLandInfo(data: any) {
        if (data.ecode !== 0) {
            return this.delay(15, this.getVipLandInfo);
        }

        this.newland = data.newland;

        this.logger.log('当前vip土地数量: %d', this.newland.length);

        for (const landId of this.config.lands) {
            const newland = this.newland.find((newland) => newland.lanid === landId);
            if (newland && newland.cropId) {
                this.logger.error('[VIP土地 %d]已种植其他作物! 无法继续种植迷人藤!', landId);
            }
        }

        this.delay(2, this.getVipLandInfo2);
    }

    // 获取花园信息
    getVipLandInfo2() {
        this.logger.log('获取花园信息...');
        this.reqest({
            type: 'farm',
            url: 'https://nc.qzone.qq.com/cgi-bin/cgi_vip_land',
            data: { act: 'index' },
            cd: 3,
            callback: this.onSyncVipLandInfo2,
        });
    }

    // 同步vip土地信息
    onSyncVipLandInfo2(data: any) {
        if (data.ecode !== 0) {
            return this.delay(15, this.getVipLandInfo);
        }
        this.lv = data.lv;
        this.vcoin = data.vcoin;
        this.seedlist = data.seedlist;
        this.toollist = data.toollist;
        this.garden = data.garden;
        this.replist = data.replist;
        this.land = data.land;

        this.analyzeExecute();
    }

    // 分析当前状态 并处理
    analyzeExecute() {
        // 自动展示魅力值最高的植物
        if (this.autoShow()) {
            return;
        }
        const nowTime = Math.floor(Date.now() / 1000);
        // 按土地顺序处理
        for (const newland of this.newland) {
            // 这块不让种
            if (!this.config.lands.includes(newland.lanid)) {
                continue;
            }
            // 这块有其他作物
            if (newland.cropId) {
                continue;
            }
            const land = this.land.find((land) => land.index === newland.lanid);

            // 熟了就收获
            if (land && land.harvest_t && land.harvest_t < nowTime) {
                this.harvestSeed(newland.lanid);
                return;
            }

            // 这块地都没有 说明从来没种过 先种一下
            if (!land || !land.id) {
                if (this.plantSeed(newland.lanid, 1, 500, '迷人藤')) {
                    return;
                }
                continue;
            }
            // 还没有用土地药水就用土地药水
            if (this.config.use_land_tool && !land.rs) {
                if (this.useTool(newland.lanid, 1, 1, 200, '土地药水')) {
                    return;
                }
            }
            // 还不能使用道具就用加速药水
            if (this.config.use_speed_tool && nowTime < land.plant_t + TOOL_TIME) {
                if (this.useTool(newland.lanid, 1, 15, 100, '加速药水')) {
                    return;
                }
            }
            //  没cd就用药水
            if (this.config.use_leaf_tool && nowTime > land.plant_t + TOOL_TIME && land.cd < nowTime) {
                // 最大轮数控制
                if (this.config.max_turn && land.sum_tool >= this.config.max_turn * 10) {
                    continue;
                }
                const needAmount = 10 - (land.sum_tool % 10);
                if (this.useTool(newland.lanid, needAmount, 24, 200, '叶子药水', land.sum_tool + 1)) {
                    return;
                }
            }
        }

        // 没啥要做的 等15秒再看看
        return this.delay(15, this.analyzeExecute);
    }

    // 自动展示
    autoShow() {
        if (!this.config.auto_show) {
            return false;
        }
        if (!this.canShow) {
            return false;
        }
        let minId = 0;
        let minIndex = 0;
        for (const garden of this.garden) {
            if (!minIndex || !garden.id) {
                minId = garden.id;
                minIndex = garden.index;
            } else if (minId) {
                const minRep = this.replist.find((rep) => rep.no === minId);
                const curRep = this.replist.find((rep) => rep.no === garden.id);
                if (curRep.ml < minRep.ml) {
                    minId = garden.id;
                    minIndex = garden.index;
                }
            }
        }
        if (!minIndex) {
            return false;
        }
        let minMl = 0;
        if (minId) {
            const minRep = this.replist.find((rep) => rep.no === minId);
            minMl = minRep.ml;
        }

        let maxId = 0;
        let maxMl = 0;
        for (const rep of this.replist) {
            if (rep.show) {
                continue;
            }
            if (rep.ml <= minMl) {
                continue;
            }
            if (!maxId || rep.ml > maxMl) {
                maxId = rep.no;
                maxMl = rep.ml;
                continue;
            }
        }
        if (!maxId) {
            return false;
        }
        // 这个位置有花藤
        if (minId) {
            // 先下掉
            this.logger.log('将[花园 %d]上的[花藤 %d]下掉', minIndex, minMl);
            this.reqest({
                type: 'farm',
                url: 'https://nc.qzone.qq.com/cgi-bin/cgi_vip_land',
                data: { act: 'show', id: minId, gid: minIndex },
                cd: 1,
                callback: (data) => {
                    if (data.ret == -12) {
                        this.canShow = false;
                        this.logger.warn(data.direction);
                        return this.delay(1, this.analyzeExecute);
                    }
                    if (data.ecode !== 0) {
                        return this.delay(15, this.getVipLandInfo);
                    }
                    for (const garden of this.garden) {
                        if (garden.index === minIndex) {
                            garden.id = 0;
                        }
                        for (const replist of this.replist) {
                            if (replist.no === minId) {
                                replist.show = 0;
                                break;
                            }
                        }
                    }
                    this.analyzeExecute();
                },
            });
        } else {
            // 空位置直接上
            this.logger.log('往[花园 %d]上放置[花藤 %d]', minIndex, maxMl);
            this.reqest({
                type: 'farm',
                url: 'https://nc.qzone.qq.com/cgi-bin/cgi_vip_land',
                data: { act: 'show', id: maxId, gid: minIndex },
                cd: 1,
                callback: (data) => {
                    if (data.ecode !== 0) {
                        return this.delay(15, this.getVipLandInfo);
                    }
                    for (const garden of this.garden) {
                        if (garden.index === minIndex) {
                            garden.id = maxId;
                        }
                        for (const replist of this.replist) {
                            if (replist.no === maxId) {
                                replist.show = 1;
                            }
                        }
                    }

                    this.analyzeExecute();
                },
            });
        }
        return true;
    }

    // 卖掉魅力值最小的那个花藤
    saleOne() {
        if (!this.config.auto_sale) {
            return false;
        }
        // 判断是否够卖
        let totalAmount = 0;
        for (const rep of this.replist) {
            if (rep.show) {
                continue;
            }
            totalAmount += 1;
        }
        if (totalAmount <= this.config.save_amount) {
            return false;
        }
        // 卖掉魅力值最小的那个花藤
        let minId = 0;
        let minMl = 0;
        let vcoin = 0;
        for (const rep of this.replist) {
            if (rep.show) {
                continue;
            }
            if (!minId || rep.ml < minMl) {
                minId = rep.no;
                minMl = rep.ml;
                vcoin = rep.price;
            }
        }
        if (!minId) {
            return false;
        }
        this.logger.log('V币不足, 卖掉[花藤 %d]换取[%d]个V币', minMl, vcoin);

        this.reqest({
            type: 'farm',
            url: 'https://nc.qzone.qq.com/cgi-bin/cgi_vip_land',
            data: { act: 'sale', id: minId },
            cd: 1,
            callback: (data) => {
                if (data.ecode !== 0) {
                    return this.delay(15, this.getVipLandInfo);
                }
                const index = this.replist.findIndex((rep) => rep.no === minId);
                this.replist.splice(index, 1);

                this.vcoin += vcoin;

                this.analyzeExecute();
            },
        });

        return true;
    }

    // 对这块地进行收获
    harvestSeed(landIndex: number) {
        this.logger.log('对[VIP土地 %d]进行收获', landIndex);
        this.reqest({
            type: 'farm',
            url: 'https://nc.qzone.qq.com/cgi-bin/cgi_vip_land',
            data: { act: 'harvest', index: landIndex },
            cd: 1,
            callback: (data) => {
                if (data.ecode !== 0) {
                    return this.delay(15, this.getVipLandInfo);
                }
                this.logger.log('在[VIP土地 %d]收获成功! 经验值 +%d', landIndex, data.exp);
                this.delay(1, this.getVipLandInfo2);
            },
        });
        return true;
    }

    // 对这块地进行种植
    plantSeed(landIndx: number, sid: number, sprice: number, sname: string) {
        let seedAmount = 0;
        for (const seed of this.seedlist) {
            if (seed.id == sid) {
                seedAmount = seed.num;
                break;
            }
        }
        if (seedAmount == 0) {
            // 种子不够 需要购买

            if (this.vcoin < sprice) {
                // V币不够 卖个花藤先
                return this.saleOne();
            }
            this.logger.log('[%s种子]不足, 使用[%d]个V币为[VIP土地 %d]购买[1]个', sname, sprice, landIndx);
            this.reqest({
                type: 'farm',
                url: 'https://nc.qzone.qq.com/cgi-bin/cgi_vip_land',
                data: { act: 'buy', cid: sid, num: 1 },
                cd: 1,
                callback: (data) => {
                    if (data.ecode !== 0) {
                        return this.delay(15, this.getVipLandInfo);
                    }
                    this.vcoin -= sprice;

                    let hasFind = false;
                    for (const seed of this.seedlist) {
                        if (seed.id == sid) {
                            seed.num++;
                            hasFind = true;
                            break;
                        }
                    }
                    if (!hasFind) {
                        this.seedlist.push({ id: sid, num: 1 });
                    }

                    this.analyzeExecute();
                },
            });
            return true;
        }

        this.logger.log('在[VIP土地 %d]种植一株[%s]', landIndx, sname);
        this.reqest({
            type: 'farm',
            url: 'https://nc.qzone.qq.com/cgi-bin/cgi_vip_land',
            data: { act: 'plant', index: landIndx, cid: sid },
            cd: 1,
            callback: (data) => {
                if (data.ecode !== 0) {
                    return this.delay(15, this.getVipLandInfo);
                }
                for (const seed of this.seedlist) {
                    if (seed.id == sid) {
                        seed.num--;
                        break;
                    }
                }
                this.land = data.land;

                this.analyzeExecute();
            },
        });
        return true;
    }

    useTool(landIndx: number, amount: number, tid: number, tprice: number, tname: string, curCount: number = 0) {
        let toolAmount = 0;
        for (const tool of this.toollist) {
            if (tool.id == tid) {
                toolAmount = tool.num;
                break;
            }
        }

        if (toolAmount < amount) {
            // 药水不够 需要购买
            let buyAmount = amount - toolAmount;
            if (this.vcoin < tprice * buyAmount) {
                // V币不够 卖个花藤先
                if (this.saleOne()) {
                    return true;
                }
                // 没有花藤了 那能买几个买几个
                buyAmount = Math.floor(this.vcoin / tprice);
            }
            if (buyAmount > 0) {
                this.logger.log(
                    '[%s]不足, 使用[%d]个V币为[VIP土地 %d]购买[%d]个',
                    tname,
                    tprice * buyAmount,
                    landIndx,
                    buyAmount,
                );
                this.reqest({
                    type: 'farm',
                    url: 'https://nc.qzone.qq.com/cgi-bin/cgi_vip_land',
                    data: { act: 'buytool', tid: tid, num: buyAmount },
                    cd: 1,
                    callback: (data) => {
                        if (data.ecode !== 0) {
                            return this.delay(15, this.getVipLandInfo);
                        }
                        this.vcoin -= buyAmount * tprice;
                        let hasFind = false;
                        for (const tool of this.toollist) {
                            if (tool.id == tid) {
                                tool.num += buyAmount;
                                hasFind = true;
                                break;
                            }
                        }

                        if (!hasFind) {
                            this.toollist.push({ id: tid, num: buyAmount });
                        }

                        this.analyzeExecute();
                    },
                });
                return true;
            } else {
                // 一个都买不了
                if (toolAmount == 0) {
                    // 没有药水了 又买不了 只能结束了
                    return false;
                } else {
                    // 虽然买不了 但是还有多余的药水 先用着
                }
            }
        }

        if (!curCount) {
            this.logger.log('在[VIP土地 %d]使用一个[%s]', landIndx, tname);
        } else {
            this.logger.log('在[VIP土地 %d]第[%d]次使用一个[%s]', landIndx, curCount, tname);
        }

        this.reqest({
            type: 'farm',
            url: 'https://nc.qzone.qq.com/cgi-bin/cgi_vip_land',
            data: { act: 'rs', index: landIndx, tid: tid },
            cd: 1,
            callback: (data) => {
                if (data.ecode !== 0) {
                    return this.delay(15, this.getVipLandInfo);
                }

                if (data.s) {
                    this.logger.log('哇塞, 运气好到爆炸! 额外获得: ' + data.s);
                }

                for (const tool of this.toollist) {
                    if (tool.id == tid) {
                        tool.num--;
                        break;
                    }
                }
                this.land = data.land;

                this.analyzeExecute();
            },
        });
        return true;
    }
}
