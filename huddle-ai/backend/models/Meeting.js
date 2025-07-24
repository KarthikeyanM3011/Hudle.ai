const { pool } = require('../config/database');

class Meeting {
    static async create(meetingData) {
        const {
            userId, coachId, title, description, scheduledFor, duration,
            mediaSettings, sessionCustomization, livekit
        } = meetingData;

        const [result] = await pool.execute(
            `INSERT INTO meetings (userId, coachId, title, description, scheduledFor, 
             duration, mediaSettings, sessionCustomization, livekit) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId, coachId, title, description, scheduledFor, duration,
                JSON.stringify(mediaSettings), JSON.stringify(sessionCustomization),
                JSON.stringify(livekit)
            ]
        );
        return result.insertId;
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            `SELECT m.*, c.name as coachName, c.appearance, c.voice 
             FROM meetings m 
             JOIN coaches c ON m.coachId = c.id 
             WHERE m.id = ?`,
            [id]
        );
        if (rows[0]) {
            const meeting = rows[0];
            meeting.mediaSettings = JSON.parse(meeting.mediaSettings || '{}');
            meeting.sessionCustomization = JSON.parse(meeting.sessionCustomization || '{}');
            meeting.livekit = JSON.parse(meeting.livekit || '{}');
            meeting.feedback = JSON.parse(meeting.feedback || '{}');
            meeting.appearance = JSON.parse(meeting.appearance || '{}');
            meeting.voice = JSON.parse(meeting.voice || '{}');
        }
        return rows[0];
    }

    static async findByUserId(userId, limit = 20, offset = 0, status = null) {
        let query = `SELECT m.*, c.name as coachName FROM meetings m 
                     JOIN coaches c ON m.coachId = c.id 
                     WHERE m.userId = ?`;
        let params = [userId];

        if (status) {
            query += ` AND m.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY m.scheduledFor DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await pool.execute(query, params);
        return rows.map(meeting => {
            meeting.mediaSettings = JSON.parse(meeting.mediaSettings || '{}');
            meeting.sessionCustomization = JSON.parse(meeting.sessionCustomization || '{}');
            meeting.livekit = JSON.parse(meeting.livekit || '{}');
            meeting.feedback = JSON.parse(meeting.feedback || '{}');
            return meeting;
        });
    }

    static async updateStatus(id, status) {
        const [result] = await pool.execute(
            'UPDATE meetings SET status = ? WHERE id = ?',
            [status, id]
        );
        return result.affectedRows > 0;
    }

    static async updateRecording(id, recordingPath, transcript = null, summary = null) {
        const [result] = await pool.execute(
            'UPDATE meetings SET recordingPath = ?, transcript = ?, summary = ? WHERE id = ?',
            [recordingPath, transcript, summary, id]
        );
        return result.affectedRows > 0;
    }

    static async addFeedback(id, feedback) {
        const [result] = await pool.execute(
            'UPDATE meetings SET feedback = ? WHERE id = ?',
            [JSON.stringify(feedback), id]
        );
        return result.affectedRows > 0;
    }

    static async getUpcoming(userId, limit = 10) {
        const [rows] = await pool.execute(
            `SELECT m.*, c.name as coachName FROM meetings m 
             JOIN coaches c ON m.coachId = c.id 
             WHERE m.userId = ? AND m.scheduledFor > NOW() AND m.status = 'scheduled' 
             ORDER BY m.scheduledFor ASC LIMIT ?`,
            [userId, limit]
        );
        return rows.map(meeting => {
            meeting.mediaSettings = JSON.parse(meeting.mediaSettings || '{}');
            meeting.sessionCustomization = JSON.parse(meeting.sessionCustomization || '{}');
            meeting.livekit = JSON.parse(meeting.livekit || '{}');
            meeting.feedback = JSON.parse(meeting.feedback || '{}');
            return meeting;
        });
    }

    static async getRecent(userId, limit = 10) {
        const [rows] = await pool.execute(
            `SELECT m.*, c.name as coachName FROM meetings m 
             JOIN coaches c ON m.coachId = c.id 
             WHERE m.userId = ? AND m.status = 'completed' 
             ORDER BY m.scheduledFor DESC LIMIT ?`,
            [userId, limit]
        );
        return rows.map(meeting => {
            meeting.mediaSettings = JSON.parse(meeting.mediaSettings || '{}');
            meeting.sessionCustomization = JSON.parse(meeting.sessionCustomization || '{}');
            meeting.livekit = JSON.parse(meeting.livekit || '{}');
            meeting.feedback = JSON.parse(meeting.feedback || '{}');
            return meeting;
        });
    }

    static async delete(id, userId) {
        const [result] = await pool.execute(
            'DELETE FROM meetings WHERE id = ? AND userId = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    }

    static async getUserStats(userId) {
        const [totalMeetings] = await pool.execute(
            'SELECT COUNT(*) as count FROM meetings WHERE userId = ?',
            [userId]
        );
        const [completedMeetings] = await pool.execute(
            'SELECT COUNT(*) as count FROM meetings WHERE userId = ? AND status = "completed"',
            [userId]
        );
        const [totalTime] = await pool.execute(
            'SELECT SUM(duration) as total FROM meetings WHERE userId = ? AND status = "completed"',
            [userId]
        );

        return {
            totalMeetings: totalMeetings[0].count,
            completedMeetings: completedMeetings[0].count,
            totalMinutes: totalTime[0].total || 0
        };
    }
}

module.exports = Meeting;