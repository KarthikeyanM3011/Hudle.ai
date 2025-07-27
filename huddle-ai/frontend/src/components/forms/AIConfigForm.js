import React, { useState, useEffect, useRef } from 'react';
import { aiProfilesAPI } from '../../services/api';
import { GENDER_OPTIONS, COACH_ROLES, DOMAIN_EXPERTISE, normalizeGender } from '../../utils/constants';
import { Upload, X, FileText } from 'lucide-react';

const AIConfigForm = ({ profileId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    coach_name: '',
    coach_role: '',
    coach_description: '',
    domain_expertise: '',
    gender: 'MALE',
    user_notes: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingFile, setExistingFile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Refs to prevent multiple submissions
  const submitButtonRef = useRef(null);
  const lastSubmissionRef = useRef(0);

  useEffect(() => {
    if (profileId) {
      loadProfile();
    }
  }, [profileId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await aiProfilesAPI.getById(profileId);
      const profile = response.data;
      
      // Normalize gender when loading
      const normalizedGender = normalizeGender(profile.gender);
      
      setFormData({
        coach_name: profile.coach_name,
        coach_role: profile.coach_role,
        coach_description: profile.coach_description,
        domain_expertise: profile.domain_expertise,
        gender: normalizedGender,
        user_notes: profile.user_notes || '',
      });
      setExistingFile(profile.pdf_filename || '');
      setIsEditing(true);
    } catch (error) {
      setError('Failed to load profile');
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    let value = e.target.value;
    
    // Normalize gender if it's the gender field
    if (e.target.name === 'gender') {
      value = normalizeGender(value);
    }
    
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setExistingFile('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple rapid submissions
    const now = Date.now();
    if (now - lastSubmissionRef.current < 2000) { // 2 second cooldown
      console.log('Submission blocked - too rapid');
      return;
    }
    
    if (submitting) {
      console.log('Submission blocked - already submitting');
      return;
    }

    lastSubmissionRef.current = now;
    setSubmitting(true);
    setLoading(true);
    setError('');

    // Disable submit button
    if (submitButtonRef.current) {
      submitButtonRef.current.disabled = true;
    }

    try {
      // Validate required fields
      if (!formData.coach_name.trim()) {
        throw new Error('Coach name is required');
      }
      if (!formData.coach_role.trim()) {
        throw new Error('Coach role is required');
      }
      if (!formData.coach_description.trim()) {
        throw new Error('Coach description is required');
      }
      if (!formData.domain_expertise.trim()) {
        throw new Error('Domain expertise is required');
      }

      // Ensure gender is normalized before sending
      const submissionData = {
        ...formData,
        gender: normalizeGender(formData.gender)
      };

      let savedProfile;
      
      if (isEditing) {
        console.log('Updating profile:', profileId);
        const response = await aiProfilesAPI.update(profileId, submissionData);
        savedProfile = response.data;
      } else {
        console.log('Creating new profile');
        const response = await aiProfilesAPI.create(submissionData);
        savedProfile = response.data;
      }

      // Upload PDF if selected
      if (selectedFile && savedProfile) {
        console.log('Uploading PDF...');
        await aiProfilesAPI.uploadPdf(savedProfile.id, selectedFile);
      }

      console.log('Profile saved successfully');
      onSuccess();
      
    } catch (error) {
      console.error('Profile save error:', error);
      setError(error.response?.data?.detail || error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
      setSubmitting(false);
      
      // Re-enable submit button after a delay
      setTimeout(() => {
        if (submitButtonRef.current) {
          submitButtonRef.current.disabled = false;
        }
      }, 1000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="coach_name" className="block text-sm font-medium text-gray-700">
            Coach Name *
          </label>
          <input
            type="text"
            id="coach_name"
            name="coach_name"
            required
            value={formData.coach_name}
            onChange={handleChange}
            disabled={loading || submitting}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
            placeholder="e.g., Dr. Sarah Johnson"
          />
        </div>

        <div>
          <label htmlFor="coach_role" className="block text-sm font-medium text-gray-700">
            Coach Role *
          </label>
          <select
            id="coach_role"
            name="coach_role"
            required
            value={formData.coach_role}
            onChange={handleChange}
            disabled={loading || submitting}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
          >
            <option value="">Select a role</option>
            {COACH_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="domain_expertise" className="block text-sm font-medium text-gray-700">
            Domain Expertise *
          </label>
          <select
            id="domain_expertise"
            name="domain_expertise"
            required
            value={formData.domain_expertise}
            onChange={handleChange}
            disabled={loading || submitting}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
          >
            <option value="">Select expertise</option>
            {DOMAIN_EXPERTISE.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
            Gender (for voice) *
          </label>
          <select
            id="gender"
            name="gender"
            required
            value={formData.gender}
            onChange={handleChange}
            disabled={loading || submitting}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
          >
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="coach_description" className="block text-sm font-medium text-gray-700">
          Coach Description *
        </label>
        <textarea
          id="coach_description"
          name="coach_description"
          required
          rows={4}
          value={formData.coach_description}
          onChange={handleChange}
          disabled={loading || submitting}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
          placeholder="Describe the coach's personality, behavior, and coaching style..."
        />
      </div>

      <div>
        <label htmlFor="user_notes" className="block text-sm font-medium text-gray-700">
          User Notes (Private)
        </label>
        <textarea
          id="user_notes"
          name="user_notes"
          rows={3}
          value={formData.user_notes}
          onChange={handleChange}
          disabled={loading || submitting}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
          placeholder="Private notes for your reference..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Knowledge Base (PDF Upload)
        </label>
        
        {(existingFile || selectedFile) && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-700">
                {selectedFile ? selectedFile.name : existingFile}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              disabled={loading || submitting}
              className="text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>
        )}
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <div className="mt-2">
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <span className="text-sm text-primary-600 hover:text-primary-500">
                  Click to upload a PDF
                </span>
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  disabled={loading || submitting}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Upload a PDF to give your AI coach additional knowledge
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading || submitting}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          ref={submitButtonRef}
          type="submit"
          disabled={loading || submitting}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : loading ? 'Loading...' : isEditing ? 'Update Profile' : 'Create Profile'}
        </button>
      </div>
    </form>
  );
};

export default AIConfigForm;