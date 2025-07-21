'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Group } from '@/types/group';
import { GroupMeetingRequest, GroupAvailabilitySlot } from '@/types/groupBooking';
import { UserWithProfile } from '@/lib/userLookup';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  UserGroupIcon,
  MapPinIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

interface GroupBookingFormProps {
  group: Group;
  usersWithProfiles: UserWithProfile[];
  availableSlots: GroupAvailabilitySlot[];
  onBookingSubmit: (request: GroupMeetingRequest) => Promise<void>;
  onCancel: () => void;
}

export default function GroupBookingForm({ 
  group, 
  usersWithProfiles, 
  availableSlots, 
  onBookingSubmit, 
  onCancel 
}: GroupBookingFormProps) {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<GroupAvailabilitySlot | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 60,
    meetingType: 'collective' as 'collective' | 'round-robin',
    location: '',
    meetingLink: '',
    agenda: '',
    requiredAttendees: group.members,
    optionalAttendees: [] as string[]
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Meeting title is required';
    }

    if (!selectedSlot) {
      newErrors.slot = 'Please select a time slot';
    }

    if (formData.duration < 15) {
      newErrors.duration = 'Duration must be at least 15 minutes';
    }

    if (formData.duration > 480) {
      newErrors.duration = 'Duration cannot exceed 8 hours';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedSlot || !userProfile) return;

    setLoading(true);
    try {
      const request: GroupMeetingRequest = {
        groupId: group.id,
        organizerEmail: userProfile.email,
        organizerName: userProfile.displayName,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        preferredDate: selectedSlot.start,
        duration: formData.duration,
        meetingType: formData.meetingType,
        location: formData.location.trim() || undefined,
        meetingLink: formData.meetingLink.trim() || undefined,
        agenda: formData.agenda.trim() || undefined,
        requiredAttendees: formData.requiredAttendees,
        optionalAttendees: formData.optionalAttendees
      };

      await onBookingSubmit(request);
    } catch (error) {
      console.error('Error submitting booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatSlotTime = (slot: GroupAvailabilitySlot) => {
    const start = slot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const end = slot.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = slot.start.toLocaleDateString([], { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
    return `${date} • ${start} - ${end}`;
  };

  const getSlotConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <CalendarDaysIcon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">
                  Schedule Group Meeting
                </CardTitle>
                <p className="text-blue-100 text-sm">
                  {group.name} • {usersWithProfiles.length} members
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={onCancel}
              className="text-white hover:bg-white/20"
            >
              Cancel
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meeting Details */}
        <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DocumentTextIcon className="h-5 w-5 text-blue-500" />
              <span>Meeting Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Meeting Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Weekly Team Standup"
                error={errors.title}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the meeting purpose..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Duration (minutes)
                </label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 60)}
                  min="15"
                  max="480"
                  error={errors.duration}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Meeting Type
                </label>
                <select
                  value={formData.meetingType}
                  onChange={(e) => handleInputChange('meetingType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="collective">Collective (All Members)</option>
                  <option value="round-robin">Round-robin (Assigned Member)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <MapPinIcon className="h-4 w-4 inline mr-1" />
                Location (Optional)
              </label>
              <Input
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., Conference Room A, Office Building"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <VideoCameraIcon className="h-4 w-4 inline mr-1" />
                Meeting Link (Optional)
              </label>
              <Input
                value={formData.meetingLink}
                onChange={(e) => handleInputChange('meetingLink', e.target.value)}
                placeholder="e.g., https://zoom.us/j/123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Agenda (Optional)
              </label>
              <textarea
                value={formData.agenda}
                onChange={(e) => handleInputChange('agenda', e.target.value)}
                placeholder="Meeting agenda items..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Available Time Slots */}
        <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5 text-green-500" />
              <span>Available Time Slots</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {errors.slot && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{errors.slot}</p>
              </div>
            )}
            
            {availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No available time slots found
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Please check member availability settings
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {availableSlots.slice(0, 10).map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                      selectedSlot === slot
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {formatSlotTime(slot)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSlotConfidenceColor(slot.confidence)}`}>
                        {slot.availableMembers.length}/{slot.totalMembers} available
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {slot.confidence === 'high' && 'Excellent availability'}
                      {slot.confidence === 'medium' && 'Good availability'}
                      {slot.confidence === 'low' && 'Limited availability'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submit Button */}
      <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">
                Ready to schedule the meeting?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                All group members will receive email invitations
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={loading || !selectedSlot}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                'Scheduling...'
              ) : (
                <>
                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
