const redis = require('redis');

class RedisClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        
        this.config = {
            url: redisUrl,
            retry_strategy: (options) => {
                if (options.error && options.error.code === 'ECONNREFUSED') {
                    console.error('❌ Redis server connection refused');
                    return new Error('Redis server connection refused');
                }
                if (options.total_retry_time > 1000 * 60 * 60) {
                    console.error('❌ Redis retry time exhausted');
                    return new Error('Retry time exhausted');
                }
                if (options.attempt > 10) {
                    console.error('❌ Redis retry attempts exhausted');
                    return undefined;
                }
                // Reconnect after
                return Math.min(options.attempt * 100, 3000);
            }
        };
    }

    async connect() {
        try {
            this.client = redis.createClient(this.config);
            
            this.client.on('connect', () => {
                console.log('🔄 Connecting to Redis...');
            });
            
            this.client.on('ready', () => {
                console.log('✅ Redis client ready');
                this.isConnected = true;
            });
            
            this.client.on('error', (err) => {
                console.error('❌ Redis Client Error:', err);
                this.isConnected = false;
            });
            
            this.client.on('end', () => {
                console.log('📴 Redis connection ended');
                this.isConnected = false;
            });
            
            this.client.on('reconnecting', () => {
                console.log('🔄 Redis reconnecting...');
            });

            await this.client.connect();
            
            // Test the connection
            await this.client.ping();
            
            return this.client;
        } catch (error) {
            console.error('❌ Redis connection failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.quit();
            console.log('📴 Redis disconnected');
        }
    }

    // Basic operations
    async get(key) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            return await this.client.get(key);
        } catch (error) {
            console.error('Redis GET error:', error);
            return null;
        }
    }

    async set(key, value, expireInSeconds = null) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            
            if (expireInSeconds) {
                return await this.client.setEx(key, expireInSeconds, value);
            } else {
                return await this.client.set(key, value);
            }
        } catch (error) {
            console.error('Redis SET error:', error);
            return false;
        }
    }

    async del(key) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            return await this.client.del(key);
        } catch (error) {
            console.error('Redis DEL error:', error);
            return 0;
        }
    }

    async exists(key) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            return await this.client.exists(key);
        } catch (error) {
            console.error('Redis EXISTS error:', error);
            return 0;
        }
    }

    async expire(key, seconds) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            return await this.client.expire(key, seconds);
        } catch (error) {
            console.error('Redis EXPIRE error:', error);
            return 0;
        }
    }

    // Hash operations
    async hget(key, field) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            return await this.client.hGet(key, field);
        } catch (error) {
            console.error('Redis HGET error:', error);
            return null;
        }
    }

    async hset(key, field, value) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            return await this.client.hSet(key, field, value);
        } catch (error) {
            console.error('Redis HSET error:', error);
            return 0;
        }
    }

    async hgetall(key) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            return await this.client.hGetAll(key);
        } catch (error) {
            console.error('Redis HGETALL error:', error);
            return {};
        }
    }

    // List operations
    async lpush(key, ...values) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            return await this.client.lPush(key, values);
        } catch (error) {
            console.error('Redis LPUSH error:', error);
            return 0;
        }
    }

    async rpush(key, ...values) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            return await this.client.rPush(key, values);
        } catch (error) {
            console.error('Redis RPUSH error:', error);
            return 0;
        }
    }

    async lrange(key, start, stop) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            return await this.client.lRange(key, start, stop);
        } catch (error) {
            console.error('Redis LRANGE error:', error);
            return [];
        }
    }

    async lpop(key) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            return await this.client.lPop(key);
        } catch (error) {
            console.error('Redis LPOP error:', error);
            return null;
        }
    }

    // Session helpers
    async setSession(sessionId, sessionData, expireInSeconds = 86400) {
        const key = `session:${sessionId}`;
        return await this.set(key, JSON.stringify(sessionData), expireInSeconds);
    }

    async getSession(sessionId) {
        const key = `session:${sessionId}`;
        const data = await this.get(key);
        return data ? JSON.parse(data) : null;
    }

    async deleteSession(sessionId) {
        const key = `session:${sessionId}`;
        return await this.del(key);
    }

    // Meeting session helpers
    async addPendingSession(sessionData) {
        return await this.lpush('pending_sessions', JSON.stringify(sessionData));
    }

    async getPendingSessions() {
        const sessions = await this.lrange('pending_sessions', 0, -1);
        return sessions.map(session => JSON.parse(session));
    }

    async removePendingSession() {
        const session = await this.lpop('pending_sessions');
        return session ? JSON.parse(session) : null;
    }

    // Health check
    async isHealthy() {
        try {
            const pong = await this.client.ping();
            return pong === 'PONG';
        } catch (error) {
            return false;
        }
    }

    // Get client info
    getInfo() {
        return {
            isConnected: this.isConnected,
            url: this.config.url
        };
    }
}

// Create singleton instance
const redisClient = new RedisClient();

// Auto-connect on require
redisClient.connect().catch(error => {
    console.error('Initial Redis connection failed:', error.message);
});

module.exports = redisClient;