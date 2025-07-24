const { pool } = require('../config/database');

class Avatar {
    static async findAll(category = null, style = null, gender = null) {
        let query = 'SELECT * FROM avatars WHERE isActive = TRUE';
        let params = [];

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        if (style) {
            query += ' AND style = ?';
            params.push(style);
        }

        if (gender) {
            query += ' AND gender = ?';
            params.push(gender);
        }

        query += ' ORDER BY isDefault DESC, popularityScore DESC, timesSelected DESC';

        const [rows] = await pool.execute(query, params);
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM avatars WHERE id = ? AND isActive = TRUE',
            [id]
        );
        return rows[0];
    }

    static async create(avatarData) {
        const {
            filename, originalName, url, category, style, gender,
            ethnicity, mood, width, height, format, size, uploadedBy
        } = avatarData;

        const [result] = await pool.execute(
            `INSERT INTO avatars (filename, originalName, url, category, style, 
             gender, ethnicity, mood, width, height, format, size, uploadedBy) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                filename, originalName, url, category, style, gender,
                ethnicity, mood, width, height, format, size, uploadedBy
            ]
        );
        return result.insertId;
    }

    static async incrementSelection(id) {
        const [result] = await pool.execute(
            'UPDATE avatars SET timesSelected = timesSelected + 1 WHERE id = ?',
            [id]
        );

        const [updated] = await pool.execute(
            'SELECT timesSelected FROM avatars WHERE id = ?',
            [id]
        );

        if (updated[0]) {
            const popularity = Math.log(updated[0].timesSelected + 1) * 10;
            await pool.execute(
                'UPDATE avatars SET popularityScore = ? WHERE id = ?',
                [popularity, id]
            );
        }

        return result.affectedRows > 0;
    }

    static async getDefaultAvatars() {
        const [rows] = await pool.execute(
            'SELECT * FROM avatars WHERE isDefault = TRUE AND isActive = TRUE ORDER BY id'
        );
        return rows;
    }

    static async getPopularAvatars(limit = 20) {
        const [rows] = await pool.execute(
            'SELECT * FROM avatars WHERE isActive = TRUE ORDER BY popularityScore DESC LIMIT ?',
            [limit]
        );
        return rows;
    }

    static async getByCategory(category) {
        const [rows] = await pool.execute(
            'SELECT * FROM avatars WHERE category = ? AND isActive = TRUE ORDER BY popularityScore DESC',
            [category]
        );
        return rows;
    }

    static async search(query) {
        const [rows] = await pool.execute(
            `SELECT * FROM avatars WHERE (originalName LIKE ? OR category LIKE ? 
             OR style LIKE ? OR mood LIKE ?) AND isActive = TRUE 
             ORDER BY popularityScore DESC`,
            [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
        );
        return rows;
    }

    static async delete(id, uploadedBy = null) {
        let query = 'UPDATE avatars SET isActive = FALSE WHERE id = ?';
        let params = [id];

        if (uploadedBy) {
            query += ' AND uploadedBy = ?';
            params.push(uploadedBy);
        }

        const [result] = await pool.execute(query, params);
        return result.affectedRows > 0;
    }

    static async getCategories() {
        const [rows] = await pool.execute(
            'SELECT DISTINCT category FROM avatars WHERE isActive = TRUE ORDER BY category'
        );
        return rows.map(row => row.category);
    }

    static async getStyles() {
        const [rows] = await pool.execute(
            'SELECT DISTINCT style FROM avatars WHERE isActive = TRUE ORDER BY style'
        );
        return rows.map(row => row.style);
    }

    static async getUserUploads(userId) {
        const [rows] = await pool.execute(
            'SELECT * FROM avatars WHERE uploadedBy = ? AND isActive = TRUE ORDER BY createdAt DESC',
            [userId]
        );
        return rows;
    }
}

module.exports = Avatar;