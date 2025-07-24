const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async create({ email, password, firstName, lastName, avatar = null }) {
        const hashedPassword = await bcrypt.hash(password, 12);
        const [result] = await pool.execute(
            'INSERT INTO users (email, password, firstName, lastName, avatar) VALUES (?, ?, ?, ?, ?)',
            [email, hashedPassword, firstName, lastName, avatar]
        );
        return result.insertId;
    }

    static async findByEmail(email) {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE email = ? AND isActive = TRUE',
            [email]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT id, email, firstName, lastName, avatar, createdAt FROM users WHERE id = ? AND isActive = TRUE',
            [id]
        );
        return rows[0];
    }

    static async updateProfile(id, { firstName, lastName, avatar }) {
        const [result] = await pool.execute(
            'UPDATE users SET firstName = ?, lastName = ?, avatar = ? WHERE id = ?',
            [firstName, lastName, avatar, id]
        );
        return result.affectedRows > 0;
    }

    static async updatePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        const [result] = await pool.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, id]
        );
        return result.affectedRows > 0;
    }

    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    static async delete(id) {
        const [result] = await pool.execute(
            'UPDATE users SET isActive = FALSE WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    static async getStats(id) {
        const [coachCount] = await pool.execute(
            'SELECT COUNT(*) as count FROM coaches WHERE userId = ?',
            [id]
        );
        const [meetingCount] = await pool.execute(
            'SELECT COUNT(*) as count FROM meetings WHERE userId = ?',
            [id]
        );
        const [totalMinutes] = await pool.execute(
            'SELECT SUM(duration) as total FROM meetings WHERE userId = ? AND status = "completed"',
            [id]
        );
        
        return {
            totalCoaches: coachCount[0].count,
            totalMeetings: meetingCount[0].count,
            totalMinutes: totalMinutes[0].total || 0
        };
    }
}

module.exports = User;