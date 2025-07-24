const { pool } = require('../config/database');

class Coach {
    static async create(coachData) {
        const {
            userId, name, description, creationType, baseTemplateId,
            personality, expertise, appearance, voice, systemPrompts,
            stats = {}, sharing = {}
        } = coachData;

        const [result] = await pool.execute(
            `INSERT INTO coaches (userId, name, description, creationType, baseTemplateId, 
             personality, expertise, appearance, voice, systemPrompts, stats, sharing) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId, name, description, creationType, baseTemplateId,
                JSON.stringify(personality), JSON.stringify(expertise),
                JSON.stringify(appearance), JSON.stringify(voice),
                JSON.stringify(systemPrompts), JSON.stringify(stats),
                JSON.stringify(sharing)
            ]
        );
        return result.insertId;
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM coaches WHERE id = ?',
            [id]
        );
        if (rows[0]) {
            const coach = rows[0];
            coach.personality = JSON.parse(coach.personality || '{}');
            coach.expertise = JSON.parse(coach.expertise || '{}');
            coach.appearance = JSON.parse(coach.appearance || '{}');
            coach.voice = JSON.parse(coach.voice || '{}');
            coach.systemPrompts = JSON.parse(coach.systemPrompts || '{}');
            coach.stats = JSON.parse(coach.stats || '{}');
            coach.sharing = JSON.parse(coach.sharing || '{}');
        }
        return rows[0];
    }

    static async findByUserId(userId, limit = 50, offset = 0) {
        const [rows] = await pool.execute(
            'SELECT * FROM coaches WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
            [userId, limit, offset]
        );
        return rows.map(coach => {
            coach.personality = JSON.parse(coach.personality || '{}');
            coach.expertise = JSON.parse(coach.expertise || '{}');
            coach.appearance = JSON.parse(coach.appearance || '{}');
            coach.voice = JSON.parse(coach.voice || '{}');
            coach.systemPrompts = JSON.parse(coach.systemPrompts || '{}');
            coach.stats = JSON.parse(coach.stats || '{}');
            coach.sharing = JSON.parse(coach.sharing || '{}');
            return coach;
        });
    }

    static async update(id, coachData) {
        const {
            name, description, personality, expertise, appearance,
            voice, systemPrompts, stats, sharing
        } = coachData;

        const [result] = await pool.execute(
            `UPDATE coaches SET name = ?, description = ?, personality = ?, 
             expertise = ?, appearance = ?, voice = ?, systemPrompts = ?, 
             stats = ?, sharing = ? WHERE id = ?`,
            [
                name, description, JSON.stringify(personality),
                JSON.stringify(expertise), JSON.stringify(appearance),
                JSON.stringify(voice), JSON.stringify(systemPrompts),
                JSON.stringify(stats), JSON.stringify(sharing), id
            ]
        );
        return result.affectedRows > 0;
    }

    static async delete(id, userId) {
        const [result] = await pool.execute(
            'DELETE FROM coaches WHERE id = ? AND userId = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    }

    static async updateLastUsed(id) {
        const [result] = await pool.execute(
            'UPDATE coaches SET lastUsed = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    static async incrementUsage(id) {
        const [result] = await pool.execute(
            `UPDATE coaches SET stats = JSON_SET(stats, '$.totalSessions', 
             COALESCE(JSON_EXTRACT(stats, '$.totalSessions'), 0) + 1) WHERE id = ?`,
            [id]
        );
        return result.affectedRows > 0;
    }

    static async getPublicCoaches(limit = 20, offset = 0, category = null) {
        let query = `SELECT c.*, u.firstName, u.lastName FROM coaches c 
                     JOIN users u ON c.userId = u.id 
                     WHERE JSON_EXTRACT(c.sharing, '$.isPublic') = true`;
        let params = [];

        if (category) {
            query += ` AND JSON_EXTRACT(c.expertise, '$.primaryDomain') = ?`;
            params.push(category);
        }

        query += ` ORDER BY JSON_EXTRACT(c.stats, '$.avgRating') DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await pool.execute(query, params);
        return rows.map(coach => {
            coach.personality = JSON.parse(coach.personality || '{}');
            coach.expertise = JSON.parse(coach.expertise || '{}');
            coach.appearance = JSON.parse(coach.appearance || '{}');
            coach.voice = JSON.parse(coach.voice || '{}');
            coach.systemPrompts = JSON.parse(coach.systemPrompts || '{}');
            coach.stats = JSON.parse(coach.stats || '{}');
            coach.sharing = JSON.parse(coach.sharing || '{}');
            return coach;
        });
    }

    static async search(query, userId = null) {
        let sql = `SELECT * FROM coaches WHERE (name LIKE ? OR description LIKE ?)`;
        let params = [`%${query}%`, `%${query}%`];

        if (userId) {
            sql += ` AND userId = ?`;
            params.push(userId);
        } else {
            sql += ` AND JSON_EXTRACT(sharing, '$.isPublic') = true`;
        }

        sql += ` ORDER BY createdAt DESC LIMIT 20`;

        const [rows] = await pool.execute(sql, params);
        return rows.map(coach => {
            coach.personality = JSON.parse(coach.personality || '{}');
            coach.expertise = JSON.parse(coach.expertise || '{}');
            coach.appearance = JSON.parse(coach.appearance || '{}');
            coach.voice = JSON.parse(coach.voice || '{}');
            coach.systemPrompts = JSON.parse(coach.systemPrompts || '{}');
            coach.stats = JSON.parse(coach.stats || '{}');
            coach.sharing = JSON.parse(coach.sharing || '{}');
            return coach;
        });
    }
}

module.exports = Coach;