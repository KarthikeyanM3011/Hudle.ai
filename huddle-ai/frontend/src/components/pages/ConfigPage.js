import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../common/Header';
import AIConfigForm from '../forms/AIConfigForm';
import MeetingForm from '../forms/MeetingForm';
import { Bot, Calendar, ArrowLeft } from 'lucide-react';

const ConfigPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  
  const type = searchParams.get('type');
  const profileId = searchParams.get('id');
  const selectedProfileId = searchParams.get('profileId');
  
  const isProfileOnly = type === 'profile';
  const isEditing = profileId !== null;

  const handleProfileSuccess = () => {
    if (isProfileOnly || isEditing) {
      navigate('/dashboard');
    } else {
      setCurrentStep(2);
    }
  };

  const handleMeetingSuccess = () => {
    navigate('/dashboard');
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  const renderHeader = () => {
    if (isProfileOnly) {
      return isEditing ? 'Edit AI Coach Profile' : 'Create AI Coach Profile';
    }
    if (selectedProfileId) {
      return 'Schedule New Meeting';
    }
    return currentStep === 1 ? 'Create AI Coach Profile' : 'Schedule Meeting';
  };

  const renderSubheader = () => {
    if (isProfileOnly) {
      return isEditing ? 'Update your AI coach settings' : 'Configure your new AI coaching assistant';
    }
    if (selectedProfileId) {
      return 'Set up a new coaching session';
    }
    return currentStep === 1 
      ? 'First, create an AI coach profile for your meeting'
      : 'Now, schedule your coaching session';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center space-x-3 mb-2">
            {(isProfileOnly || currentStep === 1) && <Bot className="h-8 w-8 text-primary-600" />}
            {(selectedProfileId || currentStep === 2) && <Calendar className="h-8 w-8 text-primary-600" />}
            <h1 className="text-3xl font-bold text-gray-900">{renderHeader()}</h1>
          </div>
          <p className="text-gray-600">{renderSubheader()}</p>
        </div>

        {!isProfileOnly && !selectedProfileId && (
          <div className="mb-8">
            <nav className="flex space-x-4">
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                currentStep === 1 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
              }`}>
                <Bot size={18} />
                <span>1. Create AI Profile</span>
              </div>
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                currentStep === 2 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
              }`}>
                <Calendar size={18} />
                <span>2. Schedule Meeting</span>
              </div>
            </nav>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          {(isProfileOnly || currentStep === 1) && (
            <AIConfigForm
              profileId={profileId}
              onSuccess={handleProfileSuccess}
              onCancel={handleCancel}
            />
          )}
          
          {(selectedProfileId || currentStep === 2) && (
            <MeetingForm
              selectedProfileId={selectedProfileId}
              onSuccess={handleMeetingSuccess}
              onCancel={isProfileOnly ? handleCancel : () => setCurrentStep(1)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigPage;