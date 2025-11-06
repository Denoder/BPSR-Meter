import { promises as fsPromises } from "fs";
import path from "path";
import { readFileSync } from "fs";
import type { Logger, GlobalSettings, SkillConfig } from "../types/index";
import type { Server as SocketIOServer } from "socket.io";

const TRANSLATIONS_DIR = path.join(__dirname, "translations");
let skillConfig: SkillConfig = JSON.parse(readFileSync(TRANSLATIONS_DIR + "/en.json", "utf-8")).skills;

export function reloadSkillTranslations(language: string): void {
    skillConfig = JSON.parse(readFileSync(path.join(TRANSLATIONS_DIR, `${language}.json`), "utf-8")).skills;
}

export function getSkillConfig(): SkillConfig {
    return skillConfig;
}

export class Lock {
    private queue: Array<() => void> = [];
    private locked: boolean = false;

    async acquire(): Promise<void> {
        if (this.locked) {
            return new Promise((resolve) => this.queue.push(resolve));
        }
        this.locked = true;
    }

    release(): void {
        if (this.queue.length > 0) {
            const nextResolve = this.queue.shift();
            if (nextResolve) nextResolve();
        } else {
            this.locked = false;
        }
    }
}

export function getSubProfessionBySkillId(skillId: number): string {
    switch (skillId) {
        case 1241:
            return "射线";
        case 2307:
        case 2361:
        case 55302:
            return "协奏";
        case 20301:
            return "愈合";
        case 1518:
        case 1541:
        case 21402:
            return "惩戒";
        case 2306:
            return "狂音";
        case 120901:
        case 120902:
            return "冰矛";
        case 1714:
        case 1734:
            return "居合";
        case 44701:
        case 179906:
            return "月刃";
        case 220112:
        case 2203622:
            return "鹰弓";
        case 2292:
        case 1700820:
        case 1700825:
        case 1700827:
            return "狼弓";
        case 1419:
            return "空枪";
        case 1405:
        case 1418:
            return "重装";
        case 2405:
            return "防盾";
        case 2406:
            return "光盾";
        case 199902:
            return "岩盾";
        case 1930:
        case 1931:
        case 1934:
        case 1935:
            return "格挡";
        default:
            return "";
    }
}

interface RealtimeEntry {
    time: number;
    value: number;
}

interface Stats {
    normal: number;
    critical: number;
    lucky: number;
    crit_lucky: number;
    hpLessen: number;
    total: number;
}

interface Count {
    normal: number;
    critical: number;
    lucky: number;
    crit_lucky: number;
    total: number;
}

interface RealtimeStats {
    value: number;
    max: number;
}

export class StatisticData {
    user: UserData;
    type: string;
    element: string;
    stats: Stats;
    count: Count;
    realtimeWindow: RealtimeEntry[];
    timeRange: [number | null, number | null];
    realtimeStats: RealtimeStats;

    constructor(user: UserData, type: string = "", element: string = "") {
        this.user = user;
        this.type = type;
        this.element = element;
        this.stats = {
            normal: 0,
            critical: 0,
            lucky: 0,
            crit_lucky: 0,
            hpLessen: 0,
            total: 0,
        };
        this.count = {
            normal: 0,
            critical: 0,
            lucky: 0,
            crit_lucky: 0,
            total: 0,
        };
        this.realtimeWindow = [];
        this.timeRange = [null, null];
        this.realtimeStats = {
            value: 0,
            max: 0,
        };
    }

    addRecord(
        value: number,
        isCrit: boolean,
        isLucky: boolean,
        hpLessenValue: number = 0,
    ): void {
        const now = Date.now();

        if (isCrit) {
            if (isLucky) {
                this.stats.crit_lucky += value;
            } else {
                this.stats.critical += value;
            }
        } else if (isLucky) {
            this.stats.lucky += value;
        } else {
            this.stats.normal += value;
        }
        this.stats.total += value;
        this.stats.hpLessen += hpLessenValue;

        if (isCrit) {
            this.count.critical++;
        }
        if (isLucky) {
            this.count.lucky++;
        }
        if (!isCrit && !isLucky) {
            this.count.normal++;
        }
        if (isCrit && isLucky) {
            this.count.crit_lucky++;
        }
        this.count.total++;

        this.realtimeWindow.push({
            time: now,
            value,
        });

        if (this.timeRange[0]) {
            this.timeRange[1] = now;
        } else {
            this.timeRange[0] = now;
        }
    }

    updateRealtimeStats(): void {
        const now = Date.now();

        while (
            this.realtimeWindow.length > 0 &&
            now - this.realtimeWindow[0].time > 1000
        ) {
            this.realtimeWindow.shift();
        }

        this.realtimeStats.value = 0;
        for (const entry of this.realtimeWindow) {
            this.realtimeStats.value += entry.value;
        }
        if (this.realtimeStats.value > this.realtimeStats.max) {
            this.realtimeStats.max = this.realtimeStats.value;
        }
    }

    getTotalPerSecond(): number {
        if (!this.timeRange[0] || !this.timeRange[1]) {
            return 0;
        }
        const totalPerSecond =
            (this.stats.total / (this.timeRange[1] - this.timeRange[0])) *
            1000 || 0;
        if (!Number.isFinite(totalPerSecond)) return 0;
        return totalPerSecond;
    }

    reset(): void {
        this.stats = {
            normal: 0,
            critical: 0,
            lucky: 0,
            crit_lucky: 0,
            hpLessen: 0,
            total: 0,
        };
        this.count = {
            normal: 0,
            critical: 0,
            lucky: 0,
            crit_lucky: 0,
            total: 0,
        };
        this.realtimeWindow = [];
        this.timeRange = [null, null];
        this.realtimeStats = {
            value: 0,
            max: 0,
        };
    }
}

interface UserSummary {
    realtime_dps: number;
    realtime_dps_max: number;
    total_dps: number;
    total_damage: Stats;
    total_count: Count;
    realtime_hps: number;
    realtime_hps_max: number;
    total_hps: number;
    total_healing: Stats;
    taken_damage: number;
    profession: string;
    name: string;
    fightPoint: number;
    hp?: number;
    max_hp?: number;
    dead_count: number;
}

interface SkillSummary {
    [skillId: string]: {
        displayName: string | number;
        type: string;
        elementype: string;
        totalDamage: number;
        totalCount: number;
        critCount: number;
        luckyCount: number;
        critRate: number;
        luckyRate: number;
        damageBreakdown: Stats;
        countBreakdown: Count;
    };
}

export class UserData {
    uid: number;
    name: string;
    damageStats: StatisticData;
    healingStats: StatisticData;
    takenDamage: number;
    deadCount: number;
    profession: string;
    skillUsage: Map<number, StatisticData>;
    fightPoint: number;
    subProfession: string;
    attr: Record<string, any>;
    lineId: number;

    constructor(uid: number) {
        this.uid = uid;
        this.name = "";
        this.damageStats = new StatisticData(this, "伤害");
        this.healingStats = new StatisticData(this, "治疗");
        this.takenDamage = 0;
        this.deadCount = 0;
        this.profession = "未知";
        this.skillUsage = new Map();
        this.fightPoint = 0;
        this.subProfession = "";
        this.attr = {};
        this.lineId = 0;
    }

    addDamage(
        skillId: number,
        element: string,
        damage: number,
        isCrit: boolean,
        isLucky: boolean,
        isCauseLucky: boolean,
        hpLessenValue: number = 0,
    ): void {
        this.damageStats.addRecord(damage, isCrit, isLucky, hpLessenValue);
        if (!this.skillUsage.has(skillId)) {
            this.skillUsage.set(
                skillId,
                new StatisticData(this, "伤害", element),
            );
        }
        this.skillUsage
            .get(skillId)!
            .addRecord(damage, isCrit, isCauseLucky, hpLessenValue);
        this.skillUsage.get(skillId)!.realtimeWindow.length = 0;

        const subProfession = getSubProfessionBySkillId(skillId);
        if (subProfession) {
            this.setSubProfession(subProfession);
        }
    }

    addHealing(
        skillId: number,
        element: string,
        healing: number,
        isCrit: boolean,
        isLucky: boolean,
        isCauseLucky: boolean,
    ): void {
        this.healingStats.addRecord(healing, isCrit, isLucky);
        skillId = skillId + 1000000000;
        if (!this.skillUsage.has(skillId)) {
            this.skillUsage.set(
                skillId,
                new StatisticData(this, "治疗", element),
            );
        }
        this.skillUsage.get(skillId)!.addRecord(healing, isCrit, isCauseLucky);
        this.skillUsage.get(skillId)!.realtimeWindow.length = 0;

        const subProfession = getSubProfessionBySkillId(skillId - 1000000000);
        if (subProfession) {
            this.setSubProfession(subProfession);
        }
    }

    addTakenDamage(damage: number, isDead: boolean): void {
        this.takenDamage += damage;
        if (isDead) this.deadCount++;
    }

    updateRealtimeDps(): void {
        this.damageStats.updateRealtimeStats();
        this.healingStats.updateRealtimeStats();
    }

    getTotalDps(): number {
        return this.damageStats.getTotalPerSecond();
    }

    getTotalHps(): number {
        return this.healingStats.getTotalPerSecond();
    }

    getTotalCount(): Count {
        return {
            normal:
                this.damageStats.count.normal + this.healingStats.count.normal,
            critical:
                this.damageStats.count.critical +
                this.healingStats.count.critical,
            lucky: this.damageStats.count.lucky + this.healingStats.count.lucky,
            crit_lucky:
                this.damageStats.count.crit_lucky +
                this.healingStats.count.crit_lucky,
            total: this.damageStats.count.total + this.healingStats.count.total,
        };
    }

    getSummary(): UserSummary {
        return {
            realtime_dps: this.damageStats.realtimeStats.value,
            realtime_dps_max: this.damageStats.realtimeStats.max,
            total_dps: this.getTotalDps(),
            total_damage: { ...this.damageStats.stats },
            total_count: this.getTotalCount(),
            realtime_hps: this.healingStats.realtimeStats.value,
            realtime_hps_max: this.healingStats.realtimeStats.max,
            total_hps: this.getTotalHps(),
            total_healing: { ...this.healingStats.stats },
            taken_damage: this.takenDamage,
            profession:
                this.profession +
                (this.subProfession ? `-${this.subProfession}` : ""),
            name: this.name,
            fightPoint: this.fightPoint,
            hp: this.attr.hp,
            max_hp: this.attr.max_hp,
            dead_count: this.deadCount,
        };
    }

    getSkillSummary(): SkillSummary {
        const skills: SkillSummary = {};
        const currentSkillConfig = getSkillConfig();
        for (const [skillId, stat] of this.skillUsage) {
            const critCount = stat.count.critical;
            const luckyCount = stat.count.lucky;
            const critRate = stat.count.total > 0 ? critCount / stat.count.total : 0;
            const luckyRate = stat.count.total > 0 ? luckyCount / stat.count.total : 0;
            const skillConfigEntry = currentSkillConfig[skillId % 1000000000];
            const name = typeof skillConfigEntry === "string" ? skillConfigEntry : (skillConfigEntry?.name ?? skillId % 1000000000);
            const elementype = stat.element;

            skills[skillId % 1000000000] = {
                displayName: name,
                type: stat.type,
                elementype: elementype,
                totalDamage: stat.stats.total,
                totalCount: stat.count.total,
                critCount: stat.count.critical,
                luckyCount: stat.count.lucky,
                critRate: critRate,
                luckyRate: luckyRate,
                damageBreakdown: { ...stat.stats },
                countBreakdown: { ...stat.count },
            };
        }
        return skills;
    }

    setProfession(profession: string): void {
        if (profession !== this.profession) this.setSubProfession("");
        this.profession = profession;
    }

    setSubProfession(subProfession: string): void {
        this.subProfession = subProfession;
    }

    setName(name: string): void {
        this.name = name;
    }

    setFightPoint(fightPoint: number): void {
        this.fightPoint = fightPoint;
    }

    setAttrKV(key: string, value: any): void {
        this.attr[key] = value;
    }

    setLineId(lineId: number): void {
        this.lineId = lineId;
    }

    reset(): void {
        this.damageStats.reset();
        this.healingStats.reset();
        this.takenDamage = 0;
        this.skillUsage.clear();
        this.fightPoint = 0;
    }
}

interface CachedUserData {
    name?: string;
    fightPoint?: number;
    maxHp?: number;
}

interface EnemyCache {
    name: Map<string, string>;
    hp: Map<string, number>;
    maxHp: Map<string, number>;
    monsterId: Map<string, number>;
    lastSeen: Map<string, number>;
    position: Map<string | number, { x: number; y: number; z: number; }>;
    isDead: Map<string, boolean>;
}

interface PlayerPosition {
    x: number;
    y: number;
    z: number;
}

interface SceneInfo {
    MapId: number | null;
    LineId: number | null;
}

export class UserDataManager {
    logger: Logger;
    globalSettings: GlobalSettings;
    io?: SocketIOServer;
    users: Map<number, UserData>;
    userCache: Map<string, CachedUserData>;
    playerMap: Map<string, string>;
    hpCache: Map<number, number>;
    startTime: number;
    logLock: Lock;
    logDirExist: Set<string>;
    enemyCache: EnemyCache;
    localPlayerUid: number | null;
    localPlayerPosition: PlayerPosition | null;
    lastLogTime?: number;
    sceneData: Map<string, SceneInfo>;

    constructor(logger: Logger, globalSettings: GlobalSettings, io?: SocketIOServer) {
        this.logger = logger;
        this.globalSettings = globalSettings;
        this.io = io;
        this.users = new Map();
        this.userCache = new Map();
        this.playerMap = new Map();
        this.hpCache = new Map();
        this.startTime = Date.now();
        this.logLock = new Lock();
        this.logDirExist = new Set();
        this.enemyCache = {
            name: new Map(),
            hp: new Map(),
            maxHp: new Map(),
            monsterId: new Map(),
            lastSeen: new Map(),
            position: new Map(),
            isDead: new Map(),
        };
        this.sceneData = new Map();
        this.localPlayerUid = null;
        this.localPlayerPosition = null;
    }

    setLocalPlayerUid(uid: number): void {
        if (this.localPlayerUid !== uid) {
            this.localPlayerUid = uid;
        }
    }

    setLocalPlayerPosition(position: { x: number; y: number; z: number }): void {
        this.localPlayerPosition = position;
    }

    calculateDistance(enemyPosition: { x: number; y: number; z: number }): number | null {
        if (!this.localPlayerPosition) return null;

        const dx = enemyPosition.x - this.localPlayerPosition.x;
        const dy = enemyPosition.y - this.localPlayerPosition.y;
        const dz = enemyPosition.z - this.localPlayerPosition.z;

        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Calculate the direction from the local player to the enemy position. The protbuf
     * has a direction property, but it's always 0 or undefined, so this is an alternative.
     * @param enemyPosition The position of the enemy.
     * @returns string | null
     */
    calculateDirection(enemyPosition: { x: number; y: number; z: number }): string | null {
        if (!this.localPlayerPosition) return null;

        const dx = enemyPosition.x - this.localPlayerPosition.x;
        const dz = enemyPosition.z - this.localPlayerPosition.z;

        const absX = Math.abs(dx);
        const absZ = Math.abs(dz);

        if (absX > absZ) {
            if (dx > 0) {
                if (absZ > absX * 0.4) {
                    return dz > 0 ? "NE" : "SE";
                }
                return "E";
            } else {
                if (absZ > absX * 0.4) {
                    return dz > 0 ? "NW" : "SW";
                }
                return "W";
            }
        } else {
            if (dz > 0) {
                if (absX > absZ * 0.4) {
                    return dx > 0 ? "NE" : "NW";
                }
                return "N";
            } else {
                if (absX > absZ * 0.4) {
                    return dx > 0 ? "SE" : "SW";
                }
                return "S";
            }
        }
    }

    async initialize(): Promise<void> { }

    getUser(uid: number): UserData {
        if (!this.users.has(uid)) {
            const user = new UserData(uid);
            const uidStr = String(uid);
            const cachedData = this.userCache.get(uidStr);
            if (this.playerMap.has(uidStr)) {
                user.setName(this.playerMap.get(uidStr)!);
            }
            if (cachedData) {
                if (cachedData.name) {
                    user.setName(cachedData.name);
                }
                if (
                    cachedData.fightPoint !== undefined &&
                    cachedData.fightPoint !== null
                ) {
                    user.setFightPoint(cachedData.fightPoint);
                }
                if (
                    cachedData.maxHp !== undefined &&
                    cachedData.maxHp !== null
                ) {
                    user.setAttrKV("max_hp", cachedData.maxHp);
                }
            }

            if (this.sceneData.has(uidStr)) {
                const sceneData = this.sceneData.get(uidStr);
                user.setLineId(sceneData?.LineId);
            }

            if (this.hpCache.has(uid)) {
                user.setAttrKV("hp", this.hpCache.get(uid));
            }

            this.users.set(uid, user);
        }
        return this.users.get(uid)!;
    }

    addDamage(
        uid: number,
        skillId: number,
        element: string,
        damage: number,
        isCrit: boolean,
        isLucky: boolean,
        isCauseLucky: boolean,
        hpLessenValue: number = 0,
        targetUid?: number,
    ): void {
        this.checkTimeoutClear();
        const user = this.getUser(uid);
        user.addDamage(
            skillId,
            element,
            damage,
            isCrit,
            isLucky,
            isCauseLucky,
            hpLessenValue,
        );
    }

    addHealing(
        uid: number,
        skillId: number,
        element: string,
        healing: number,
        isCrit: boolean,
        isLucky: boolean,
        isCauseLucky: boolean,
        targetUid?: number,
    ): void {
        this.checkTimeoutClear();
        if (uid !== 0) {
            const user = this.getUser(uid);
            user.addHealing(
                skillId,
                element,
                healing,
                isCrit,
                isLucky,
                isCauseLucky,
            );
        }
    }

    addTakenDamage(uid: number, damage: number, isDead: boolean): void {
        this.checkTimeoutClear();
        const user = this.getUser(uid);
        user.addTakenDamage(damage, isDead);
    }

    async addLog(log: string): Promise<void> {
        if (!this.globalSettings.enableFightLog) return;

        const logDir = path.join(process.env.USER_DATA_PATH, "logs", String(this.startTime));
        const logFile = path.join(logDir, "fight.log");
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${log}\n`;

        await this.logLock.acquire();
        try {
            if (!this.logDirExist.has(logDir)) {
                try {
                    await fsPromises.access(logDir);
                } catch (error) {
                    await fsPromises.mkdir(logDir, { recursive: true });
                }
                this.logDirExist.add(logDir);
            }
            await fsPromises.appendFile(logFile, logEntry, "utf8");
        } catch (error) {
            this.logger.error("Failed to save log:", error);
        }
        this.logLock.release();
    }

    setProfession(uid: number, profession: string): void {
        const user = this.getUser(uid);
        if (user.profession !== profession) {
            user.setProfession(profession);
            this.logger.debug(`Found profession ${profession} for uid ${uid}`);
        }
    }

    setName(uid: number, name: string): void {
        const user = this.getUser(uid);
        if (user.name !== name) {
            user.setName(name);
            this.logger.debug(`Found player name ${name} for uid ${uid}`);
        }
    }

    setSceneInfo(uid: number, sceneInfo: SceneInfo): void {
        this.sceneData.set(String(uid), sceneInfo);
    }

    setLineId(uid: number, lineId: number): void {
        const user = this.getUser(uid);
        user.setLineId(lineId);
    }

    getCurrentLineId(): number {
        // Try to get line ID from local player first
        if (this.localPlayerUid !== null) {
            const sceneInfo = this.sceneData.get(String(this.localPlayerUid));
            if (sceneInfo?.LineId) {
                return sceneInfo.LineId;
            }
        }

        // Fallback: get from any player with scene data
        for (const [uid, sceneInfo] of this.sceneData.entries()) {
            if (sceneInfo?.LineId) {
                return sceneInfo.LineId;
            }
        }

        // Final fallback: default to 1
        return 1;
    }

    setFightPoint(uid: number, fightPoint: number): void {
        const user = this.getUser(uid);
        if (user.fightPoint != fightPoint) {
            user.setFightPoint(fightPoint);
            this.logger.debug(`Found fight point ${fightPoint} for uid ${uid}`);
        }
    }

    setAttrKV(uid: number, key: string, value: any): void {
        const user = this.getUser(uid);
        user.attr[key] = value;
    }

    updateAllRealtimeDps(): void {
        for (const user of this.users.values()) {
            user.updateRealtimeDps();
        }
    }

    getUserSkillData(uid: number): any {
        const user = this.users.get(uid);
        if (!user) return null;

        return {
            uid: user.uid,
            name: user.name,
            profession: user.profession + (user.subProfession ? `-${user.subProfession}` : ""),
            skills: user.getSkillSummary(),
            attr: user.attr,
        };
    }

    getAllUsersData(): Record<number, UserSummary> {
        const result: Record<number, UserSummary> = {};
        for (const [uid, user] of this.users.entries()) {
            result[uid] = user.getSummary();
        }
        return result;
    }

    getSoloUserData(): Record<number, UserSummary> {
        const result: Record<number, UserSummary> = {};

        if (this.localPlayerUid) {
            const localUser = this.users.get(this.localPlayerUid);
            if (localUser) {
                result[this.localPlayerUid] = localUser.getSummary();
            }
        }

        return result;
    }

    getAllEnemiesData(): Record<string, any> {
        const result: Record<string, any> = {};
        const enemyIds = new Set([
            ...this.enemyCache.name.keys(),
            ...this.enemyCache.hp.keys(),
            ...this.enemyCache.maxHp.keys(),
        ]);

        // Exclude companions and resonance monsters
        const EXCLUDED_MONSTER_IDS = new Set([
            3000000,
            3000001,
            3000002,
            3000003,
            3000004,
            3000006,
            3000007,
            3000008,
            3000009,
            3000010,
            3000011,
            3000012,
            3000013,
            3000014,
            3000015,
            3000016,
            3000017,
            3000018,
            3000019,
            3000020,
            3000021,
            3000022,
            3000023,
            3000024,
            3000025,
            3000026,
            3000027,
            3000028,
            3000029,
            3000030,
            3000031,
            3000032,
            3000033,
            3000034,
            3000035,
            3000036,
            3000037,
            3000038,
            3000039,
            3000040,
            3000041,
            3000042,
            3000043,
            3000044,
            3100000, 
            3100001, 
            3100002,
        ]);

        enemyIds.forEach((id) => {
            const monsterId = this.enemyCache.monsterId.get(id);

            if (monsterId && EXCLUDED_MONSTER_IDS.has(monsterId)) {
                return;
            }

            let hpVal = this.enemyCache.hp.get(id);
            const isDead = this.enemyCache.isDead.get(id) || false;

            if (isDead) {
                hpVal = 0;
            }

            const position = this.enemyCache.position.get(id);
            const distance = position ? this.calculateDistance(position) : null;
            const direction = position ? this.calculateDirection(position) : null;

            result[id] = {
                name: this.enemyCache.name.get(id),
                hp: hpVal,
                max_hp: this.enemyCache.maxHp.get(id),
                monster_id: this.enemyCache.monsterId.get(id) ?? null,
                last_seen: this.enemyCache.lastSeen.get(id) ?? null,
                position: position ? { x: position.x, y: position.y, z: position.z } : null,
                distance: distance,
                direction: direction,
            };
        });
        return result;
    }

    refreshEnemyCache(): void {
        this.enemyCache.name.clear();
        this.enemyCache.hp.clear();
        this.enemyCache.maxHp.clear();
        this.enemyCache.monsterId.clear();
        this.enemyCache.lastSeen.clear();
        this.enemyCache.position.clear();
        this.enemyCache.isDead.clear();
    }

    async clearAll(isLineSwitch: boolean = false): Promise<void> {
        const shouldSave = this.users.size > 0 &&
            this.globalSettings.enableHistorySave &&
            (!isLineSwitch || this.globalSettings.saveOnLineSwitch !== false);

        if (shouldSave) {
            await this.saveAllUserData();
        }

        this.users = new Map();
        this.startTime = Date.now();
    }

    async resetStatistics(): Promise<void> {
        if (this.users.size > 0 && this.globalSettings.enableHistorySave) {
            await this.saveAllUserData();
        }

        for (const [uid, user] of this.users.entries()) {
            user.damageStats = new StatisticData(user, "伤害");
            user.healingStats = new StatisticData(user, "治疗");
            user.takenDamage = 0;
            user.deadCount = 0;
            user.skillUsage = new Map();
        }
        this.startTime = Date.now();
        this.logger.info("Statistics reset while keeping player information.");
    }

    getUserIds(): number[] {
        return Array.from(this.users.keys());
    }

    async saveAllUserData(
        usersToSave: Map<number, UserData> | null = null,
        startTime: number | null = null,
    ): Promise<void> {
        if (!this.globalSettings.enableHistorySave) return;

        try {
            const endTime = Date.now();
            const users = usersToSave || this.users;
            const timestamp = startTime || this.startTime;
            const logDir = path.join(process.env.USER_DATA_PATH, "logs", String(timestamp));
            const usersDir = path.join(logDir, "users");
            const summary = {
                startTime: timestamp,
                endTime,
                duration: endTime - timestamp,
                userCount: users.size,
                version: "3.1",
            };

            const allUsersData: Record<number, UserSummary> = {};
            const userDatas = new Map();
            for (const [uid, user] of users.entries()) {
                allUsersData[uid] = user.getSummary();

                const userData = {
                    uid: user.uid,
                    name: user.name,
                    profession:
                        user.profession +
                        (user.subProfession ? `-${user.subProfession}` : ""),
                    skills: user.getSkillSummary(),
                    attr: user.attr,
                };
                userDatas.set(uid, userData);
            }

            try {
                await fsPromises.access(usersDir);
            } catch (error) {
                await fsPromises.mkdir(usersDir, { recursive: true });
            }

            const allUserDataPath = path.join(logDir, "allUserData.json");
            await fsPromises.writeFile(
                allUserDataPath,
                JSON.stringify(allUsersData, null, 4),
                "utf8",
            );

            for (const [uid, userData] of userDatas.entries()) {
                const userDataPath = path.join(usersDir, `${uid}.json`);
                await fsPromises.writeFile(
                    userDataPath,
                    JSON.stringify(userData, null, 4),
                    "utf8",
                );
            }

            await fsPromises.writeFile(
                path.join(logDir, "summary.json"),
                JSON.stringify(summary, null, 4),
                "utf8",
            );

            this.logger.debug(
                `Saved data for ${summary.userCount} users to ${logDir}`,
            );

            this.io?.emit('historyUpdated', { timestamp: this.startTime });
        } catch (error) {
            this.logger.error("Failed to save all user data:", error);
            throw error;
        }
    }

    checkTimeoutClear(): void {
        if (!this.globalSettings.autoClearOnTimeout || this.users.size === 0)
            return;
        const currentTime = Date.now();
        const timeoutMs = (this.globalSettings.autoClearTimeoutSeconds || 20) * 1000;
        if (this.lastLogTime && currentTime - this.lastLogTime > timeoutMs) {
            this.clearAll();
            this.logger.info("Timeout reached, statistics cleared!");
        }
    }
}
