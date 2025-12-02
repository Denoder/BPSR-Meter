import zlib from 'zlib';
import Long from 'long';
import minimal from 'protobufjs/minimal.js';
import fs from 'fs';
import path from 'path';
import type { Logger } from '../src/types';
import type { UserDataManager } from '../src/server/dataManager';
import { BinaryReader } from './binary-reader';
import { BPTimerClient } from "@woheedev/bptimer-api-client";
import { EDamageType } from "./blueproto/enum_e_damage_type";
import { EEntityType } from "./blueproto/enum_e_entity_type";
import { EDamageSource } from "./blueproto/enum_e_damage_source";
import { EDamageProperty } from "./blueproto/enum_e_damage_property";
import { EAttrType } from "./blueproto/enum_e_attr_type";
import { type Attr, SyncToMeDeltaInfo, AoiSyncDelta, SyncNearEntities, SyncNearDeltaInfo, SyncContainerData, SyncContainerDirtyData } from "./blueproto/bp-main";
import { Position } from "./blueproto/stru_position";

const TRANSLATIONS_DIR = path.join(__dirname, "../main/translations");
let monsterNames: Record<string, string> = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, "en.json"), "utf-8")).monsters;

export function reloadMonsterTranslations(language: string): void {
    monsterNames = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, `${language}.json`), "utf-8")).monsters;
}

export function getMonsterNames(): Record<string, string> {
    return monsterNames;
}

const MessageType = {
    None: 0,
    Call: 1,
    Notify: 2,
    Return: 3,
    Echo: 4,
    FrameUp: 5,
    FrameDown: 6,
};

const NotifyMethod = {
    SyncNearEntities: 6,
    SyncContainerData: 21,
    SyncContainerDirtyData: 22,
    SyncServerTime: 43,
    SyncNearDeltaInfo: 45,
    SyncToMeDeltaInfo: 46
};

const ProfessionType = {
    雷影剑士: 1,
    冰魔导师: 2,
    涤罪恶火_战斧: 3,
    青岚骑士: 4,
    森语者: 5,
    雷霆一闪_手炮: 8,
    巨刃守护者: 9,
    暗灵祈舞_仪刀_仪仗: 10,
    神射手: 11,
    神盾骑士: 12,
    灵魂乐手: 13,
};

const getProfessionNameFromId = (professionId: number) => {
    switch (professionId) {
        case ProfessionType.雷影剑士:
            return '雷影剑士';
        case ProfessionType.冰魔导师:
            return '冰魔导师';
        case ProfessionType.涤罪恶火_战斧:
            return '涤罪恶火·战斧';
        case ProfessionType.青岚骑士:
            return '青岚骑士';
        case ProfessionType.森语者:
            return '森语者';
        case ProfessionType.雷霆一闪_手炮:
            return '雷霆一闪·手炮';
        case ProfessionType.巨刃守护者:
            return '巨刃守护者';
        case ProfessionType.暗灵祈舞_仪刀_仪仗:
            return '暗灵祈舞·仪刀/仪仗';
        case ProfessionType.神射手:
            return '神射手';
        case ProfessionType.神盾骑士:
            return '神盾骑士';
        case ProfessionType.灵魂乐手:
            return '灵魂乐手';
        default:
            return '';
    }
};

const getDamageElement = (damageProperty: EDamageProperty) => {
    switch (damageProperty) {
        case EDamageProperty.General:
            return '⚔️物';
        case EDamageProperty.Fire:
            return '🔥火';
        case EDamageProperty.Water:
            return '❄️冰';
        case EDamageProperty.Electricity:
            return '⚡雷';
        case EDamageProperty.Wood:
            return '🍀森';
        case EDamageProperty.Wind:
            return '💨风';
        case EDamageProperty.Rock:
            return '⛰️岩';
        case EDamageProperty.Light:
            return '🌟光';
        case EDamageProperty.Dark:
            return '🌑暗';
        case EDamageProperty.Count:
            return '❓？'; // Count
        default:
            return '⚔️物';
    }
};

const getDamageSource = (damageSource: EDamageSource) => {
    switch (damageSource) {
        case EDamageSource.EDamageSourceSkill:
            return 'Skill';
        case EDamageSource.EDamageSourceBullet:
            return 'Bullet';
        case EDamageSource.EDamageSourceBuff:
            return 'Buff';
        case EDamageSource.EDamageSourceFall:
            return 'Fall';
        case EDamageSource.EDamageSourceFakeBullet:
            return 'FBullet';
        case EDamageSource.EDamageSourceOther:
            return 'Other';
        default:
            return 'Unknown';
    }
};

const isUuidPlayer = (uuid: Long) => {
    return (uuid.toBigInt() & 0xffffn) === 640n;
};

const isUuidMonster = (uuid: Long) => {
    const low = uuid.toBigInt() & 0xffffn;
    return low === 64n || low === 32832n;
};

const doesStreamHaveIdentifier = (reader: BinaryReader) => {
    try {
        const identifier = reader.readUInt32LE();
        reader.readInt32();
        if (identifier !== 0xfffffffe) return false;
        return true;
    } catch (e) {
        return false;
    }
};

const streamReadString = (reader: BinaryReader) => {
    const length = reader.readUInt32LE();
    reader.readInt32();
    const buffer = reader.readBytes(length);
    reader.readInt32();
    return buffer.toString('utf8');
};

let currentUserUuid = Long.ZERO;

class PacketProcessor {
    logger: Logger;
    userDataManager: UserDataManager;
    bpTimerClient: BPTimerClient;

    static readonly TARGET_SERVICE_UUID = 0x63335342;

    constructor({ logger, userDataManager }: { logger: Logger; userDataManager: UserDataManager }) {
        this.logger = logger
        this.userDataManager = userDataManager;

        const DB_URL = import.meta.env.VITE_BPTIMER_DB_URL;
        const API_KEY = import.meta.env.VITE_BPTIMER_API_KEY;

        this.bpTimerClient = new BPTimerClient({
            api_url: DB_URL,
            api_key: API_KEY,
            logger: {
                info: (message: string) => this.logger.info(message),
                debug: (message: string) => this.logger.debug(message)
            },
        });

        // Test API connection on startup
        this.bpTimerClient.testConnection();
    }

    #decompressPayload(buffer: Buffer) {
        if (!zlib.zstdDecompressSync) {
            this.logger.warn('zstdDecompressSync is not available! Please check your Node.js version!');
            return;
        }
        return zlib.zstdDecompressSync(buffer);
    }

    #processAoiSyncDelta(AoiSyncDelta: AoiSyncDelta) {
        if (!AoiSyncDelta) return;

        let targetUuid = AoiSyncDelta.Uuid;
        if (!targetUuid) return;
        const tgtUuid = targetUuid.toString();
        const isTargetPlayer = isUuidPlayer(targetUuid);
        const isTargetMonster = isUuidMonster(targetUuid);
        targetUuid = targetUuid.shiftRight(16);

        const attrCollection = AoiSyncDelta.Attrs;
        if (attrCollection && attrCollection.Attrs) {
            if (isTargetPlayer) {
                this.#processPlayerAttrs(targetUuid.toNumber(), attrCollection.Attrs);
                this.#processPositionAttrs(String(targetUuid.toNumber()), EEntityType.EntChar, attrCollection.Attrs);
            } else if (isTargetMonster) {
                this.#processEnemyAttrs(tgtUuid, targetUuid.toNumber(), attrCollection.Attrs);
                this.#processPositionAttrs(tgtUuid, EEntityType.EntMonster, attrCollection.Attrs);
            }
        }

        const skillEffect = AoiSyncDelta.SkillEffects;
        if (!skillEffect) return;

        if (!skillEffect.Damages) return;
        for (const syncDamageInfo of skillEffect.Damages) {
            const skillId = syncDamageInfo.OwnerId;
            if (!skillId) continue;

            let attackerUuid = syncDamageInfo.TopSummonerId || syncDamageInfo.AttackerUuid;
            if (!attackerUuid) continue;
            const isAttackerPlayer = isUuidPlayer(attackerUuid);
            attackerUuid = attackerUuid.shiftRight(16);

            let damageTargetUuid = Long.fromString(tgtUuid);
            const tgtUuidStr = damageTargetUuid.toString();
            const isTargetPlayerDmg = isUuidPlayer(damageTargetUuid);
            damageTargetUuid = damageTargetUuid.shiftRight(16);

            const value = syncDamageInfo.Value;
            const luckyValue = syncDamageInfo.LuckyValue;
            const damage = value ?? luckyValue ?? Long.ZERO;

            if (damage.isZero()) continue;

            const isCrit = syncDamageInfo.TypeFlag != null ? (syncDamageInfo.TypeFlag & 1) === 1 : false;
            const isCauseLucky = syncDamageInfo.TypeFlag != null ? (syncDamageInfo.TypeFlag & 0b100) === 0b100 : false;
            const isHeal = syncDamageInfo.Type === EDamageType.Heal;
            const isDead = syncDamageInfo.IsDead != null ? syncDamageInfo.IsDead : false;
            const isLucky = !!luckyValue;
            const hpLessenValue = syncDamageInfo.HpLessenValue != null ? syncDamageInfo.HpLessenValue : Long.ZERO;
            const damageElement = getDamageElement(syncDamageInfo.Property);

            if (isTargetPlayerDmg) {
                //Player target
                //玩家目标
                if (isHeal) {
                    //Player received healing
                    //玩家被治疗
                    this.userDataManager.addHealing(
                        isAttackerPlayer ? attackerUuid.toNumber() : 0,
                        skillId,
                        damageElement,
                        damage.toNumber(),
                        isCrit,
                        isLucky,
                        isCauseLucky,
                        damageTargetUuid.toNumber(),
                    );
                } else {
                    //Player received damage
                    //玩家受到伤害
                    this.userDataManager.addTakenDamage(damageTargetUuid.toNumber(), damage.toNumber(), isDead);
                }
                if (isDead) {
                    this.userDataManager.setAttrKV(damageTargetUuid.toNumber(), 'hp', 0);
                }
            } else {
                //Non-player target
                //非玩家目标
                if (isHeal) {
                    //Non-player received healing
                    //非玩家被治疗
                } else {
                    //Non-player received damage
                    //非玩家受到伤害
                    if (isAttackerPlayer) {
                        //Only record damage dealt by players
                        //只记录玩家造成的伤害
                        this.userDataManager.addDamage(
                            attackerUuid.toNumber(),
                            skillId,
                            damageElement,
                            damage.toNumber(),
                            isCrit,
                            isLucky,
                            isCauseLucky,
                            hpLessenValue.toNumber(),
                            tgtUuidStr,
                        );
                    }

                    if (isDead) {
                        if (!this.userDataManager.enemyCache.isDead.get(tgtUuidStr)) {
                            this.userDataManager.enemyCache.isDead.set(tgtUuidStr, true);
                            this.userDataManager.enemyCache.hp.set(tgtUuidStr, 0);
                            this.userDataManager.enemyCache.deathTime.set(tgtUuidStr, Date.now());
                        }
                    }
                }
            }
        }
    }

    #processSyncServerTime(payloadBuffer: Buffer) {
        // SyncServerTime - we don't need to process anything special here
        // Kept for compatibility with the switch case in processPacket
    }

    #processSyncNearDeltaInfo(payloadBuffer: Buffer) {
        const syncNearDeltaInfo = SyncNearDeltaInfo.decode(payloadBuffer);

        // this.logger.debug(JSON.stringify(syncNearDeltaInfo, null, 4));

        if (!syncNearDeltaInfo.DeltaInfos) return;
        for (const aoiSyncDelta of syncNearDeltaInfo.DeltaInfos) {
            this.#processAoiSyncDelta(aoiSyncDelta);
        }
    }

    #processSyncToMeDeltaInfo(payloadBuffer: Buffer) {
        const syncToMeDeltaInfo = SyncToMeDeltaInfo.decode(payloadBuffer);
        //this.logger.debug(JSON.stringify(syncToMeDeltaInfo, null, 4));

        const aoiSyncToMeDelta = syncToMeDeltaInfo.DeltaInfo;

        const uuid = aoiSyncToMeDelta.Uuid;
        if (uuid && !currentUserUuid.eq(uuid)) {
            currentUserUuid = uuid;
            this.logger.info('Got player UUID! UUID: ' + currentUserUuid + ' UID: ' + currentUserUuid.shiftRight(16));
        }

        const aoiSyncDelta = aoiSyncToMeDelta.BaseDelta;
        if (!aoiSyncDelta) return;

        this.#processAoiSyncDelta(aoiSyncDelta);
    }

    #processSyncContainerData(payloadBuffer: Buffer) {
        try {
            const syncContainerData = SyncContainerData.decode(payloadBuffer);
            //fs.writeFileSync('SyncContainerData.json', JSON.stringify(syncContainerData, null, 4));

            if (!syncContainerData.vData) return;
            const vData = syncContainerData.vData;

            if (!vData.charId) return;
            const playerUid = vData.charId.toNumber();

            if (vData.roleLevel && vData.roleLevel.level) this.userDataManager.setAttrKV(playerUid, 'level', vData.roleLevel.level);

            if (vData.attr && vData.attr.curHp) this.userDataManager.setAttrKV(playerUid, 'hp', vData.attr.curHp.toNumber());

            if (vData.attr && vData.attr.maxHp) this.userDataManager.setAttrKV(playerUid, 'max_hp', vData.attr.maxHp.toNumber());

            if (!vData.charBase) return;
            const charBase = vData.charBase;
            const sceneData = vData.sceneData;

            if (sceneData) {
                this.userDataManager.setSceneInfo(playerUid, {
                    LineId: sceneData.lineId,
                    MapId: sceneData.mapId,
                });

                this.userDataManager.setLineId(playerUid, sceneData.lineId);
                if (sceneData.pos) this.userDataManager.setLocalPlayerPosition(sceneData.pos);
            }

            if (charBase.name) {
                this.logger.debug(`_processSyncContainerData: Setting player name for UID ${playerUid}: ${charBase.name}`);
                this.userDataManager.setName(playerUid, charBase.name);
            }

            if (charBase.accountId) {
                this.userDataManager.setLocalPlayerAccountId(charBase.accountId);
            }

            if (charBase.fightPoint) this.userDataManager.setFightPoint(playerUid, charBase.fightPoint);

            if (!vData.professionList) return;
            const professionList = vData.professionList;
            if (professionList.curProfessionId) {
                const professionName = getProfessionNameFromId(professionList.curProfessionId);
                this.logger.debug(`_processSyncContainerData: Setting profession for UID ${playerUid}: ${professionName}`);
                this.userDataManager.setProfession(playerUid, professionName);
            }
        } catch (err) {
            fs.writeFileSync('./SyncContainerData.dat', payloadBuffer);
            this.logger.warn(`Failed to decode SyncContainerData for player ${currentUserUuid.shiftRight(16)}. Please report to developer`);
            throw err;
        }
    }

    #processSyncContainerDirtyData(payloadBuffer: Buffer) {
        if (currentUserUuid.isZero()) return;

        const syncContainerDirtyData = SyncContainerDirtyData.decode(payloadBuffer);
        if (!syncContainerDirtyData.vData || !syncContainerDirtyData.vData.buffer) return;

        const messageReader = new BinaryReader(Buffer.from(syncContainerDirtyData.vData.buffer));

        if (!doesStreamHaveIdentifier(messageReader)) return;

        let fieldIndex = messageReader.readUInt32LE();
        messageReader.readInt32();
        switch (fieldIndex) {
            case 2: // CharBase
                if (!doesStreamHaveIdentifier(messageReader)) break;

                fieldIndex = messageReader.readUInt32LE();
                messageReader.readInt32();
                switch (fieldIndex) {
                    case 5: // Name
                        const playerName = streamReadString(messageReader);
                        if (!playerName || playerName === '') break;
                        this.userDataManager.setName(currentUserUuid.shiftRight(16).toNumber(), playerName);
                        break;
                    case 35: // FightPoint
                        const fightPoint = messageReader.readUInt32LE();
                        messageReader.readInt32();
                        this.userDataManager.setFightPoint(currentUserUuid.shiftRight(16).toNumber(), fightPoint);
                        break;
                    default:
                        // unhandle
                        break;
                }
                break;
            case 16: // UserFightAttr
                if (!doesStreamHaveIdentifier(messageReader)) break;

                fieldIndex = messageReader.readUInt32LE();
                messageReader.readInt32();
                switch (fieldIndex) {
                    case 1: // CurHp
                        const curHp = messageReader.readUInt32LE();
                        this.userDataManager.setAttrKV(currentUserUuid.shiftRight(16).toNumber(), 'hp', curHp);
                        break;
                    case 2: // MaxHp
                        const maxHp = messageReader.readUInt32LE();
                        this.userDataManager.setAttrKV(currentUserUuid.shiftRight(16).toNumber(), 'max_hp', maxHp);
                        break;
                    default:
                        // unhandle
                        break;
                }
                break;
            case 61: // ProfessionList
                if (!doesStreamHaveIdentifier(messageReader)) break;

                fieldIndex = messageReader.readUInt32LE();
                messageReader.readInt32();
                switch (fieldIndex) {
                    case 1: // CurProfessionId
                        const curProfessionId = messageReader.readUInt32LE();
                        messageReader.readInt32();
                        if (curProfessionId)
                            this.userDataManager.setProfession(currentUserUuid.shiftRight(16).toNumber(), getProfessionNameFromId(curProfessionId));
                        break;
                    default:
                        // unhandle
                        break;
                }
                break;
            default:
                // unhandle
                break;
        }

        // this.logger.debug(syncContainerDirtyData.VData.Buffer.toString('hex'));
    }

    #processPositionAttrs(targetID: string, targetType: EEntityType, attrs: Attr[]) {
        for (const attr of attrs) {
            if (!attr.Id || !attr.RawData) continue;

            switch (attr.Id) {
                case EAttrType.AttrDir: // Direction (Is calulated in degrees, but am unable to determine which scaling point & if it's camera relative)
                    //const direction = minimal.Reader.create(attr.RawData);
                    //const dir = direction.string();
                    //this.logger.debug(`_processPositionAttrs: Setting direction for ${targetType} ${targetID}: ${dir}`);
                    break;
                case EAttrType.AttrPos: // X, Y, Z
                    const position = Position.decode(attr.RawData);
                    const x = position.x ?? 0;
                    const y = position.y ?? 0;
                    const z = position.z ?? 0;

                    if (targetType === EEntityType.EntMonster) {
                        this.userDataManager.enemyCache.position.set(targetID as string, { x, y, z });
                    } else if (targetType === EEntityType.EntChar && targetID === String(this.userDataManager.localPlayerUid)) {
                        this.userDataManager.setLocalPlayerPosition({ x, y, z });
                    }
                    break;
                default:
                    break;
            }
        }
    }

    #processPlayerAttrs(playerUid: number, attrs: Attr[]) {
        for (const attr of attrs) {
            if (!attr.Id || !attr.RawData) continue;
            const reader = minimal.Reader.create(attr.RawData);

            switch (attr.Id) {
                case EAttrType.AttrName:
                    const playerName = reader.string();
                    this.logger.debug(`_processPlayerAttrs: Setting player name for UID ${playerUid}: ${playerName}`);
                    this.userDataManager.setName(playerUid, playerName);
                    break;
                case EAttrType.AttrProfessionId:
                    const professionId = reader.int32();
                    const professionName = getProfessionNameFromId(professionId);
                    this.logger.debug(`_processPlayerAttrs: Setting profession for UID ${playerUid}: ${professionName}`);
                    this.userDataManager.setProfession(playerUid, professionName);
                    break;
                case EAttrType.AttrFightPoint:
                    const playerFightPoint = reader.int32();
                    this.userDataManager.setFightPoint(playerUid, playerFightPoint);
                    break;
                case EAttrType.AttrLevel:
                    const playerLevel = reader.int32();
                    this.userDataManager.setAttrKV(playerUid, 'level', playerLevel);
                    break;
                case EAttrType.AttrRankLevel:
                    const playerRankLevel = reader.int32();
                    this.userDataManager.setAttrKV(playerUid, 'rank_level', playerRankLevel);
                    break;
                case EAttrType.AttrCri:
                    const playerCri = reader.int32();
                    this.userDataManager.setAttrKV(playerUid, 'cri', playerCri);
                    break;
                case EAttrType.AttrLuck:
                    const playerLucky = reader.int32();
                    this.userDataManager.setAttrKV(playerUid, 'lucky', playerLucky);
                    break;
                case EAttrType.AttrHp:
                    const playerHp = reader.int32();
                    this.userDataManager.setAttrKV(playerUid, 'hp', playerHp);
                    break;
                case EAttrType.AttrMaxHp:
                    const playerMaxHp = reader.int32();
                    this.userDataManager.setAttrKV(playerUid, 'max_hp', playerMaxHp);
                    break;
                case EAttrType.AttrElementAtk:
                    const playerElementFlag = reader.int32();
                    this.userDataManager.setAttrKV(playerUid, 'element_flag', playerElementFlag);
                    break;
                default:
                    // this.logger.debug(`Found unknown attrId ${attr.Id} for ${playerUid} ${attr.RawData.toString('base64')}`);
                    break;
            }
        }
    }

    #processEnemyAttrs(enemyUuid: string, enemyUid: number, attrs: Attr[]) {
        for (const attr of attrs) {
            if (!attr.Id || !attr.RawData) continue;
            const reader = minimal.Reader.create(attr.RawData);

            switch (attr.Id) {
                case EAttrType.AttrName:
                    const enemyName = reader.string();
                    this.userDataManager.enemyCache.name.set(enemyUuid, enemyName);
                    this.userDataManager.enemyCache.lastSeen.set(enemyUuid, Date.now());
                    this.logger.debug(`Found monster name ${enemyName} for id ${enemyUid} uuid ${enemyUuid}`);
                    break;
                case EAttrType.AttrId:
                    const attrId = reader.int32();
                    this.logger.debug(`Found monster attrId ${attrId} for id ${enemyUid} uuid ${enemyUuid}`);
                    this.userDataManager.enemyCache.monsterId.set(enemyUuid, attrId);
                    this.userDataManager.enemyCache.lastSeen.set(enemyUuid, Date.now());

                    const translatedName = monsterNames[String(attrId)];
                    if (translatedName && !this.userDataManager.enemyCache.name.has(enemyUuid)) {
                        this.userDataManager.enemyCache.name.set(enemyUuid, translatedName);
                        this.logger.debug(`Set monster name from translation: ${translatedName} for id ${enemyUid} uuid ${enemyUuid}`);
                    }
                    break;
                case EAttrType.AttrHp:
                    const enemyHp = reader.int32();
                    this.userDataManager.enemyCache.hp.set(enemyUuid, enemyHp);
                    this.userDataManager.enemyCache.lastSeen.set(enemyUuid, Date.now());

                    if (enemyHp > 0 && this.userDataManager.enemyCache.isDead.get(enemyUuid)) {
                        this.userDataManager.enemyCache.isDead.delete(enemyUuid);
                        this.userDataManager.enemyCache.damageDealt.delete(enemyUuid);
                        this.userDataManager.enemyCache.firstHitTime.delete(enemyUuid);
                        this.userDataManager.enemyCache.deathTime.delete(enemyUuid);
                        this.userDataManager.enemyCache.playerDamage.delete(enemyUuid);
                    }

                    this.#reportBossHpThreshold(enemyUuid, enemyUid, enemyHp);
                    break;
                case EAttrType.AttrMaxHp:
                    const enemyMaxHp = reader.int32();
                    this.userDataManager.enemyCache.maxHp.set(enemyUuid, enemyMaxHp);
                    this.userDataManager.enemyCache.lastSeen.set(enemyUuid, Date.now());
                    break;
                default:
                    break;
            }
        }
    }

    #reportBossHpThreshold(enemyUuid: string, enemyUid: number, currentHp: number) {
        try {
            // Check if BPTimer submission is enabled
            if (this.userDataManager.globalSettings?.enableBPTimerSubmission === false) {
                return;
            }

            // Don't report if monster is already marked as dead
            if (this.userDataManager.enemyCache.isDead.get(enemyUuid)) {
                return;
            }

            const monsterId = this.userDataManager.enemyCache.monsterId.get(enemyUuid);
            const maxHp = this.userDataManager.enemyCache.maxHp.get(enemyUuid);
            const position = this.userDataManager.enemyCache.position.get(enemyUuid);

            if (!monsterId || !maxHp || maxHp === 0) {
                return;
            }

            if (currentHp === 0 || currentHp <= maxHp * 0.001) {
                if (!this.userDataManager.enemyCache.isDead.get(enemyUuid)) {
                    this.userDataManager.enemyCache.deathTime.set(enemyUuid, Date.now());
                }
                this.userDataManager.enemyCache.isDead.set(enemyUuid, true);
                return;
            }

            const hpPercentage = (currentHp / maxHp) * 100;
            const pos_x = position?.x;
            const pos_y = position?.y;
            const pos_z = position?.z;
            const line = this.userDataManager.getCurrentLineId();
            const account_id = this.userDataManager.localPlayerAccountId ?? undefined;
            const uid = this.userDataManager.localPlayerUid ?? undefined;

            this.bpTimerClient
                .reportHP({
                    monster_id: monsterId,
                    hp_pct: hpPercentage,
                    line: line,
                    pos_x: pos_x,
                    pos_y: pos_y,
                    pos_z: pos_z,
                    account_id: account_id,
                    uid: uid,
                })
                .catch((err) => {
                    this.logger.debug(
                        `[BPTimer] Failed to report HP threshold: ${err.message}`,
                    );
                });
        } catch (error) {
            this.logger.debug(`[BPTimer] Error in HP threshold reporting: ${error}`);
        }
    }

    #processSyncNearEntities(payloadBuffer: Buffer) {
        const syncNearEntities = SyncNearEntities.decode(payloadBuffer);
        // this.logger.debug(JSON.stringify(syncNearEntities, null, 4));

        if (!syncNearEntities.appear) return;

        const localPlayerUid = currentUserUuid.shiftRight(16).toNumber();
        if (this.userDataManager && localPlayerUid > 0) {
            this.userDataManager.setLocalPlayerUid(localPlayerUid);
        }

        for (const entity of syncNearEntities.appear) {
            const entityUuid = entity.uuid;
            if (!entityUuid) continue;
            const entityUuidStr = entityUuid.toString();
            const entityUid = entityUuid.shiftRight(16).toNumber();
            const attrCollection = entity.attrs;

            if (attrCollection && attrCollection.Attrs) {
                switch (entity.entType) {
                    case EEntityType.EntMonster:
                        this.#processPositionAttrs(entityUuidStr, EEntityType.EntMonster, attrCollection.Attrs);
                        this.#processEnemyAttrs(entityUuidStr, entityUid, attrCollection.Attrs);
                        break;
                    case EEntityType.EntChar:
                        this.#processPlayerAttrs(entityUid, attrCollection.Attrs);
                        break;
                    default:
                        // this.logger.debug('Get AttrCollection for Unknown EntType' + entity.EntType);
                        break;
                }
            }
        }
    }

    #processNotifyMsg(reader: BinaryReader, isZstdCompressed: number) {
        const serviceUUID = reader.readUInt64();
        const stubId = reader.readUInt32();
        const methodId = reader.readUInt32();

        if (serviceUUID === BigInt(PacketProcessor.TARGET_SERVICE_UUID)) {
            let msgPayload = reader.readRemaining();
            if (isZstdCompressed) {
                msgPayload = this.#decompressPayload(msgPayload);
            }

            switch (methodId) {
                case NotifyMethod.SyncNearEntities:
                    this.#processSyncNearEntities(msgPayload);
                    break;
                case NotifyMethod.SyncContainerData:
                    this.#processSyncContainerData(msgPayload);
                    break;
                case NotifyMethod.SyncContainerDirtyData:
                    this.#processSyncContainerDirtyData(msgPayload);
                    break;
                case NotifyMethod.SyncServerTime:
                    this.#processSyncServerTime(msgPayload);
                    break;
                case NotifyMethod.SyncToMeDeltaInfo:
                    this.#processSyncToMeDeltaInfo(msgPayload);
                    break;
                case NotifyMethod.SyncNearDeltaInfo:
                    this.#processSyncNearDeltaInfo(msgPayload);
                    break;
                default:
                    this.logger.debug(`Skipping NotifyMsg with methodId ${methodId}`);
                    break;
            }
        }
        return;
    }

    #processReturnMsg(reader: BinaryReader, isZstdCompressed: number) {
        this.logger.debug(`Unimplemented processing return`);
    }

    processPacket(packets: Buffer) {
        try {
            const packetsReader = new BinaryReader(packets);

            do {
                let packetSize = packetsReader.peekUInt32();
                if (packetSize < 6) {
                    this.logger.debug(`Received invalid packet`);
                    return;
                }

                const packetReader = new BinaryReader(packetsReader.readBytes(packetSize));
                packetSize = packetReader.readUInt32();
                const packetType = packetReader.readUInt16();
                const isZstdCompressed = packetType & 0x8000;
                const msgTypeId = packetType & 0x7fff;

                switch (msgTypeId) {
                    case MessageType.Notify:
                        this.#processNotifyMsg(packetReader, isZstdCompressed);
                        break;
                    case MessageType.Return:
                        this.#processReturnMsg(packetReader, isZstdCompressed);
                        break;
                    case MessageType.FrameDown:
                        const serverSequenceId = packetReader.readUInt32();
                        if (packetReader.remaining == 0) break;

                        let nestedPacket = packetReader.readRemaining();

                        if (isZstdCompressed) {
                            nestedPacket = this.#decompressPayload(nestedPacket);
                        }

                        // this.logger.debug("Processing FrameDown packet.");
                        this.processPacket(nestedPacket);
                        break;
                    default:
                        // this.logger.debug(`Ignore packet with message type ${msgTypeId}.`);
                        break;
                }
            } while (packetsReader.remaining > 0);
        } catch (e) {
            this.logger.error(`Fail while parsing data for player ${currentUserUuid.shiftRight(16)}.\nErr: ${e}`);
        }
    }
}

export default PacketProcessor;
