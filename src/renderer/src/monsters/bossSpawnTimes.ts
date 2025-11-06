export enum SpawnType {
    ON_THE_HOUR = 'ON_THE_HOUR',           // XX:00
    HALF_HOUR = 'HALF_HOUR',               // XX:30
    SPECIFIC_TIMES = 'SPECIFIC_TIMES',     // UTC-2
}

export interface BossSpawnConfig {
    monsterIds: string[];
    spawnType: SpawnType;
    specificTimes?: string[];
}

export const BOSS_SPAWN_CONFIGS: BossSpawnConfig[] = [
    {
        monsterIds: [
            '80006', '10032',  // Golden Juggernaut
            '80004', '10018',  // Inferno Ogre
            '10056',           // Brigand Leader
            '80007', '10059',  // Muku Chief
            '80001', '10007', '61219', '61220', '61221',  // Storm Goblin King
            '10084',  // Celestial Flier
            '8070', '10086', '20028', '20070', '20107', '7700001', '2000134', '2000138', '2004164', '2004169',  // Goblin King
        ],
        spawnType: SpawnType.ON_THE_HOUR,
    },
    {
        monsterIds: [
            '108', '10009', '20100', '20127', '80002', '2000129', '2000140', '2004172',  // Frost Ogre
            '80008', '10069',  // Phantom Arachnocrab
            '80009', '10077',  // Venobzzar Incubator
            '8611', '80010', '10081',  // Iron Fang
            '10010', '20024', '20072', '20092', '80003', '2000131', '2000137',  // Tempest Ogre
            '10085',  // Lizardman King
            '10029', '20027', '20071', '20108', '80005', '81000',  // Muku King
        ],
        spawnType: SpawnType.HALF_HOUR,
    },
    {
        monsterIds: [
            '10902', '10903',  // Lovely Boarlet/Breezy Boarlet
        ],
        spawnType: SpawnType.SPECIFIC_TIMES,
        specificTimes: ['10:00', '14:00', '18:00'], // UTC-2
    },
];

/**
 * Get the next spawn time for a boss
 * @param monsterId The monster ID
 * @returns string
 */
export function getNextSpawnTime(monsterId: string): { time: string; secondsUntil: number } | null {
    const config = BOSS_SPAWN_CONFIGS.find(cfg => cfg.monsterIds.includes(monsterId));
    if (!config) return null;

    const now = new Date();

    if (config.spawnType === SpawnType.ON_THE_HOUR) {
        const nextSpawn = new Date(now);
        nextSpawn.setMinutes(0, 0, 0);

        if (now.getMinutes() >= 0 && now.getSeconds() > 0) {
            nextSpawn.setHours(nextSpawn.getHours() + 1);
        }

        const secondsUntil = Math.floor((nextSpawn.getTime() - now.getTime()) / 1000);
        const timeStr = nextSpawn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        return { time: timeStr, secondsUntil };
    }

    if (config.spawnType === SpawnType.HALF_HOUR) {
        const nextSpawn = new Date(now);

        const currentMinute = now.getMinutes();
        if (currentMinute < 30) {
            nextSpawn.setMinutes(30, 0, 0);
        } else {
            nextSpawn.setHours(nextSpawn.getHours() + 1);
            nextSpawn.setMinutes(30, 0, 0);
        }

        const secondsUntil = Math.floor((nextSpawn.getTime() - now.getTime()) / 1000);
        const timeStr = nextSpawn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        return { time: timeStr, secondsUntil };
    }

    if (config.spawnType === SpawnType.SPECIFIC_TIMES && config.specificTimes) {
        const localOffset = now.getTimezoneOffset();
        const utcMinus2Offset = 120;
        const offsetDiff = localOffset + utcMinus2Offset;

        let nearestSpawn: Date | null = null;

        for (const timeStr of config.specificTimes) {
            const [hours, minutes] = timeStr.split(':').map(Number);

            const spawnDate = new Date(now);
            spawnDate.setHours(hours, minutes, 0, 0);

            spawnDate.setMinutes(spawnDate.getMinutes() - offsetDiff);

            if (spawnDate.getTime() <= now.getTime()) {
                spawnDate.setDate(spawnDate.getDate() + 1);
            }

            if (!nearestSpawn || spawnDate.getTime() < nearestSpawn.getTime()) {
                nearestSpawn = spawnDate;
            }
        }

        if (nearestSpawn) {
            const secondsUntil = Math.floor((nearestSpawn.getTime() - now.getTime()) / 1000);
            const timeStr = nearestSpawn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

            return { time: timeStr, secondsUntil };
        }
    }

    return null;
}

/**
 * Format seconds until spawn as a readable string
 */
export function formatTimeUntilSpawn(secondsUntil: number): string {
    if (secondsUntil < 0) return 'Spawned';
    if (secondsUntil === 0) return 'Now!';

    const hours = Math.floor(secondsUntil / 3600);
    const minutes = Math.floor((secondsUntil % 3600) / 60);
    const seconds = secondsUntil % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}
