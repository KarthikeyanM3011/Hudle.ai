import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatDuration, getStatusColor, truncateText } from '../../utils/helpers';
import { Video, MessageSquare, Calendar, Clock } from 'lucide-react';

const MeetingList = ({ meetings, onRefresh }) => {
  const navigate = useNavigate();

  const handleJoinMeeting = (meeting) => {
    navigate(`/meeting/${meeting.uuid}`);
  };

  const handleOpenChat = (meeting) => {
    navigate(`/meeting/${meeting.uuid}?chat=true`);
  };

  if (meetings.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No meetings</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first AI coaching session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <div
          key={meeting.id}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-medium text-gray-900">
                  {meeting.title}
                </h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    meeting.status
                  )}`}
                >
                  {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                </span>
              </div>
              
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(meeting.created_at)}
                </div>
                
                {meeting.started_at && meeting.ended_at && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDuration(meeting.started_at, meeting.ended_at)}
                  </div>
                )}
              </div>
              
              {meeting.summary && (
                <p className="mt-2 text-sm text-gray-600">
                  {truncateText(meeting.summary, 150)}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-3 ml-4">
              {meeting.status === 'completed' && (
                <button
                  onClick={() => handleOpenChat(meeting)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat
                </button>
              )}
              
              <button
                onClick={() => handleJoinMeeting(meeting)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Video className="h-4 w-4 mr-2" />
                {meeting.status === 'scheduled' ? 'Start' : 
                 meeting.status === 'active' ? 'Join' : 'Review'}
              </button>
            </div>
          </div>
          
          {meeting.key_points && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-1">Key Points:</h4>
              <p className="text-sm text-gray-600">{truncateText(meeting.key_points, 200)}</p>
            </div>
          )}
          
          {meeting.action_items && (
            <div className="mt-2">
              <h4 className="text-sm font-medium text-gray-900 mb-1">Action Items:</h4>
              <p className="text-sm text-gray-600">{truncateText(meeting.action_items, 200)}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MeetingList;