'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Calendar, Vote, Bell, Eye, ExternalLink, Clock, MapPin, Users, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface DashboardData {
  profile: any;
  stats: {
    recentDocumentsCount: number;
    upcomingMeetingsCount: number;
    pendingVotesCount: number;
    unreadNotificationsCount: number;
    nextMeetingDate: string | null;
  };
  recentDocuments: any[];
  upcomingMeetings: any[];
  unreadNotifications: any[];
}

interface DashboardClientProps {
  data: DashboardData;
}

export default function DashboardClient({ data }: DashboardClientProps) {
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Real-time state management
  const [currentData, setCurrentData] = useState(data);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleViewDocument = async (documentId: string) => {
    try {
      // Open document in new tab
      window.open(`/api/documents/${documentId}/view`, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
    }
  };

  const handleMeetingDetails = (meeting: any) => {
    setSelectedMeeting(meeting);
    setIsMeetingDialogOpen(true);
  };

  const handleShowNotifications = () => {
    setShowNotifications(true);
  };

  // Function to refresh dashboard data
  const refreshDashboardData = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/dashboard/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const freshData = await response.json();
        setCurrentData(freshData);
      }
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Real-time subscription for documents
  useRealtimeSubscription({
    table: 'documents',
    event: '*',
    onChange: useCallback((payload: any) => {
      console.log('Document change detected:', payload);
      // Only refresh if it's a published document
      if (payload.new?.is_published || payload.old?.is_published) {
        refreshDashboardData();
      }
    }, [refreshDashboardData])
  });

  // Real-time subscription for meetings
  useRealtimeSubscription({
    table: 'meetings',
    event: '*',
    onChange: useCallback((payload: any) => {
      console.log('Meeting change detected:', payload);
      refreshDashboardData();
    }, [refreshDashboardData])
  });

  // Real-time subscription for meeting participants (in case user gets added to new meetings)
  useRealtimeSubscription({
    table: 'meeting_participants',
    event: '*',
    onChange: useCallback((payload: any) => {
      console.log('Meeting participant change detected:', payload);
      // Check if this affects the current user
      if (payload.new?.user_id === data.profile?.id || payload.old?.user_id === data.profile?.id) {
        refreshDashboardData();
      }
    }, [refreshDashboardData, data.profile?.id])
  });

  // Parse agenda safely
  const parseMeetingAgenda = (agenda: any) => {
    if (!agenda) return [];
    try {
      const agendaData = typeof agenda === 'string' ? JSON.parse(agenda) : agenda;
      return Array.isArray(agendaData) ? agendaData : [];
    } catch (error) {
      console.warn('Error parsing agenda:', error);
      return [];
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {currentData.profile?.full_name || currentData.profile?.email}
            </h1>
            <p className="text-gray-600 mt-2">
              Here&apos;s what&apos;s happening with the board today.
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={refreshDashboardData}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentData.stats.recentDocumentsCount}</div>
            <p className="text-xs text-muted-foreground">
              Published documents available
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentData.stats.upcomingMeetingsCount}</div>
            <p className="text-xs text-muted-foreground">
              {currentData.stats.nextMeetingDate
                ? `Next: ${new Date(currentData.stats.nextMeetingDate).toLocaleDateString()}`
                : 'No upcoming meetings'
              }
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Votes</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentData.stats.pendingVotesCount}</div>
            <p className="text-xs text-muted-foreground">
              {currentData.stats.pendingVotesCount > 0 ? 'Requires your attention' : 'No pending votes'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleShowNotifications}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className={`h-4 w-4 ${currentData.stats.unreadNotificationsCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentData.stats.unreadNotificationsCount}</div>
            <p className="text-xs text-muted-foreground">
              {currentData.stats.unreadNotificationsCount > 0 ? 'New notifications' : 'No new notifications'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>
              Latest documents published for board members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentData.recentDocuments.length > 0 ? (
                currentData.recentDocuments.map((document) => (
                  <div key={document.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{document.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Published {new Date(document.published_at || document.created_at || '').toLocaleDateString()}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDocument(document.id)}
                      className="ml-2 flex-shrink-0"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No documents available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Meetings</CardTitle>
            <CardDescription>
              Your scheduled board meetings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentData.upcomingMeetings.length > 0 ? (
                currentData.upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{meeting.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(meeting.meeting_date).toLocaleDateString()} at{' '}
                        {new Date(meeting.meeting_date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleMeetingDetails(meeting)}
                      className="ml-2 flex-shrink-0"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No upcoming meetings</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meeting Details Dialog */}
      <Dialog open={isMeetingDialogOpen} onOpenChange={setIsMeetingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedMeeting && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedMeeting.title}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Meeting Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Date & Time</p>
                        <p className="text-sm text-gray-600">
                          {format(parseISO(selectedMeeting.meeting_date), 'PPP')} at{' '}
                          {format(parseISO(selectedMeeting.meeting_date), 'p')}
                        </p>
                      </div>
                    </div>
                    
                    {selectedMeeting.duration_minutes && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium">Duration</p>
                          <p className="text-sm text-gray-600">{selectedMeeting.duration_minutes} minutes</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedMeeting.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="font-medium">Location</p>
                          <p className="text-sm text-gray-600">{selectedMeeting.location}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {selectedMeeting.meeting_link && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="font-medium">Meeting Link</p>
                          <a 
                            href={selectedMeeting.meeting_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                          >
                            Join Meeting
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {selectedMeeting.meeting_type && (
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-orange-600" />
                        <div>
                          <p className="font-medium">Meeting Type</p>
                          <p className="text-sm text-gray-600">
                            {selectedMeeting.meeting_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedMeeting.description && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedMeeting.description}</p>
                  </div>
                )}

                {/* Agenda */}
                {(() => {
                  const parsedAgenda = parseMeetingAgenda(selectedMeeting.agenda);
                  return parsedAgenda.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Meeting Agenda
                      </h3>
                      <div className="space-y-4">
                        {parsedAgenda.map((item: any, index: number) => (
                          <div key={item.id || index} className="relative border border-gray-200 rounded-lg p-5 bg-gradient-to-r from-gray-50 to-white shadow-sm">
                            <div className="absolute -left-3 -top-3 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                              {index + 1}
                            </div>
                            
                            <div className="flex justify-between items-start mb-3 ml-2">
                              <h4 className="font-semibold text-lg text-gray-800 pr-4">{item.title}</h4>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Clock className="w-4 h-4 text-green-600" />
                                <span className="text-sm bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200">
                                  {item.duration} min
                                </span>
                              </div>
                            </div>
                            
                            {item.description && (
                              <div className="ml-2 mt-3 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-400">
                                <div className="text-gray-700 text-sm leading-relaxed">
                                  {item.description.split('\n').map((line: string, lineIndex: number) => (
                                    <div key={lineIndex} className="mb-1">
                                      {line.trim() === '' ? (
                                        <div className="h-2"></div>
                                      ) : (
                                        <span>{line}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                              <Clock className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-blue-900">Total Meeting Duration</p>
                              <p className="text-lg font-bold text-blue-800">
                                {parsedAgenda.reduce((total: number, item: any) => total + (item.duration || 0), 0)} minutes
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-blue-700">
                              {parsedAgenda.length} agenda {parsedAgenda.length === 1 ? 'item' : 'items'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Close Button */}
                <div className="flex justify-end pt-4">
                  <Button onClick={() => setIsMeetingDialogOpen(false)}>Close</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Recent Notifications
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {currentData.unreadNotifications.length > 0 ? (
              currentData.unreadNotifications.map((notification) => (
                <div key={notification.id} className="p-4 border border-gray-200 rounded-lg bg-blue-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notification.created_at).toLocaleDateString()} at{' '}
                        {new Date(notification.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No new notifications</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowNotifications(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}