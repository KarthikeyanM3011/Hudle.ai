import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MeetingRoom from '../meeting/MeetingRoom';
import { meetingsAPI, aiProfilesAPI } from '../../services/api';

const MeetingPage = () => {
  const { uuid } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [aiProfile, setAiProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMeetingData();
  }, [uuid]);

  const loadMeetingData = async () => {
    try {
      setLoading(true);
      const meetingResponse = await meetingsAPI.getByUuid(uuid);
      const meetingData = meetingResponse.data;
      setMeeting(meetingData);

      const profileResponse = await aiProfilesAPI.getById(meetingData.ai_profile_id);
      setAiProfile(profileResponse.data);
    } catch (error) {
      setError('Failed to load meeting data');
      console.error('Error loading meeting:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-white mt-4">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 text-xl">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <MeetingRoom meeting={meeting} aiProfile={aiProfile} />;
};

export default MeetingPage;