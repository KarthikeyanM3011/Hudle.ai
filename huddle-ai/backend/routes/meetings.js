const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Meeting = require('../models/Meeting');
const Coach = require('../models/Coach');
const authMiddleware = require('../middleware/auth');
const { createAccessToken, createRoom } = require('../config/livekit');
const livekitService = require('../services/livekitService');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { coachId, title, description, scheduledFor, duration, mediaSettings, sessionCustomization } = req.body;

        const coach = await Coach.findById(coachId);
        if (!coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        if (coach.userId !== req.userId && !coach.sharing.isPublic) {
            return res.status(403).json({ error: 'Access denied to this coach' });
        }

        const roomId = `meeting-${req.userId}-${Date.now()}-${uuidv4().slice(0, 8)}`;
        
        try {
            await createRoom(roomId, {
                maxParticipants: 2,
                emptyTimeout: 300,
                metadata: {
                    coachId,
                    userId: req.userId,
                    meetingType: 'coaching'
                }
            });
        } catch (error) {
            console.error('Room creation error:', error);
        }

        const userToken = createAccessToken(roomId, `user-${req.userId}`, {
            canPublish: true,
            canSubscribe: true,
            canPublishData: true
        });

        const agentToken = createAccessToken(roomId, `coach-${coachId}`, {
            canPublish: true,
            canSubscribe: true,
            canPublishData: true
        });

        const livekit = {
            roomId,
            userToken,
            agentToken,
            joinUrl: `${process.env.LIVEKIT_URL}`,
            expiresAt: new Date(Date.now() + 10 * 60 * 60 * 1000)
        };

        const meetingData = {
            userId: req.userId,
            coachId,
            title: title || `Session with ${coach.name}`,
            description,
            scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
            duration: duration || 60,
            mediaSettings: mediaSettings || {
                mode: 'avatar',
                userVideo: false,
                coachDisplay: 'avatar',
                recordVideo: false,
                recordAudio: true,
                audioQuality: 'high'
            },
            sessionCustomization: sessionCustomization || {},
            livekit
        };

        const meetingId = await Meeting.create(meetingData);
        const meeting = await Meeting.findById(meetingId);

        await livekitService.notifyAgent({
            roomId,
            coachId,
            coachData: coach,
            agentToken,
            meetingId
        });

        res.status(201).json({ 
            message: 'Meeting created successfully', 
            meeting 
        });
    } catch (error) {
        console.error('Meeting creation error:', error);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { limit = 20, offset = 0, status } = req.query;
        const meetings = await Meeting.findByUserId(
            req.userId, 
            parseInt(limit), 
            parseInt(offset), 
            status
        );
        res.json({ meetings });
    } catch (error) {
        console.error('Meetings fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
});

router.get('/upcoming', authMiddleware, async (req, res) => {
    try {
        const meetings = await Meeting.getUpcoming(req.userId);
        res.json({ meetings });
    } catch (error) {
        console.error('Upcoming meetings fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch upcoming meetings' });
    }
});

router.get('/recent', authMiddleware, async (req, res) => {
    try {
        const meetings = await Meeting.getRecent(req.userId);
        res.json({ meetings });
    } catch (error) {
        console.error('Recent meetings fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch recent meetings' });
    }
});

router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const stats = await Meeting.getUserStats(req.userId);
        res.json({ stats });
    } catch (error) {
        console.error('Meeting stats error:', error);
        res.status(500).json({ error: 'Failed to fetch meeting stats' });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);
        
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        if (meeting.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ meeting });
    } catch (error) {
        console.error('Meeting fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch meeting' });
    }
});

router.post('/:id/join', authMiddleware, async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);
        
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        if (meeting.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (meeting.status === 'completed' || meeting.status === 'cancelled') {
            return res.status(400).json({ error: 'Meeting is not available for joining' });
        }

        await Meeting.updateStatus(req.params.id, 'active');
        await Coach.updateLastUsed(meeting.coachId);
        await Coach.incrementUsage(meeting.coachId);

        const newUserToken = createAccessToken(
            meeting.livekit.roomId, 
            `user-${req.userId}`,
            {
                canPublish: true,
                canSubscribe: true,
                canPublishData: true
            }
        );

        res.json({ 
            message: 'Meeting joined successfully',
            roomId: meeting.livekit.roomId,
            token: newUserToken,
            joinUrl: meeting.livekit.joinUrl,
            coach: {
                name: meeting.coachName,
                appearance: meeting.appearance,
                voice: meeting.voice
            }
        });
    } catch (error) {
        console.error('Meeting join error:', error);
        res.status(500).json({ error: 'Failed to join meeting' });
    }
});

router.post('/:id/end', authMiddleware, async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);
        
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        if (meeting.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await Meeting.updateStatus(req.params.id, 'completed');

        const { feedback, recordingPath, transcript, summary } = req.body;

        if (recordingPath || transcript || summary) {
            await Meeting.updateRecording(req.params.id, recordingPath, transcript, summary);
        }

        if (feedback) {
            await Meeting.addFeedback(req.params.id, feedback);
        }

        res.json({ message: 'Meeting ended successfully' });
    } catch (error) {
        console.error('Meeting end error:', error);
        res.status(500).json({ error: 'Failed to end meeting' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);
        
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        if (meeting.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (meeting.status === 'active') {
            return res.status(400).json({ error: 'Cannot delete active meeting' });
        }

        const deleted = await Meeting.delete(req.params.id, req.userId);
        
        if (!deleted) {
            return res.status(400).json({ error: 'Meeting deletion failed' });
        }

        res.json({ message: 'Meeting deleted successfully' });
    } catch (error) {
        console.error('Meeting deletion error:', error);
        res.status(500).json({ error: 'Failed to delete meeting' });
    }
});

router.post('/:id/feedback', authMiddleware, async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);
        
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        if (meeting.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { rating, comment, improvements } = req.body;
        const feedback = {
            rating,
            comment,
            improvements,
            submittedAt: new Date()
        };

        await Meeting.addFeedback(req.params.id, feedback);
        res.json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('Feedback submission error:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

module.exports = router;