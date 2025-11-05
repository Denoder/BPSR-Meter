import type { Logger } from 'winston';
import { GlobalSettings } from '../types';

// @ts-ignore
const DB_URL = import.meta.env.VITE_BPTIMER_DB_URL;
// @ts-ignore
const API_KEY = import.meta.env.VITE_BPTIMER_API_KEY;

export const TRACKED_MONSTER_IDS = new Set([
    // Golden Juggernaut
    '80006', '10032',
    // Frost Ogre
    '108', '10009', '20100', '20127', '80002', '2000129', '2000140', '2004172', '3000006', '3000019',
    // Inferno Ogre
    '80004', '10018',
    // Phantom Arachnocrab
    '80008', '10069',
    // Brigand Leader
    '10056',
    // Venobzzar Incubator
    '80009', '10077', '3000025',
    // Muku Chief
    '80007', '10059', '3000022',
    // Iron Fang
    '8611', '80010', '10081', '3000024',
    // Storm Goblin King
    '80001', '10007', '61219', '61220', '61221',
    // Tempest Ogre
    '4301', '10010', '20024', '20072', '20092', '80003', '2000131', '2000137', '3000001', '3000020', '530354',
    // Celestial Flier
    '10084', '3000038',
    // Lizardman King
    '10085', '3000036',
    // Goblin King
    '8070', '203', '204', '1400', '1410', '1413', '10086', '20028', '20070', '20107', '60416', '552020', '612401', '7700001', '2000134', '2000138', '2004164', '2004169', '3000021',
    // Muku King
    '10029', '20027', '20071', '20108', '80005', '81000', '3000008',
    // Pets/Special
    '10902', '10903', '10904', '10900', '10901'
]);

interface HpReportResponse {
    success: boolean;
    message?: string;
    data?: any;
}

class BPTimer {
    #dbURL: string;
    #apiKey: string;
    #reportedThresholds: Map<string, Map<number, Set<number>>>;
    #pendingRequests: Map<string, Set<string>>;
    #logger: Logger;
    globalSettings: GlobalSettings;

    constructor(apiKey: string, dbURL: string, logger: Logger, globalSettings?: GlobalSettings) {
        this.#dbURL = dbURL;
        this.#apiKey = apiKey;
        this.#reportedThresholds = new Map();
        this.#pendingRequests = new Map();
        this.#logger = logger;
        this.globalSettings = globalSettings;
    }

    /**
     * API request handler
     */
    async #request(endpoint: string, options: RequestInit = {}): Promise<Response> {
        const url = `${this.#dbURL}${endpoint}`;
        const headers = {
            'X-API-Key': this.#apiKey,
            'Content-Type': 'application/json',
            ...options.headers
        };

        return fetch(url, { ...options, headers });
    }

    /**
     * Create HP report for a boss monster
     * @param monsterId - The monster ID
     * @param hpPct - HP percentage (0-100)
     * @param line - Server line number (1-XXX)
     */
    async createHpReport(monsterId: string | number, hpPct: number, line: number): Promise<HpReportResponse> {
        try {

            if (this.globalSettings.enableBPTimerSubmission === false) {
                return {
                    success: false,
                    message: 'BPTimer submission disabled in settings'
                };
            }

            if (!API_KEY || !DB_URL) {
                return {
                    success: false,
                    message: 'BPTimer API key or DB URL not configured'
                };
            }

            if (!TRACKED_MONSTER_IDS.has(String(monsterId))) {
                return {
                    success: false,
                    message: 'Monster ID not tracked'
                };
            }

            const roundedHpPct = Math.round(hpPct / 5) * 5;

            const monsterKey = `${monsterId}`;
            if (!this.#reportedThresholds.has(monsterKey)) {
                this.#reportedThresholds.set(monsterKey, new Map());
            }

            const monsterLines = this.#reportedThresholds.get(monsterKey)!;
            if (!monsterLines.has(line)) {
                monsterLines.set(line, new Set());
            }

            const reportedSet = monsterLines.get(line)!;
            if (reportedSet.has(roundedHpPct)) {
                return {
                    success: false,
                    message: 'Threshold already reported for this monster on this line'
                };
            }

            const pendingKey = `${monsterId}-${line}-${roundedHpPct}`;
            if (!this.#pendingRequests.has(monsterKey)) {
                this.#pendingRequests.set(monsterKey, new Set());
            }
            const pendingSet = this.#pendingRequests.get(monsterKey)!;
            
            if (pendingSet.has(pendingKey)) {
                return {
                    success: false,
                    message: 'Report already in progress for this threshold'
                };
            }

            pendingSet.add(pendingKey);

            try {
                const response = await this.#request('/api/create-hp-report', {
                    method: 'POST',
                    body: JSON.stringify({
                        monster_id: Number(monsterId),
                        hp_pct: roundedHpPct,
                        line: line
                    })
                });

                if (!response.ok) {
                    const error = await response.json();

                    if (response.status === 400 && error.message?.includes('already reported')) {
                        reportedSet.add(roundedHpPct);
                        pendingSet.delete(pendingKey);
                        return {
                            success: false,
                            message: 'Threshold already reported by another user'
                        };
                    }
                    
                    throw new Error(`API Error: ${response.status} - ${error.message || error}`);
                }

                const result = await response.json();

                reportedSet.add(roundedHpPct);
                pendingSet.delete(pendingKey);

                this.#logger.info(`[BPTimer] HP Report sent: Monster ${monsterId} at ${roundedHpPct}% HP (Line ${line})`);

                return {
                    success: true,
                    data: result
                };
            } catch (apiError) {
                pendingSet.delete(pendingKey);
                throw apiError;
            }
        } catch (error) {
            console.error('[BPTimer] Failed to create HP report:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Reset reported thresholds for a specific monster on a specific line
     */
    resetMonster(monsterId: string | number, line?: number): void {
        const monsterKey = String(monsterId);
        if (line !== undefined) {
            const monsterLines = this.#reportedThresholds.get(monsterKey);
            if (monsterLines) {
                monsterLines.delete(line);
                if (monsterLines.size === 0) {
                    this.#reportedThresholds.delete(monsterKey);
                }
            }
        } else {
            this.#reportedThresholds.delete(monsterKey);
        }
    }

    /**
     * Clear all reported thresholds
     */
    clearAll(): void {
        this.#reportedThresholds.clear();
        this.#pendingRequests.clear();
    }
}


let bpTimerInstance: BPTimer | null = null;

export function initialize(logger: Logger, globalSettings?: GlobalSettings): BPTimer {
    console.log('Global Settings in BPTimer initialize:', globalSettings);
    if (!bpTimerInstance) {
        bpTimerInstance = new BPTimer(API_KEY, DB_URL, logger, globalSettings);
    } else if (globalSettings) {
        // Update settings on existing instance
        bpTimerInstance['globalSettings'] = globalSettings;
    }
    return bpTimerInstance;
}

export default BPTimer;
