import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MeetingList from './meetingList';
import AIProfileList from './AIProfileList';
import { meetingsAPI, aiProfilesAPI } from '../../services/api';
import { Plus, Calendar, Bot, BarChart3, TrendingUp, Users, Clock } from 'lucide-react';

const Dashboard = ({ activeTab, onTabChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [meetings, setMeetings] = useState([]);
  const [aiProfiles, setAiProfiles] = useState([]);
  const [currentTab, setCurrentTab] = useState(activeTab || 'overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Ref to track if data is already being loaded
  const isLoadingRef = useRef(false);
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    // Set tab from navigation state if available
    if (location.state?.activeTab) {
      setCurrentTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    if (onTabChange) {
      onTabChange(currentTab);
    }
  }, [currentTab, onTabChange]);

  // Memoized load data function to prevent unnecessary re-creation
  const loadData = useCallback(async (forceReload = false) => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current && !forceReload) {
      console.log('Data load already in progress, skipping...');
      return;
    }

    // If data is already loaded and this isn't a forced reload, skip
    if (dataLoadedRef.current && !forceReload) {
      console.log('Data already loaded, skipping...');
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError('');
      
      console.log('Loading dashboard data...');
      
      const [meetingsResponse, profilesResponse] = await Promise.all([
        meetingsAPI.getAll(),
        aiProfilesAPI.getAll(),
      ]);
      
      // Remove duplicates using Map to ensure unique entries by ID
      const uniqueMeetings = Array.from(
        new Map(meetingsResponse.data.map(meeting => [meeting.id, meeting])).values()
      );
      
      const uniqueProfiles = Array.from(
        new Map(profilesResponse.data.map(profile => [profile.id, profile])).values()
      );
      
      console.log(`Loaded ${uniqueMeetings.length} meetings and ${uniqueProfiles.length} profiles`);
      
      setMeetings(uniqueMeetings);
      setAiProfiles(uniqueProfiles);
      dataLoadedRef.current = true;
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // Load data only once on component mount
  useEffect(() => {
    loadData();
  }, []); // Empty dependency array to run only once

  // Force reload function for refresh buttons
  const handleRefresh = useCallback(() => {
    dataLoadedRef.current = false;
    loadData(true);
  }, [loadData]);

  const handleCreateMeeting = useCallback(() => {
    navigate('/config');
  }, [navigate]);

  const handleCreateAIProfile = useCallback(() => {
    navigate('/config?type=profile');
  }, [navigate]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'meetings', label: 'Meetings', icon: Calendar },
    { id: 'profiles', label: 'AI Profiles', icon: Bot },
  ];

  const stats = [
    {
      label: 'Total Meetings',
      value: meetings.length,
      icon: Calendar,
      color: 'bg-blue-100 text-blue-800',
      trend: '+12%',
      description: 'from last month'
    },
    {
      label: 'AI Profiles',
      value: aiProfiles.length,
      icon: Bot,
      color: 'bg-green-100 text-green-800',
      trend: '+5%',
      description: 'active profiles'
    },
    {
      label: 'Completed Sessions',
      value: meetings.filter(m => m.status === 'completed').length,
      icon: TrendingUp,
      color: 'bg-purple-100 text-purple-800',
      trend: '+8%',
      description: 'this month'
    },
    {
      label: 'Total Hours',
      value: Math.round(meetings.filter(m => m.status === 'completed').length * 0.5),
      icon: Clock,
      color: 'bg-orange-100 text-orange-800',
      trend: '+15%',
      description: 'coaching time'
    },
  ];

  const recentActivity = [
    {
      action: 'Meeting completed',
      details: 'Sales Training Session with Alex Johnson',
      time: '2 hours ago',
      icon: Calendar,
      color: 'text-green-600'
    },
    {
      action: 'New AI Profile created',
      details: 'Leadership Mentor - Sarah Wilson',
      time: '1 day ago',
      icon: Bot,
      color: 'text-blue-600'
    },
    {
      action: 'Meeting scheduled',
      details: 'Interview Preparation with Mike Davis',
      time: '2 days ago',
      icon: Calendar,
      color: 'text-purple-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
        <p className="text-gray-600 mt-2">Here's what's happening with your AI coaching sessions</p>
      </div>

      {/* Stats Grid */}
      {currentTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                      <div className="flex items-center mt-2">
                        <span className="text-sm text-green-600 font-medium">{stat.trend}</span>
                        <span className="text-sm text-gray-500 ml-1">{stat.description}</span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.color}`}>
                      <Icon size={24} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <h3 className="text-xl font-semibold mb-2">Start a New Session</h3>
              <p className="text-blue-100 mb-4">Begin an AI coaching session with one of your profiles</p>
              <button
                onClick={handleCreateMeeting}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                Start Meeting
              </button>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <h3 className="text-xl font-semibold mb-2">Create AI Coach</h3>
              <p className="text-purple-100 mb-4">Design a new AI coaching assistant for your needs</p>
              <button
                onClick={handleCreateAIProfile}
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors"
              >
                Create Profile
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={index} className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg bg-gray-100 ${activity.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-600">{activity.details}</p>
                    </div>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    currentTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                  {tab.id === 'meetings' && meetings.length > 0 && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                      {meetings.length}
                    </span>
                  )}
                  {tab.id === 'profiles' && aiProfiles.length > 0 && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                      {aiProfiles.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {currentTab === 'meetings' ? 'Your Meetings' : 
               currentTab === 'profiles' ? 'Your AI Profiles' : 'Dashboard Overview'}
            </h2>
            {currentTab !== 'overview' && (
              <div className="flex space-x-3">
                <button
                  onClick={handleRefresh}
                  className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Refresh
                </button>
                <button
                  onClick={currentTab === 'meetings' ? handleCreateMeeting : handleCreateAIProfile}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  <Plus size={18} className="mr-2" />
                  {currentTab === 'meetings' ? 'New Meeting' : 'New Profile'}
                </button>
              </div>
            )}
          </div>

          {currentTab === 'meetings' && (
            <MeetingList meetings={meetings} onRefresh={handleRefresh} />
          )}
          
          {currentTab === 'profiles' && (
            <AIProfileList profiles={aiProfiles} onRefresh={handleRefresh} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;