const mysql = require('mysql2/promise');

class Database {
    constructor() {
        this.connection = null;
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'huddle_user',
            password: process.env.DB_PASSWORD || 'huddle_password',
            database: process.env.DB_NAME || 'huddle_ai',
            port: process.env.DB_PORT || 3306,
            charset: 'utf8mb4',
            timezone: '+00:00',
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true
        };
    }

    async connect() {
        try {
            this.connection = await mysql.createConnection(this.config);
            console.log('✅ Database connected successfully');
            
            // Test the connection
            await this.connection.execute('SELECT 1');
            
            return this.connection;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.end();
            console.log('📴 Database disconnected');
        }
    }

    async execute(query, params = []) {
        try {
            if (!this.connection) {
                await this.connect();
            }
            
            const [rows] = await this.connection.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', error);
            
            // Reconnect on connection errors
            if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
                error.code === 'ECONNRESET' || 
                error.code === 'ENOTFOUND') {
                console.log('🔄 Attempting to reconnect to database...');
                await this.connect();
                const [rows] = await this.connection.execute(query, params);
                return rows;
            }
            
            throw error;
        }
    }

    async query(sql, params = []) {
        return this.execute(sql, params);
    }

    async beginTransaction() {
        if (!this.connection) {
            await this.connect();
        }
        await this.connection.beginTransaction();
    }

    async commit() {
        if (this.connection) {
            await this.connection.commit();
        }
    }

    async rollback() {
        if (this.connection) {
            await this.connection.rollback();
        }
    }

    // Health check
    async isHealthy() {
        try {
            await this.execute('SELECT 1');
            return true;
        } catch (error) {
            return false;
        }
    }

    // Get connection info
    getConfig() {
        return {
            host: this.config.host,
            database: this.config.database,
            user: this.config.user,
            port: this.config.port
        };
    }
}

// Create singleton instance
const database = new Database();

// Auto-connect on require
database.connect().catch(error => {
    console.error('Initial database connection failed:', error.message);
});

module.exports = database;