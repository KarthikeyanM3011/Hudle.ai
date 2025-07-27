import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MeetingList from './meetingList';
import AIProfileList from './AIProfileList';
import { meetingsAPI, aiProfilesAPI } from '../../services/api';
import { Plus, Calendar, Bot, BarChart3 } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [aiProfiles, setAiProfiles] = useState([]);
  const [activeTab, setActiveTab] = useState('meetings');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [meetingsResponse, profilesResponse] = await Promise.all([
        meetingsAPI.getAll(),
        aiProfilesAPI.getAll(),
      ]);
      
      setMeetings(meetingsResponse.data);
      setAiProfiles(profilesResponse.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = () => {
    navigate('/config');
  };

  const handleCreateAIProfile = () => {
    navigate('/config?type=profile');
  };

  const tabs = [
    { id: 'meetings', label: 'Meetings', icon: Calendar },
    { id: 'profiles', label: 'AI Profiles', icon: Bot },
  ];

  const stats = [
    {
      label: 'Total Meetings',
      value: meetings.length,
      icon: Calendar,
      color: 'bg-blue-100 text-blue-800',
    },
    {
      label: 'AI Profiles',
      value: aiProfiles.length,
      icon: Bot,
      color: 'bg-green-100 text-green-800',
    },
    {
      label: 'Completed',
      value: meetings.filter(m => m.status === 'completed').length,
      icon: BarChart3,
      color: 'bg-purple-100 text-purple-800',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your AI coaching sessions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {activeTab === 'meetings' ? 'Recent Meetings' : 'AI Profiles'}
            </h2>
            <button
              onClick={activeTab === 'meetings' ? handleCreateMeeting : handleCreateAIProfile}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus size={18} className="mr-2" />
              {activeTab === 'meetings' ? 'New Meeting' : 'New Profile'}
            </button>
          </div>

          {activeTab === 'meetings' ? (
            <MeetingList meetings={meetings} onRefresh={loadData} />
          ) : (
            <AIProfileList profiles={aiProfiles} onRefresh={loadData} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;