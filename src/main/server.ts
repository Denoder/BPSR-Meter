import { Logger } from "../utils/logger";
import readline from "readline";
import path from "path";
import { promises as fsPromises } from "fs";
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import zlib from "zlib";
import type { GlobalSettings, PlayerRegistry } from "../../src/types/index";
import { UserDataManager, reloadSkillTranslations } from "../../src/server/dataManager";
import { reloadMonsterTranslations } from "../../algo/packet";
import Sniffer from "../../src/server/sniffer";
import initializeApi from "../../src/server/api";
import PacketProcessor from "../../algo/packet";

const SETTINGS_PATH = path.join(process.env.USER_DATA_PATH, "settings.json");
const PLAYER_REGISTRY_PATH = path.join(process.env.USER_DATA_PATH, "player_registry.json");

const globalSettings: GlobalSettings = {
    availableLanguages: ["en", "zh"],
    language: "en",
    selectedPlayers: [],
    filterMode: "all",
    isPaused: false,
    autoClearOnServerChange: true,
    autoClearOnTimeout: false,
    autoClearTimeoutSeconds: 20,
    onlyRecordEliteDummy: false,
    enableFightLog: false,
    enableHistorySave: false,
    enableBPTimerSubmission: true,
    enableManualHeight: false,
    heightStep: 20,
    performanceMode: false,
    updateIntervalMs: 100,
    disableTransparency: false,
    lastPausedAt: null,
    lastResumedAt: null,
    manualGroup: {
        enabled: false,
        members: [],
    },
};

const playerRegistry: PlayerRegistry = {};

let server_port: number | undefined;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

interface ErrorWithCode extends Error {
    code?: string;
}

async function main(): Promise<void> {
    const logger = new Logger();

    if (process.env.NODE_ENV === "development") {
        logger.setLevel(["info", "error", "warn"]);
    } else {
        logger.setLevel(["info", "error", "warn"]);
    }

    console.clear();
    console.log("###################################################");
    console.log("#                                                 #");
    console.log("#             BPSR Meter - Starting               #");
    console.log("#                                                 #");
    console.log("###################################################");
    console.log("\nStarting service...");
    console.log("Detecting network traffic, please wait...");

    // Load global settings
    try {
        await fsPromises.access(SETTINGS_PATH);
        const data = await fsPromises.readFile(SETTINGS_PATH, "utf8");
        Object.assign(globalSettings, JSON.parse(data));
    } catch (e) {
        const err = e as ErrorWithCode;
        if (err.code !== "ENOENT") {
            logger.error("Failed to load settings:", e);
        }
    }

    // Load player registry
    try {
        await fsPromises.access(PLAYER_REGISTRY_PATH);
        const data = await fsPromises.readFile(PLAYER_REGISTRY_PATH, "utf8");
        Object.assign(playerRegistry, JSON.parse(data));
    } catch (e) {
        const err = e as ErrorWithCode;
        if (err.code !== "ENOENT") {
            logger.error("Failed to load player registry:", e);
        }
    }

    // Create server and socket.io instance first
    if (server_port === undefined || server_port === null) {
        server_port = 8989;
    }

    // Load translations based on settings
    try {
        const language = globalSettings.language || "en";
        reloadSkillTranslations(language);
        reloadMonsterTranslations(language);
        logger.info(`Loaded translations for language: ${language}`);
    } catch (error) {
        logger.error("Failed to load translations:", error);
    }

    const app = express();
    const server = http.createServer(app);
    const io = new SocketIOServer(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    const userDataManager = new UserDataManager(logger, globalSettings, io);
    await userDataManager.initialize();

    const sniffer = new Sniffer(logger, userDataManager, globalSettings);

    // Get device number and log level from command line arguments
    const args = process.argv.slice(2);
    let current_arg_index = 0;

    if (args[current_arg_index] && !isNaN(parseInt(args[current_arg_index]))) {
        server_port = parseInt(args[current_arg_index]);
        current_arg_index++;
    }

    const deviceNum = globalSettings?.selectedDevice || args[current_arg_index];

    try {
        sniffer.setPacketProcessor(PacketProcessor);
        await sniffer.start(deviceNum, sniffer.getPacketProcessor());
    } catch (error) {
        logger.error(`Error starting sniffer: ${(error as Error).message}`);
        rl.close();
        process.exit(1);
    }

    process.on("SIGINT", async () => {
        logger.info("\nClosing application...");
        rl.close();
        process.exit(0);
    });

    process.on("SIGTERM", async () => {
        logger.info("\nClosing application...");
        rl.close();
        process.exit(0);
    });

    setInterval(() => {
        if (globalSettings.isPaused) {
            sniffer.setPaused(true);
        }

        if (!globalSettings.isPaused) {
            if (sniffer.getPaused()) {
                sniffer.setPaused(false);
            }

            userDataManager.updateAllRealtimeDps();
        }
    }, 100);

    initializeApi(
        app,
        server,
        io,
        userDataManager,
        logger,
        globalSettings,
        playerRegistry,
        sniffer,
    );

    server.listen(server_port, "0.0.0.0", () => {
        const localUrl = `http://localhost:${server_port}`;
        logger.info(
            `Web server started at ${localUrl}. Access from this PC using ${localUrl}/index.html or from another PC using http://[YOUR_LOCAL_IP]:${server_port}/index.html`,
        );
        logger.info("WebSocket server started");
    });

    logger.info("Welcome to BPSR Meter!");
    logger.info("Detecting game server, please wait...");

    // Interval to clean IP and TCP fragment cache
    setInterval(() => {
        userDataManager.checkTimeoutClear();
    }, 1000);
}

if (!zlib.zstdDecompressSync) {
    console.log(
        "zstdDecompressSync is not available! Please update your Node.js!",
    );
    process.exit(1);
}

main();
