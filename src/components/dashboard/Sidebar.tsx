'use client';

import { Fragment } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { Dialog, Transition } from '@headlessui/react';
import {
  HomeIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  ClockIcon,
  XMarkIcon,
  UserIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { DashboardView } from './Dashboard';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Overview', href: 'overview', icon: HomeIcon },
  { name: 'Calendar', href: 'calendar', icon: CalendarDaysIcon },
  { name: 'Availability', href: 'availability', icon: ClockIcon },
  { name: 'Groups', href: 'groups', icon: UserGroupIcon },
  { name: 'Booking Settings', href: 'booking-settings', icon: Cog6ToothIcon },
  { name: 'History', href: 'history', icon: CalendarDaysIcon },
  { name: 'Accounts', href: 'accounts', icon: UserIcon },
    { name: 'Statistics', href: 'statistics', icon: ChartBarIcon },

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
  const { userProfile } = useAuth();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Enhanced Logo */}
      <div className="flex items-center justify-between h-20 px-6 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-xl font-bold gradient-text">
            Schedulo
          </h1>
        </div>
        
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-6 py-8 space-y-3 flex flex-col justify-start">
        {navigation.map((item) => (
          <button
            key={item.name}
            onClick={() => {
              onViewChange(item.href as DashboardView);
              onMobileMenuClose(); // Close mobile menu when item is selected
            }}
            className={cn(
              'w-full flex items-center px-5 py-4 text-sm font-semibold rounded-2xl transition-all duration-300 group transform hover:scale-[1.02]',
              currentView === item.href
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <item.icon className={cn(
              'mr-4 h-6 w-6 transition-all duration-300',
              currentView === item.href ? 'text-white' : 'group-hover:scale-110'
            )} />
            {item.name}
          </button>
        ))}
      </nav>
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
                <div className="flex grow flex-col gap-y-5 overflow-y-auto glass-card border-r border-slate-200/50 dark:border-slate-700/50">
                  <SidebarContent />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto glass-card border-r border-slate-200/50 dark:border-slate-700/50">
          <SidebarContent />
        </div>
      </div>
    </>
  );
}
