'use client';

import { Fragment } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Dialog, Transition } from '@headlessui/react';
import {
  HomeIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  ClockIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  UserGroupIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { SidebarUserLinks } from './SidebarUserLinks';
import { DashboardView } from './Dashboard';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Overview', href: 'overview', icon: HomeIcon },
  { name: 'Availability', href: 'availability', icon: ClockIcon },
  { name: 'Booking Settings', href: 'booking-settings', icon: Cog6ToothIcon },
  { name: 'History', href: 'history', icon: CalendarDaysIcon },
  { name: 'Accounts', href: 'accounts', icon: UserGroupIcon },
];

interface SidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  mobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

export function Sidebar({ 
  currentView, 
  onViewChange, 
  mobileMenuOpen = false, 
  onMobileMenuClose = () => {} 
}: SidebarProps) {
  const { userProfile, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Enhanced Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Schedulo
          </h1>
        </div>
        <ThemeToggle variant="dropdown" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => (
          <button
            key={item.name}
            onClick={() => onViewChange(item.href as DashboardView)}
            className={cn(
              'w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group',
              currentView === item.href
                ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <item.icon className={cn(
              'mr-3 h-5 w-5 transition-all duration-200',
              currentView === item.href ? 'text-blue-600 dark:text-blue-400' : 'group-hover:scale-110'
            )} />
            {item.name}
          </button>
        ))}
        
        {/* User Booking Links Section */}
        <div className="mt-8">
          <div className="flex items-center px-4 mb-2">
            <LinkIcon className="h-5 w-5 text-slate-500 dark:text-slate-400 mr-2" />
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">User Booking Links</h3>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2">
            <SidebarUserLinks />
          </div>
        </div>
      </nav>

      {/* Enhanced User Profile */}
      <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center space-x-3 mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
          {userProfile?.photoURL ? (
            <img
              src={userProfile.photoURL}
              alt={userProfile.displayName}
              className="w-10 h-10 rounded-full ring-2 ring-blue-200 dark:ring-blue-800"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {userProfile?.displayName?.charAt(0) || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {userProfile?.displayName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {userProfile?.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 hover:scale-[1.02] group"
        >
          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={mobileMenuOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={onMobileMenuClose}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={onMobileMenuClose}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50">
                  <SidebarContent />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50">
          <SidebarContent />
        </div>
      </div>
    </>
  );
}
