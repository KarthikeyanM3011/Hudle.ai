import React, { useState, useEffect } from 'react';
import { meetingsAPI, aiProfilesAPI } from '../../services/api';
import { Calendar, Clock } from 'lucide-react';

const MeetingForm = ({ selectedProfileId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    ai_profile_id: selectedProfileId || '',
    scheduled_at: '',
  });
  const [aiProfiles, setAiProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAIProfiles();
  }, []);

  const loadAIProfiles = async () => {
    try {
      const response = await aiProfilesAPI.getAll();
      setAiProfiles(response.data);
    } catch (error) {
      setError('Failed to load AI profiles');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const meetingData = {
        ...formData,
        ai_profile_id: parseInt(formData.ai_profile_id),
        scheduled_at: formData.scheduled_at || null,
      };

      await meetingsAPI.create(meetingData);
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const generateDefaultTitle = () => {
    const selectedProfile = aiProfiles.find(p => p.id.toString() === formData.ai_profile_id);
    if (selectedProfile) {
      const now = new Date();
      const dateStr = now.toLocaleDateString();
      return `${selectedProfile.coach_role} Session - ${dateStr}`;
    }
    return '';
  };

  useEffect(() => {
    if (formData.ai_profile_id && !formData.title) {
      setFormData(prev => ({
        ...prev,
        title: generateDefaultTitle(),
      }));
    }
  }, [formData.ai_profile_id, aiProfiles]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Meeting Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          value={formData.title}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          placeholder="Enter meeting title"
        />
      </div>

      <div>
        <label htmlFor="ai_profile_id" className="block text-sm font-medium text-gray-700">
          AI Coach Profile *
        </label>
        <select
          id="ai_profile_id"
          name="ai_profile_id"
          required
          value={formData.ai_profile_id}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Select an AI coach</option>
          {aiProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.coach_name} - {profile.coach_role}
            </option>
          ))}
        </select>
        {aiProfiles.length === 0 && (
          <p className="mt-1 text-sm text-red-600">
            No AI profiles available. Please create one first.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-700">
          Schedule Meeting (Optional)
        </label>
        <div className="mt-1 relative">
          <input
            type="datetime-local"
            id="scheduled_at"
            name="scheduled_at"
            value={formData.scheduled_at}
            onChange={handleChange}
            min={new Date().toISOString().slice(0, 16)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 pr-10"
          />
          <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Leave empty to start the meeting immediately
        </p>
      </div>

      {formData.ai_profile_id && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Selected Coach Preview</h4>
          {(() => {
            const selectedProfile = aiProfiles.find(p => p.id.toString() === formData.ai_profile_id);
            return selectedProfile ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                    {selectedProfile.coach_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      {selectedProfile.coach_name}
                    </p>
                    <p className="text-xs text-blue-700">
                      {selectedProfile.coach_role} • {selectedProfile.domain_expertise}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-blue-800">
                  {selectedProfile.coach_description.length > 150
                    ? selectedProfile.coach_description.substring(0, 150) + '...'
                    : selectedProfile.coach_description}
                </p>
              </div>
            ) : null;
          })()}
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || aiProfiles.length === 0}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : formData.scheduled_at ? 'Schedule Meeting' : 'Start Now'}
        </button>
      </div>
    </form>
  );
};

export default MeetingForm;