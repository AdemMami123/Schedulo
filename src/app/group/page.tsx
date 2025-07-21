'use client';

import { useEffect, useState } from 'react';
import { createGroup } from '@/lib/groups';
import { Group } from '@/types/group';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ResponsiveGrid } from '@/components/ui/ResponsiveGrid';
import GroupAvailability from '@/components/dashboard/GroupAvailability';
import { Users, X } from 'lucide-react';
import {
  UserGroupIcon,
  CalendarDaysIcon,
  ClockIcon,
  PlusIcon,
  EyeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getUsersByEmails, UserWithProfile } from '@/lib/userLookup';

export default function GroupsPage() {
  const { userProfile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [usersWithProfiles, setUsersWithProfiles] = useState<UserWithProfile[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'availability'>('list');
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(false);

  const fetchGroups = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'groups'));
      const fetchedGroups: Group[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Group[];
      setGroups(fetchedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchUserProfiles = async () => {
    try {
      setProfilesLoading(true);

      // Get all unique member emails from all groups
      const allMemberEmails = new Set<string>();
      groups.forEach(group => {
        if (Array.isArray(group.members)) {
          group.members.forEach(email => allMemberEmails.add(email));
        }
      });

      if (allMemberEmails.size === 0) {
        setUsersWithProfiles([]);
        return;
      }

      // Use the new user lookup utility
      const usersWithProfiles = await getUsersByEmails(Array.from(allMemberEmails));
      setUsersWithProfiles(usersWithProfiles);
    } catch (error) {
      console.error('Error fetching user profiles:', error);
    } finally {
      setProfilesLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // Fetch profiles after groups are loaded
  useEffect(() => {
    if (groups.length > 0) {
      fetchUserProfiles();
    }
  }, [groups]);

  const handleAddMember = () => {
    if (emailInput && !members.includes(emailInput)) {
      setMembers([...members, emailInput]);
      setEmailInput('');
    }
  };

  const handleCreateGroup = async () => {
    if (!userProfile?.id) return;

    setLoading(true);
    try {
      await createGroup(groupName, members, userProfile.id);
      setOpen(false);
      setGroupName('');
      setMembers([]);
      await fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Card className="border-0 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <UserGroupIcon className="h-8 w-8" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-white">
                      Group Management
                    </CardTitle>
                    <p className="text-blue-100 text-sm">
                      Manage your groups and view collective availability
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="text-white border-white/20 hover:bg-white/20"
                  >
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    Groups
                  </Button>
                  <Button
                    variant={viewMode === 'availability' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('availability')}
                    className="text-white border-white/20 hover:bg-white/20"
                    disabled={!selectedGroup}
                  >
                    <CalendarDaysIcon className="h-4 w-4 mr-2" />
                    Availability
                  </Button>
                  <Button
                    onClick={() => setOpen(true)}
                    className="bg-white text-blue-600 hover:bg-blue-50"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {viewMode === 'list' ? (
            <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserGroupIcon className="h-5 w-5 text-blue-500" />
                  <span>Your Groups</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {groups.length > 0 ? (
                  <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="normal">
                    {groups.map((group, idx) => {
                      const gradients = [
                        'from-blue-500 to-blue-600',
                        'from-green-500 to-green-600',
                        'from-purple-500 to-purple-600',
                        'from-pink-500 to-pink-600',
                        'from-yellow-500 to-yellow-600',
                        'from-teal-500 to-teal-600',
                      ];
                      const gradient = gradients[idx % gradients.length];

                      return (
                        <Card
                          key={group.id}
                          className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                          onClick={() => {
                            setSelectedGroup(group);
                            setViewMode('availability');
                          }}
                        >
                          <CardHeader className={`bg-gradient-to-r ${gradient} text-white rounded-t-xl`}>
                            <CardTitle className="text-lg font-bold">
                              {group.name}
                            </CardTitle>
                            <p className="text-white/80 text-sm">
                              {Array.isArray(group.members) ? group.members.length : 0} member{Array.isArray(group.members) && group.members.length !== 1 ? 's' : ''}
                            </p>
                          </CardHeader>
                          <CardContent className="p-4">
                            {Array.isArray(group.members) && group.members.length > 0 ? (
                              <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                  {group.members.slice(0, 3).map((email: string) => (
                                    <span
                                      key={email}
                                      className="bg-slate-100 dark:bg-slate-700 text-sm px-3 py-1 rounded-full text-slate-700 dark:text-slate-300"
                                    >
                                      {email.split('@')[0]}
                                    </span>
                                  ))}
                                  {group.members.length > 3 && (
                                    <span className="bg-slate-200 dark:bg-slate-600 text-sm px-3 py-1 rounded-full text-slate-600 dark:text-slate-400">
                                      +{group.members.length - 3} more
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-600">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedGroup(group);
                                      setViewMode('availability');
                                    }}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <EyeIcon className="h-4 w-4 mr-1" />
                                    View Availability
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-slate-600 hover:text-slate-700"
                                  >
                                    <Cog6ToothIcon className="h-4 w-4 mr-1" />
                                    Settings
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-4">
                                No members added yet
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </ResponsiveGrid>
                ) : (
                  <div className="text-center py-12">
                    <UserGroupIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No groups yet
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                      Create your first group to start managing team availability
                    </p>
                    <Button onClick={() => setOpen(true)} className="mx-auto">
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create Your First Group
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : selectedGroup ? (
            <div className="space-y-6">
              <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      onClick={() => setViewMode('list')}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      ← Back to Groups
                    </Button>
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {selectedGroup.name}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Group Availability Overview
                      </p>
                    </div>
                    <div></div>
                  </div>
                </CardContent>
              </Card>

              {profilesLoading ? (
                <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
                  <CardContent className="p-12 text-center">
                    <ClockIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-500 dark:text-gray-400">Loading member profiles...</p>
                  </CardContent>
                </Card>
              ) : (
                <GroupAvailability
                  group={selectedGroup}
                  profiles={usersWithProfiles.map(uwp => ({
                    ...uwp.profile!,
                    memberEmail: uwp.email
                  })).filter(p => p.id)} // Only include users with profiles
                  mode="collective"
                />
              )}
            </div>
          ) : null}
        </div>

        {/* Enhanced Create Group Modal */}
        {open && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md shadow-2xl border-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-xl">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold">Create New Group</CardTitle>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <label htmlFor="group-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Group Name
                  </label>
                  <Input
                    id="group-name"
                    placeholder="Enter group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Add Members by Email
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddMember();
                        }
                      }}
                    />
                    <Button
                      variant="secondary"
                      onClick={handleAddMember}
                      disabled={!emailInput}
                    >
                      Add
                    </Button>
                  </div>

                  {members.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Members ({members.length})
                      </p>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {members.map((email, index) => (
                          <span
                            key={email}
                            className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm px-3 py-1 rounded-full"
                          >
                            {email}
                            <button
                              onClick={() => setMembers(members.filter((_, i) => i !== index))}
                              className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleCreateGroup}
                  disabled={loading || !groupName || members.length === 0}
                  className="w-full"
                >
                  {loading ? 'Creating...' : 'Create Group'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
