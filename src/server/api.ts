import express, { Express, Request, Response } from "express";
import cors from "cors";
import path from "path";
import { promises as fsPromises } from "fs";
import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import cap from "cap";
import type { Logger, GlobalSettings, ApiResponse, PlayerRegistry } from "../types/index";
import type { UserDataManager } from "./dataManager";
import { reloadSkillTranslations } from "./dataManager";
import { reloadMonsterTranslations } from "../../algo/packet";
import Sniffer from "./sniffer";

// Use user data path in production, current directory in development
const SETTINGS_PATH = path.join(process.env.USER_DATA_PATH, "settings.json");
const PLAYER_REGISTRY_PATH = path.join(process.env.USER_DATA_PATH, "player_registry.json");

interface ErrorWithCode extends Error {
    code?: string;
}

function initializeApi(
    app: Express,
    server: HTTPServer,
    io: SocketIOServer,
    userDataManager: UserDataManager,
    logger: Logger,
    globalSettings: GlobalSettings,
    playerRegistry: PlayerRegistry,
    sniffer?: Sniffer,
) {
    app.use(cors());
    app.use(express.json());

    if (process.env.NODE_ENV !== "development") {
        app.use(express.static(path.join(__dirname, "..", "renderer")));

        app.get("/icon.png", (req: Request, res: Response) => {
            res.sendFile(path.join(__dirname, "..", "renderer", "icon.png"));
        });

        app.get("/favicon.ico", (req: Request, res: Response) => {
            res.sendFile(path.join(__dirname, "..", "renderer", "favicon.ico"));
        });
    }

    app.get("/api/data", (req: Request, res: Response) => {
        const userData = userDataManager.getAllUsersData();
        const data: ApiResponse = {
            code: 0,
            user: userData,
            timestamp: Date.now(),
            startTime: userDataManager.startTime,
        };
        res.json(data);
    });

    app.get("/api/solo-user", (req: Request, res: Response) => {
        const soloData = userDataManager.getSoloUserData();
        const data: ApiResponse = {
            code: 0,
            user: soloData,
            timestamp: Date.now(),
            startTime: userDataManager.startTime,
        };
        res.json(data);
    });

    app.get("/api/enemies", (req: Request, res: Response) => {
        const enemiesData = userDataManager.getAllEnemiesData();
        const data: ApiResponse = {
            code: 0,
            enemy: enemiesData,
        };
        res.json(data);
    });

    app.get("/api/clear", async (req: Request, res: Response) => {
        await userDataManager.clearAll();
        logger.info("Statistics cleared!");
        res.json({
            code: 0,
            msg: "Statistics cleared!",
        });
    });

    app.get("/api/reset", async (req: Request, res: Response) => {
        await userDataManager.resetStatistics();
        logger.info("Statistics reset (keeping player info)!");
        res.json({
            code: 0,
            msg: "Statistics reset!",
        });
    });

    app.post("/api/pause", (req: Request, res: Response) => {
        const { paused } = req.body;
        globalSettings.isPaused = !!paused;
        const now = Date.now();
        if (globalSettings.isPaused) {
            globalSettings.lastPausedAt = now;
        } else {
            globalSettings.lastResumedAt = now;
        }
        logger.info(
            `Statistics ${globalSettings.isPaused ? "paused" : "resumed"}!`,
        );

        (async () => {
            try {
                await fsPromises.writeFile(
                    SETTINGS_PATH,
                    JSON.stringify(globalSettings, null, 4),
                    "utf8",
                );
            } catch (err) {
                logger.error(
                    "Failed to persist settings after pause toggle:",
                    err,
                );
            }
        })();

        res.json({
            code: 0,
            msg: `Statistics ${globalSettings.isPaused ? "paused" : "resumed"}!`,
            paused: globalSettings.isPaused,
            lastPausedAt: globalSettings.lastPausedAt || null,
            lastResumedAt: globalSettings.lastResumedAt || null,
        });
    });

    app.get("/api/pause", (req: Request, res: Response) => {
        res.json({
            code: 0,
            paused: globalSettings.isPaused,
        });
    });

    app.post("/api/set-username", (req: Request, res: Response) => {
        const { uid, name } = req.body;
        if (uid && name) {
            const userId = parseInt(uid, 10);
            if (!isNaN(userId)) {
                userDataManager.setName(userId, name);
                logger.info(
                    `Manually assigned name '${name}' to UID ${userId}`,
                );
                res.json({ code: 0, msg: "Username updated successfully." });
            } else {
                res.status(400).json({ code: 1, msg: "Invalid UID." });
            }
        } else {
            res.status(400).json({ code: 1, msg: "Missing UID or name." });
        }
    });

    app.get("/api/skill/:uid", (req: Request, res: Response) => {
        const uid = parseInt(req.params.uid);
        const skillData = userDataManager.getUserSkillData(uid);

        if (!skillData) {
            return res.status(404).json({
                code: 1,
                msg: "User not found",
            });
        }

        res.json({
            code: 0,
            data: skillData,
        });
    });

    app.get("/api/skills", (req: Request, res: Response) => {
        const userData = userDataManager.getAllUsersData();
        const skillsData: Record<string, any> = {};

        for (const [uid, user] of Object.entries(userData)) {
            if (
                (user.total_damage && user.total_damage.total > 0) ||
                user.taken_damage > 0 ||
                (user.total_healing && user.total_healing.total > 0)
            ) {
                skillsData[uid] = userDataManager.getUserSkillData(
                    parseInt(uid),
                );
            }
        }

        const data: ApiResponse = {
            code: 0,
            data: { skills: skillsData },
            timestamp: Date.now(),
            startTime: userDataManager.startTime,
        };
        res.json(data);
    });

    // List available capture devices (npcap/pcap)
    app.get("/api/devices", (req: Request, res: Response) => {
        try {
            const devices = cap.Cap.deviceList();
            const simplified = (devices || []).map((d: any, idx: number) => ({
                id: idx,
                name: d.name,
                description: d.description || "",
                addresses: d.addresses || [],
            }));
            res.json({ code: 0, data: simplified });
        } catch (err) {
            logger.error("Failed to enumerate devices:", err);
            res.status(500).json({ code: 1, msg: "Failed to enumerate devices" });
        }
    });

    // Get or set selected device in settings
    app.get("/api/device", async (req: Request, res: Response) => {
        try {
            res.json({ code: 0, data: { selectedDevice: globalSettings.selectedDevice || null } });
        } catch (err) {
            res.status(500).json({ code: 1, msg: "Failed to read device setting" });
        }
    });

    app.post("/api/device", async (req: Request, res: Response) => {
        try {
            const { selectedDevice } = req.body;
            globalSettings.selectedDevice = selectedDevice;

            await fsPromises.writeFile(SETTINGS_PATH, JSON.stringify(globalSettings, null, 4), "utf8");

            await sniffer.stop();
            await sniffer.start(selectedDevice !== undefined ? selectedDevice : "auto", sniffer.getPacketProcessor());

            res.json({ code: 0, data: { selectedDevice } });
        } catch (err) {
            logger.error("Failed to persist selected device:", err);
            res.status(500).json({ code: 1, msg: "Failed to persist selected device" });
        }
    });

    app.get(
        "/api/history/:timestamp/summary",
        async (req: Request, res: Response) => {
            const { timestamp } = req.params;
            const historyFilePath = path.join(
                process.env.USER_DATA_PATH,
                "logs",
                timestamp,
                "summary.json",
            );

            try {
                const data = await fsPromises.readFile(historyFilePath, "utf8");
                const summaryData = JSON.parse(data);
                res.json({
                    code: 0,
                    data: summaryData,
                });
            } catch (error) {
                const err = error as ErrorWithCode;
                if (err.code === "ENOENT") {
                    logger.warn("History summary file not found:", error);
                    res.status(404).json({
                        code: 1,
                        msg: "History summary file not found",
                    });
                } else {
                    logger.error("Failed to read history summary file:", error);
                    res.status(500).json({
                        code: 1,
                        msg: "Failed to read history summary file",
                    });
                }
            }
        },
    );

    app.get(
        "/api/history/:timestamp/data",
        async (req: Request, res: Response) => {
            const { timestamp } = req.params;
            const historyFilePath = path.join(
                process.env.USER_DATA_PATH,
                "logs",
                timestamp,
                "allUserData.json",
            );

            try {
                const data = await fsPromises.readFile(historyFilePath, "utf8");
                const userData = JSON.parse(data);
                res.json({
                    code: 0,
                    user: userData,
                });
            } catch (error) {
                const err = error as ErrorWithCode;
                if (err.code === "ENOENT") {
                    logger.warn("History data file not found:", error);
                    res.status(404).json({
                        code: 1,
                        msg: "History data file not found",
                    });
                } else {
                    logger.error("Failed to read history data file:", error);
                    res.status(500).json({
                        code: 1,
                        msg: "Failed to read history data file",
                    });
                }
            }
        },
    );

    app.get(
        "/api/history/:timestamp/skill/:uid",
        async (req: Request, res: Response) => {
            const { timestamp, uid } = req.params;
            const historyFilePath = path.join(
                process.env.USER_DATA_PATH,
                "logs",
                timestamp,
                "users",
                `${uid}.json`,
            );

            try {
                const data = await fsPromises.readFile(historyFilePath, "utf8");
                const skillData = JSON.parse(data);
                res.json({
                    code: 0,
                    data: skillData,
                });
            } catch (error) {
                const err = error as ErrorWithCode;
                if (err.code === "ENOENT") {
                    logger.warn("History skill file not found:", error);
                    res.status(404).json({
                        code: 1,
                        msg: "History skill file not found",
                    });
                } else {
                    logger.error("Failed to read history skill file:", error);
                    res.status(500).json({
                        code: 1,
                        msg: "Failed to load history skill file",
                    });
                }
            }
        },
    );

    app.get(
        "/api/history/:timestamp/download",
        async (req: Request, res: Response) => {
            const { timestamp } = req.params;
            const historyFilePath = path.join(
                process.env.USER_DATA_PATH,
                "logs",
                timestamp,
                "fight.log",
            );
            res.download(historyFilePath, `fight_${timestamp}.log`);
        },
    );

    app.get("/api/history/list", async (req: Request, res: Response) => {
        try {
            const logsDir = path.join(process.env.USER_DATA_PATH, "logs");
            const data = (
                await fsPromises.readdir(logsDir, { withFileTypes: true })
            )
                .filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
                .map((e) => e.name);
            res.json({
                code: 0,
                data: data,
            });
        } catch (error) {
            const err = error as ErrorWithCode;
            if (err.code === "ENOENT") {
                logger.warn("History path not found:", error);
                res.status(404).json({
                    code: 1,
                    msg: "History path not found",
                });
            } else {
                logger.error("Failed to load history path:", error);
                res.status(500).json({
                    code: 1,
                    msg: "Failed to load history path",
                });
            }
        }
    });

    app.get("/api/settings", async (req: Request, res: Response) => {
        res.json({ code: 0, data: globalSettings });
    });

    app.post("/api/settings", async (req: Request, res: Response) => {
        const newSettings = req.body;
        Object.assign(globalSettings, newSettings);

        await fsPromises.writeFile(SETTINGS_PATH, JSON.stringify(globalSettings, null, 4), "utf8");

        res.json({ code: 0, data: globalSettings });
    });

    app.get("/api/translations/:lang", async (req: Request, res: Response) => {
        const { lang } = req.params;
        const translationPath = process.env.NODE_ENV === 'development' ?
            path.join(__dirname, "..", "..", "translations", `${lang}.json`) :
            path.join(__dirname, "translations", `${lang}.json`);

        try {
            const data = await fsPromises.readFile(translationPath, "utf8");
            res.json({
                code: 0,
                data: JSON.parse(data),
            });
        } catch (error) {
            const err = error as ErrorWithCode;
            if (err.code === "ENOENT") {
                res.status(404).json({
                    code: 1,
                    msg: "Translation file not found",
                });
            } else {
                logger.error("Failed to read translation file:", error);
                res.status(500).json({
                    code: 1,
                    msg: "Failed to load translation",
                });
            }
        }
    });

    app.post("/api/language", async (req: Request, res: Response) => {
        const { language } = req.body;

        if (
            !language ||
            !globalSettings.availableLanguages?.includes(language)
        ) {
            return res.status(400).json({
                code: 1,
                msg: "Invalid language",
            });
        }

        globalSettings.language = language;
        
        // Reload translations
        try {
            reloadSkillTranslations(language);
            reloadMonsterTranslations(language);
        } catch (error) {
            logger.error(`Failed to reload translations for language ${language}:`, error);
            return res.status(500).json({
                code: 1,
                msg: "Failed to reload translations",
            });
        }
        
        await fsPromises.writeFile(
            SETTINGS_PATH,
            JSON.stringify(globalSettings, null, 4),
            "utf8",
        );

        io.emit("languageChanged", { language });

        res.json({
            code: 0,
            data: { language: globalSettings.language },
        });
    });

    app.get("/api/manual-group", (req: Request, res: Response) => {
        res.json({
            code: 0,
            data: {
                enabled: globalSettings.manualGroup?.enabled || false,
                members: globalSettings.manualGroup?.members || [],
            },
        });
    });

    app.post("/api/manual-group", async (req: Request, res: Response) => {
        if (!globalSettings.manualGroup) {
            globalSettings.manualGroup = { enabled: false, members: [] };
        }

        const { enabled, members } = req.body;
        globalSettings.manualGroup.enabled = enabled;
        globalSettings.manualGroup.members = members;

        await fsPromises.writeFile(
            SETTINGS_PATH,
            JSON.stringify(globalSettings, null, 4),
            "utf8",
        );

        res.json({
            code: 0,
            data: {
                enabled: globalSettings.manualGroup.enabled,
                members: globalSettings.manualGroup.members,
            },
        });
    });

    app.post("/api/manual-group/add", async (req: Request, res: Response) => {
        const { uid, name } = req.body;

        if (!uid) {
            return res.status(400).json({
                code: 1,
                msg: "UID is required",
            });
        }

        if (!globalSettings.manualGroup) {
            globalSettings.manualGroup = { enabled: false, members: [] };
        }

        const exists = globalSettings.manualGroup.members.some(
            (m) => m.uid === uid,
        );
        if (exists) {
            return res.status(400).json({
                code: 1,
                msg: "Player already in group",
            });
        }

        globalSettings.manualGroup.members.push({
            uid,
            name: name || "Unknown",
        });

        await fsPromises.writeFile(
            SETTINGS_PATH,
            JSON.stringify(globalSettings, null, 4),
            "utf8",
        );

        logger.info(`Added player ${name || uid} to manual group`);

        res.json({
            code: 0,
            data: {
                enabled: globalSettings.manualGroup.enabled,
                members: globalSettings.manualGroup.members,
            },
        });
    });

    app.post(
        "/api/manual-group/remove",
        async (req: Request, res: Response) => {
            const { uid } = req.body;

            if (!uid) {
                return res.status(400).json({
                    code: 1,
                    msg: "UID is required",
                });
            }

            if (!globalSettings.manualGroup) {
                globalSettings.manualGroup = { enabled: false, members: [] };
            }

            globalSettings.manualGroup.members =
                globalSettings.manualGroup.members.filter((m) => m.uid !== uid);
            await fsPromises.writeFile(
                SETTINGS_PATH,
                JSON.stringify(globalSettings, null, 4),
                "utf8",
            );

            logger.info(`Removed player ${uid} from manual group`);

            res.json({
                code: 0,
                data: {
                    enabled: globalSettings.manualGroup.enabled,
                    members: globalSettings.manualGroup.members,
                },
            });
        },
    );

    app.post("/api/manual-group/clear", async (req: Request, res: Response) => {
        if (!globalSettings.manualGroup) {
            globalSettings.manualGroup = { enabled: false, members: [] };
        }

        globalSettings.manualGroup.members = [];
        await fsPromises.writeFile(
            SETTINGS_PATH,
            JSON.stringify(globalSettings, null, 4),
            "utf8",
        );

        logger.info("Cleared manual group members");

        res.json({
            code: 0,
            data: {
                enabled: globalSettings.manualGroup.enabled,
                members: [],
            },
        });
    });

    app.get("/api/player-registry", (req: Request, res: Response) => {
        if (!playerRegistry) {
            playerRegistry = {};
        }
        res.json({
            code: 0,
            data: playerRegistry,
        });
    });

    app.post(
        "/api/player-registry/save",
        async (req: Request, res: Response) => {
            const { uid, name } = req.body;

            if (!uid || !name) {
                return res.status(400).json({
                    code: 1,
                    msg: "UID and name are required",
                });
            }

            if (!playerRegistry) {
                playerRegistry = {};
            }

            playerRegistry[uid] = { name };
            await fsPromises.writeFile(
                PLAYER_REGISTRY_PATH,
                JSON.stringify(playerRegistry, null, 4),
                "utf8",
            );

            logger.info(`Saved player: ${uid} -> ${name}`);

            res.json({
                code: 0,
                data: playerRegistry,
            });
        },
    );

    app.post(
        "/api/player-registry/delete",
        async (req: Request, res: Response) => {
            const { uid } = req.body;

            if (!uid) {
                return res.status(400).json({
                    code: 1,
                    msg: "UID is required",
                });
            }

            if (!playerRegistry) {
                playerRegistry = {};
            }

            delete playerRegistry[uid];
            await fsPromises.writeFile(
                PLAYER_REGISTRY_PATH,
                JSON.stringify(playerRegistry, null, 4),
                "utf8",
            );

            logger.info(`Deleted player: ${uid}`);

            res.json({
                code: 0,
                data: playerRegistry,
            });
        },
    );

    app.post(
        "/api/player-registry/auto-update",
        async (req: Request, res: Response) => {
            if (!playerRegistry) {
                playerRegistry = {};
            }

            const userData = userDataManager.getAllUsersData();
            let updated = false;

            for (const [uid, player] of Object.entries(userData)) {
                if (
                    player.name &&
                    player.name !== "Unknown" &&
                    player.name.trim() !== ""
                ) {
                    const uidStr = String(uid);
                    if (
                        playerRegistry[uidStr] &&
                        playerRegistry[uidStr].name !== player.name
                    ) {
                        logger.info(
                            `Auto-updated player name: ${uid} from "${playerRegistry[uidStr].name}" to "${player.name}"`,
                        );
                        playerRegistry[uidStr].name = player.name;
                        updated = true;
                    }
                }
            }

            if (updated) {
                await fsPromises.writeFile(
                    PLAYER_REGISTRY_PATH,
                    JSON.stringify(playerRegistry, null, 4),
                    "utf8",
                );
            }

            res.json({
                code: 0,
                data: { updated, registry: playerRegistry },
            });
        },
    );

    io.on("connection", (socket) => {
        logger.info("WebSocket client connected: " + socket.id);

        // Handle client requests via Socket.IO
        socket.on("getPlayerData", (callback) => {
            const userData = userDataManager.getAllUsersData();
            const data: ApiResponse = {
                code: 0,
                user: userData,
                timestamp: Date.now(),
                startTime: userDataManager.startTime,
            };
            callback(data);
        });

        socket.on("getSoloUser", (callback) => {
            const soloData = userDataManager.getSoloUserData();
            const data: ApiResponse = {
                code: 0,
                user: soloData,
                timestamp: Date.now(),
                startTime: userDataManager.startTime,
            };
            callback(data);
        });

        socket.on("getSkills", (callback) => {
            const userData = userDataManager.getAllUsersData();
            const skillsData: Record<string, any> = {};

            for (const [uid, user] of Object.entries(userData)) {
                if (
                    (user.total_damage && user.total_damage.total > 0) ||
                    user.taken_damage > 0 ||
                    (user.total_healing && user.total_healing.total > 0)
                ) {
                    skillsData[uid] = userDataManager.getUserSkillData(
                        parseInt(uid),
                    );
                }
            }

            const data: ApiResponse = {
                code: 0,
                data: { skills: skillsData },
                timestamp: Date.now(),
                startTime: userDataManager.startTime,
            };
            callback(data);
        });

        socket.on("getSettings", (callback) => {
            callback({ code: 0, data: globalSettings });
        });

        socket.on("updateSettings", async (newSettings, callback) => {
            Object.assign(globalSettings, newSettings);
            await fsPromises.writeFile(SETTINGS_PATH, JSON.stringify(globalSettings, null, 4), "utf8");
            callback({ code: 0, data: globalSettings });
        });

        socket.on("resetStatistics", async (callback) => {
            await userDataManager.resetStatistics();
            logger.info("Statistics reset (keeping player info)!");
            callback({ code: 0, msg: "Statistics reset!" });
        });

        socket.on("togglePause", async (data, callback) => {
            const { paused } = data;
            globalSettings.isPaused = !!paused;
            const now = Date.now();
            if (globalSettings.isPaused) {
                globalSettings.lastPausedAt = now;
            } else {
                globalSettings.lastResumedAt = now;
            }
            logger.info(
                `Statistics ${globalSettings.isPaused ? "paused" : "resumed"}!`,
            );

            try {
                await fsPromises.writeFile(
                    SETTINGS_PATH,
                    JSON.stringify(globalSettings, null, 4),
                    "utf8",
                );
            } catch (err) {
                logger.error(
                    "Failed to persist settings after pause toggle:",
                    err,
                );
            }

            callback({
                code: 0,
                msg: `Statistics ${globalSettings.isPaused ? "paused" : "resumed"}!`,
                paused: globalSettings.isPaused,
                lastPausedAt: globalSettings.lastPausedAt || null,
                lastResumedAt: globalSettings.lastResumedAt || null,
            });
        });

        socket.on("getPauseState", (callback) => {
            callback({
                code: 0,
                paused: globalSettings.isPaused,
            });
        });

        socket.on("changeLanguage", async (data, callback) => {
            const { language } = data;

            if (
                !language ||
                !globalSettings.availableLanguages?.includes(language)
            ) {
                callback({
                    code: 1,
                    msg: "Invalid language",
                });
                return;
            }

            globalSettings.language = language;
            
            // Reload translations
            try {
                reloadSkillTranslations(language);
                reloadMonsterTranslations(language);
            } catch (error) {
                logger.error(`Failed to reload translations for language ${language}:`, error);
                callback({
                    code: 1,
                    msg: "Failed to reload translations",
                });
                return;
            }
            
            await fsPromises.writeFile(
                SETTINGS_PATH,
                JSON.stringify(globalSettings, null, 4),
                "utf8",
            );

            // Broadcast language change to all connected clients
            io.emit("languageChanged", { language });

            callback({
                code: 0,
                data: { language: globalSettings.language },
            });
        });

        socket.on("getManualGroup", (callback) => {
            callback({
                code: 0,
                data: {
                    enabled: globalSettings.manualGroup?.enabled || false,
                    members: globalSettings.manualGroup?.members || [],
                },
            });
        });

        socket.on("updateManualGroup", async (data, callback) => {
            if (!globalSettings.manualGroup) {
                globalSettings.manualGroup = { enabled: false, members: [] };
            }

            const { enabled, members } = data;
            globalSettings.manualGroup.enabled = enabled;
            globalSettings.manualGroup.members = members;

            await fsPromises.writeFile(
                SETTINGS_PATH,
                JSON.stringify(globalSettings, null, 4),
                "utf8",
            );

            callback({
                code: 0,
                data: {
                    enabled: globalSettings.manualGroup.enabled,
                    members: globalSettings.manualGroup.members,
                },
            });
        });

        socket.on("clearManualGroup", async (callback) => {
            if (!globalSettings.manualGroup) {
                globalSettings.manualGroup = { enabled: false, members: [] };
            }

            globalSettings.manualGroup.members = [];
            await fsPromises.writeFile(
                SETTINGS_PATH,
                JSON.stringify(globalSettings, null, 4),
                "utf8",
            );

            logger.info("Cleared manual group members");

            callback({
                code: 0,
                data: {
                    enabled: globalSettings.manualGroup.enabled,
                    members: [],
                },
            });
        });

        socket.on("getPlayerRegistry", (callback) => {
            callback({
                code: 0,
                data: playerRegistry || {},
            });
        });

        socket.on("addToPlayerRegistry", async (data, callback) => {
            const { uuid, name } = data;

            if (!uuid || !name) {
                callback({
                    code: 1,
                    msg: "UUID and name are required",
                });
                return;
            }

            playerRegistry[uuid] = { name };
            await fsPromises.writeFile(
                PLAYER_REGISTRY_PATH,
                JSON.stringify(playerRegistry, null, 4),
                "utf8",
            );

            logger.info(`Saved player: ${uuid} -> ${name}`);

            callback({
                code: 0,
                data: playerRegistry,
            });
        });

        socket.on("deleteFromPlayerRegistry", async (data, callback) => {
            const { uid } = data;

            if (!uid) {
                callback({
                    code: 1,
                    msg: "UID is required",
                });
                return;
            }

            delete playerRegistry[uid];
            await fsPromises.writeFile(
                PLAYER_REGISTRY_PATH,
                JSON.stringify(playerRegistry, null, 4),
                "utf8",
            );

            logger.debug(`Deleted player: ${uid}`);

            callback({
                code: 0,
                data: playerRegistry,
            });
        });

        socket.on("disconnect", () => {
            logger.info("WebSocket client disconnected: " + socket.id);
        });
    });

    const updateInterval = globalSettings.updateIntervalMs || 100;
    
    setInterval(() => {
        if (!globalSettings.isPaused) {
            const userData = userDataManager.getAllUsersData();
            const data: ApiResponse = {
                code: 0,
                user: userData,
                timestamp: Date.now(),
                startTime: userDataManager.startTime,
            };
            io.emit("userData", data);

            const soloData = userDataManager.getSoloUserData();
            const sdata: ApiResponse = {
                code: 0,
                user: soloData,
                timestamp: Date.now(),
                startTime: userDataManager.startTime,
            };
            io.emit("soloUser", sdata);

            // skill data
            const skillData: Record<string, any> = {};

            for (const [uid, user] of Object.entries(userData)) {
                if (
                    (user.total_damage && user.total_damage.total > 0) ||
                    user.taken_damage > 0 ||
                    (user.total_healing && user.total_healing.total > 0)
                ) {
                    skillData[uid] = userDataManager.getUserSkillData(
                        parseInt(uid),
                    );
                }
            }

            const skillsData: ApiResponse = {
                code: 0,
                data: { skills: skillData },
                timestamp: Date.now(),
                startTime: userDataManager.startTime,
            };

            io.emit("skillData", skillsData);
        }

        const monsterData = userDataManager.getAllEnemiesData();
        const mdata: ApiResponse = {
            code: 0,
            enemy: monsterData,
        };
        io.emit("monsterData", mdata);
    }, updateInterval);
}

export default initializeApi;
