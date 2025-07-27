import React from 'react';
import { useNavigate } from 'react-router-dom';
import { aiProfilesAPI } from '../../services/api';
import { formatDate, truncateText } from '../../utils/helpers';
import { Bot, Edit, Trash2, FileText, User } from 'lucide-react';

const AIProfileList = ({ profiles, onRefresh }) => {
  const navigate = useNavigate();

  const handleEditProfile = (profile) => {
    navigate(`/config?type=profile&id=${profile.id}`);
  };

  const handleDeleteProfile = async (profile) => {
    if (window.confirm(`Are you sure you want to delete "${profile.coach_name}"?`)) {
      try {
        await aiProfilesAPI.delete(profile.id);
        onRefresh();
      } catch (error) {
        console.error('Failed to delete profile:', error);
      }
    }
  };

  const handleCreateMeeting = (profile) => {
    navigate(`/config?profileId=${profile.id}`);
  };

  if (profiles.length === 0) {
    return (
      <div className="text-center py-12">
        <Bot className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No AI profiles</h3>
        <p className="mt-1 text-sm text-gray-500">
          Create your first AI coach profile to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {profiles.map((profile) => (
        <div
          key={profile.id}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                {profile.coach_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {profile.coach_name}
                </h3>
                <p className="text-sm text-gray-600">{profile.coach_role}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleEditProfile(profile)}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Edit Profile"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => handleDeleteProfile(profile)}
                className="p-2 text-gray-400 hover:text-red-600"
                title="Delete Profile"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">
                {truncateText(profile.coach_description, 100)}
              </p>
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                {profile.gender}
              </div>
              
              {profile.pdf_filename && (
                <div className="flex items-center">
                  <FileText className="h-3 w-3 mr-1" />
                  PDF attached
                </div>
              )}
            </div>
            
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {profile.domain_expertise}
              </span>
            </div>
            
            <div className="text-xs text-gray-500">
              Created {formatDate(profile.created_at)}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => handleCreateMeeting(profile)}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Start Meeting
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AIProfileList;