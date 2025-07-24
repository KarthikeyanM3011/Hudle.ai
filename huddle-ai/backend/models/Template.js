const { pool } = require('../config/database');

class Template {
    static async findAll(category = null, difficulty = null) {
        let query = 'SELECT * FROM coach_templates WHERE isActive = TRUE';
        let params = [];

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        if (difficulty) {
            query += ' AND difficulty = ?';
            params.push(difficulty);
        }

        query += ' ORDER BY timesUsed DESC, name ASC';

        const [rows] = await pool.execute(query, params);
        return rows.map(template => {
            template.defaultPersonality = JSON.parse(template.defaultPersonality || '{}');
            template.defaultExpertise = JSON.parse(template.defaultExpertise || '{}');
            template.variableFields = JSON.parse(template.variableFields || '[]');
            template.requiredFields = JSON.parse(template.requiredFields || '[]');
            template.recommendedAvatars = JSON.parse(template.recommendedAvatars || '[]');
            template.recommendedVoices = JSON.parse(template.recommendedVoices || '[]');
            return template;
        });
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM coach_templates WHERE id = ? AND isActive = TRUE',
            [id]
        );
        if (rows[0]) {
            const template = rows[0];
            template.defaultPersonality = JSON.parse(template.defaultPersonality || '{}');
            template.defaultExpertise = JSON.parse(template.defaultExpertise || '{}');
            template.variableFields = JSON.parse(template.variableFields || '[]');
            template.requiredFields = JSON.parse(template.requiredFields || '[]');
            template.recommendedAvatars = JSON.parse(template.recommendedAvatars || '[]');
            template.recommendedVoices = JSON.parse(template.recommendedVoices || '[]');
        }
        return rows[0];
    }

    static async findByCategory(category) {
        const [rows] = await pool.execute(
            'SELECT * FROM coach_templates WHERE category = ? AND isActive = TRUE ORDER BY timesUsed DESC',
            [category]
        );
        return rows.map(template => {
            template.defaultPersonality = JSON.parse(template.defaultPersonality || '{}');
            template.defaultExpertise = JSON.parse(template.defaultExpertise || '{}');
            template.variableFields = JSON.parse(template.variableFields || '[]');
            template.requiredFields = JSON.parse(template.requiredFields || '[]');
            template.recommendedAvatars = JSON.parse(template.recommendedAvatars || '[]');
            template.recommendedVoices = JSON.parse(template.recommendedVoices || '[]');
            return template;
        });
    }

    static async incrementUsage(id) {
        const [result] = await pool.execute(
            'UPDATE coach_templates SET timesUsed = timesUsed + 1 WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    static async updateRating(id, rating) {
        const [current] = await pool.execute(
            'SELECT avgRating, timesUsed FROM coach_templates WHERE id = ?',
            [id]
        );

        if (current[0]) {
            const currentRating = current[0].avgRating || 0;
            const timesUsed = current[0].timesUsed || 1;
            const newRating = ((currentRating * (timesUsed - 1)) + rating) / timesUsed;

            const [result] = await pool.execute(
                'UPDATE coach_templates SET avgRating = ? WHERE id = ?',
                [newRating, id]
            );
            return result.affectedRows > 0;
        }
        return false;
    }

    static async getCategories() {
        const [rows] = await pool.execute(
            'SELECT DISTINCT category FROM coach_templates WHERE isActive = TRUE ORDER BY category'
        );
        return rows.map(row => row.category);
    }

    static async getPopular(limit = 10) {
        const [rows] = await pool.execute(
            'SELECT * FROM coach_templates WHERE isActive = TRUE ORDER BY timesUsed DESC, avgRating DESC LIMIT ?',
            [limit]
        );
        return rows.map(template => {
            template.defaultPersonality = JSON.parse(template.defaultPersonality || '{}');
            template.defaultExpertise = JSON.parse(template.defaultExpertise || '{}');
            template.variableFields = JSON.parse(template.variableFields || '[]');
            template.requiredFields = JSON.parse(template.requiredFields || '[]');
            template.recommendedAvatars = JSON.parse(template.recommendedAvatars || '[]');
            template.recommendedVoices = JSON.parse(template.recommendedVoices || '[]');
            return template;
        });
    }

    static async search(query) {
        const [rows] = await pool.execute(
            'SELECT * FROM coach_templates WHERE (name LIKE ? OR description LIKE ?) AND isActive = TRUE ORDER BY timesUsed DESC',
            [`%${query}%`, `%${query}%`]
        );
        return rows.map(template => {
            template.defaultPersonality = JSON.parse(template.defaultPersonality || '{}');
            template.defaultExpertise = JSON.parse(template.defaultExpertise || '{}');
            template.variableFields = JSON.parse(template.variableFields || '[]');
            template.requiredFields = JSON.parse(template.requiredFields || '[]');
            template.recommendedAvatars = JSON.parse(template.recommendedAvatars || '[]');
            template.recommendedVoices = JSON.parse(template.recommendedVoices || '[]');
            return template;
        });
    }
}

module.exports = Template;