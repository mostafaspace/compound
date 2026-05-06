import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['compound://'],
  config: {
    screens: {
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Visitors: 'visitors',
          Finance: 'finance',
          Polls: 'polls',
          More: {
            path: 'more',
            screens: {
              MoreHome: '',
              Notifications: 'notifications',
              Announcements: 'announcements',
              Property: 'property',
              OrgChart: 'org-chart',
              Settings: 'settings',
              Issues: 'issues',
              Documents: 'documents',
              VerificationStatus: 'verification-status',
              PrivacySettings: 'privacy',
              Polls: 'polls/more',
            },
          },
        },
      },
      Admin: {
        screens: {
          Dashboard: 'admin/dashboard',
          Visitors: 'admin/visitors',
          Finance: 'admin/finance',
          Units: 'admin/units',
          More: 'admin/more',
        },
      },
      Guard: {
        screens: {
          Gate: 'gate',
          Scanner: 'scanner',
          Invitations: 'guard-invitations',
        },
      },
      CreateVisitor: 'visitors/new',
      ShareVisitorPass: 'visitors/share/:visitorId',
      PollDetail: 'polls/:pollId',
      AddEditIssue: 'issues/new',
      IssueDetail: 'issues/detail',
      UploadDocument: 'documents/upload',
      AdminInvitations: 'admin/invitations',
      CreateInvitation: 'admin/invitations/new',
      AuditLog: 'admin/audit-log',
      AuditLogTimeline: 'admin/audit-log/:entityType/:entityId',
      CreateAnnouncement: 'announcements/new',
    },
  },
};
