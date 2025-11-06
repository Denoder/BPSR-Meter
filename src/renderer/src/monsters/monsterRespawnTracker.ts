interface MonsterRespawnData {
    monsterId: string;
    averageRespawnTime: number;
    samples: number[];
}

class MonsterRespawnTracker {
    private deathTimes: Map<string, number> = new Map();
    private respawnData: Map<string, MonsterRespawnData> = new Map();
    private readonly MAX_SAMPLES = 5;

    /**
     * Record when a monster dies
     */
    recordDeath(monsterUid: string, monsterId: string): void {
        const now = Date.now();
        this.deathTimes.set(monsterUid, now);

        if (!this.respawnData.has(monsterId)) {
            this.respawnData.set(monsterId, {
                monsterId,
                averageRespawnTime: 0,
                samples: []
            });
        }
    }

    /**
     * Record when a monster respawns and calculate respawn time
     */
    recordRespawn(monsterUid: string, monsterId: string): number | null {
        const deathTime = this.deathTimes.get(monsterUid);
        if (!deathTime) {
            return null;
        }

        const now = Date.now();
        const respawnTime = Math.floor((now - deathTime) / 1000);

        let data = this.respawnData.get(monsterId);
        if (!data) {
            data = {
                monsterId,
                averageRespawnTime: respawnTime,
                samples: [respawnTime]
            };
            this.respawnData.set(monsterId, data);
        } else {
            data.samples.push(respawnTime);

            if (data.samples.length > this.MAX_SAMPLES) {
                data.samples.shift();
            }

            data.averageRespawnTime = Math.floor(
                data.samples.reduce((sum, time) => sum + time, 0) / data.samples.length
            );
        }

        this.deathTimes.delete(monsterUid);

        return respawnTime;
    }

    /**
     * Get the average respawn time for a monster type
     */
    getAverageRespawnTime(monsterId: string): number | null {
        const data = this.respawnData.get(monsterId);
        return data && data.samples.length > 0 ? data.averageRespawnTime : null;
    }

    /**
     * Get estimated time until respawn for a specific monster instance
     */
    getEstimatedRespawnTime(monsterUid: string, monsterId: string): number | null {
        const deathTime = this.deathTimes.get(monsterUid);
        const data = this.respawnData.get(monsterId);

        if (!deathTime || !data || data.samples.length === 0) {
            return null;
        }

        const now = Date.now();
        const timeSinceDeath = Math.floor((now - deathTime) / 1000);
        const estimatedRespawnTime = data.averageRespawnTime - timeSinceDeath;

        return estimatedRespawnTime > 0 ? estimatedRespawnTime : 0;
    }

    /**
     * Check if we have respawn data for a monster type
     */
    hasRespawnData(monsterId: string): boolean {
        const data = this.respawnData.get(monsterId);
        return data !== undefined && data.samples.length > 0;
    }

    /**
     * Clear all tracking data
     */
    clear(): void {
        this.deathTimes.clear();
        this.respawnData.clear();
    }

    /**
     * Get all respawn data
     */
    getAllRespawnData(): Map<string, MonsterRespawnData> {
        return new Map(this.respawnData);
    }
}

export const monsterRespawnTracker = new MonsterRespawnTracker();
