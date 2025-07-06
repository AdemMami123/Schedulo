'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  CalendarDaysIcon,
  ClockIcon,
  EyeIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  ShareIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  FireIcon,
  BoltIcon,
  HeartIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  prefix?: string;
  suffix?: string;
}

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  action: () => void;
}

export function Overview() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  // Mock data - in a real app, this would come from your backend
  const stats = {
    totalBookings: 47,
    weeklyChange: 12,
    confirmedBookings: 42,
    pendingBookings: 3,
    cancelledBookings: 2,
    totalRevenue: 2340,
    revenueChange: 8.5,
    avgRating: 4.9,
    profileViews: 256,
    viewsChange: 15.2,
  };

  const recentBookings = [
    {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      service: 'Product Strategy Session',
      date: '2024-01-15',
      time: '10:00 AM',
      status: 'confirmed',
      duration: '60 min',
      avatar: null,
    },
    {
      id: 2,
      name: 'Michael Chen',
      email: 'michael.c@email.com',
      service: 'UX Design Review',
      date: '2024-01-15',
      time: '2:00 PM',
      status: 'pending',
      duration: '30 min',
      avatar: null,
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      email: 'emily.r@email.com',
      service: 'Technical Consultation',
      date: '2024-01-16',
      time: '11:00 AM',
      status: 'confirmed',
      duration: '45 min',
      avatar: null,
    },
  ];

  const quickActions = [
    {
      title: 'Share Profile',
      description: 'Get your booking link',
      icon: ShareIcon,
      color: 'from-blue-500 to-cyan-500',
      action: () => {},
    },
    {
      title: 'Add Availability',
      description: 'Set new time slots',
      icon: PlusIcon,
      color: 'from-green-500 to-emerald-500',
      action: () => {},
    },
    {
      title: 'View Analytics',
      description: 'See detailed insights',
      icon: ChartBarIcon,
      color: 'from-purple-500 to-pink-500',
      action: () => {},
    },
    {
      title: 'Settings',
      description: 'Configure preferences',
      icon: Cog6ToothIcon,
      color: 'from-orange-500 to-red-500',
      action: () => {},
    },
  ];

  const StatCard = ({ title, value, change, icon: Icon, trend, prefix = '', suffix = '' }: StatCardProps) => (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-white dark:bg-slate-800">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10"></div>
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {prefix}{value}{suffix}
            </p>
            {change !== undefined && (
              <div className={`flex items-center space-x-1 text-sm ${
                trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
              }`}>
                {trend === 'up' ? (
                  <ArrowUpIcon className="h-4 w-4" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4" />
                )}
                <span>{Math.abs(change)}%</span>
                <span className="text-slate-500 dark:text-slate-400">vs last {selectedPeriod}</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white group-hover:scale-110 transition-transform duration-300">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ActionCard = ({ title, description, icon: Icon, color, action }: ActionCardProps) => (
    <Card 
      className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 bg-white dark:bg-slate-800"
      onClick={action}
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-xl bg-gradient-to-r ${color} text-white group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Dashboard Overview
        </h2>
        <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          {['week', 'month', 'year'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedPeriod === period
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          change={stats.weeklyChange}
          trend="up"
          icon={CalendarDaysIcon}
        />
        <StatCard
          title="Confirmed"
          value={stats.confirmedBookings}
          change={5.2}
          trend="up"
          icon={CheckCircleIcon}
        />
        <StatCard
          title="Revenue"
          value={stats.totalRevenue}
          change={stats.revenueChange}
          trend="up"
          icon={CurrencyDollarIcon}
          prefix="$"
        />
        <StatCard
          title="Profile Views"
          value={stats.profileViews}
          change={stats.viewsChange}
          trend="up"
          icon={EyeIcon}
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
          <BoltIcon className="h-5 w-5 text-yellow-500" />
          <span>Quick Actions</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <ActionCard key={index} {...action} />
          ))}
        </div>
      </div>

      {/* Recent Bookings and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2">
          <Card className="border-0 bg-white dark:bg-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <FireIcon className="h-5 w-5 text-red-500" />
                <span>Recent Bookings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {booking.name.charAt(0)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {booking.name}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {booking.service}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>{booking.date}</span>
                      <span>{booking.time}</span>
                      <span>{booking.duration}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {booking.status === 'confirmed' ? (
                      <CheckCircleIconSolid className="h-5 w-5 text-green-500" />
                    ) : (
                      <ClockIcon className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-6">
          {/* Rating Card */}
          <Card className="border-0 bg-white dark:bg-slate-800">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIconSolid
                      key={star}
                      className={`h-6 w-6 ${
                        star <= Math.floor(stats.avgRating)
                          ? 'text-yellow-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  ))}
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {stats.avgRating}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Average Rating
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-green-600 dark:text-green-400">
                  <HeartIcon className="h-4 w-4" />
                  <span>98% positive feedback</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Status */}
          <Card className="border-0 bg-white dark:bg-slate-800">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Booking Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Confirmed</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {stats.confirmedBookings}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Pending</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {stats.pendingBookings}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Cancelled</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {stats.cancelledBookings}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
