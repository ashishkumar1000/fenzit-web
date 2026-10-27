/**
 * Wire shapes of the staff dossier (`GET /api/v1/admin/users/lookup`), kept
 * beside the client that fetches them. Mirrors the backend's admin-dossier
 * contract: totals are always true counts; the recent lists are capped; a
 * section the backend could not read comes back as an empty list, never an
 * error. Timestamps are ISO strings; pure dates are YYYY-MM-DD.
 */

export interface DossierUser {
  id: string;
  name: string | null;
  countryCode: string;
  phoneNumber: string;
  email: string | null;
  platformAdmin: boolean;
  disabled: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
  authCreatedAt: string | null;
}

export interface DossierCounts {
  jobs: number;
  skills: number;
  auditRows: number;
  membershipsAll: number;
  notifications: number;
  attendanceRecords: number;
  attendanceAttempts: number;
  leaveRequests: number;
  reports: number;
  activityRows: number;
  invitesSent: number;
}

export interface DossierMembership {
  company: string;
  role: string;
  status: string;
  employeeCode: string | null;
  invitedBy: string | null;
  joined: string | null;
  isFounder: boolean;
}

export interface DossierOffice {
  name: string;
  address: string | null;
  radius: number | null;
  valid: string | null;
}

export interface DossierJob {
  jobNumber: string;
  status: string;
  priority: string | null;
  scheduledStart: string | null;
  currentStep: string | null;
  completedAt: string | null;
  serviceLocation: string | null;
  photos: number;
  customer: string | null;
  skill: string | null;
}

export interface DossierAttendance {
  recent: Array<{
    workDate: string;
    checkin: string | null;
    checkout: string | null;
    checkinDistance: number | null;
    checkoutDistance: number | null;
    mocked: boolean;
  }>;
  attempts: Array<{
    kind: string;
    outcome: string;
    provider: string | null;
    distance: number | null;
    mocked: boolean;
    createdAt: string | null;
  }>;
  records: number;
  attemptsCount: number;
  corrections: number;
  overrides: number;
  overridesAuthored: number;
  weeklyOff: number;
  enrolments: number;
}

export interface DossierLeaveItem {
  start: string;
  end: string;
  part: string;
  reason: string | null;
  lastState: string | null;
}

export interface DossierLeaveDay {
  date: string;
  state: string;
}

export interface DossierLeaveEvent {
  cause: string;
  actor: string | null;
  reason: string | null;
  dates: string | null;
  createdAt: string | null;
}

export interface DossierInvite {
  name: string | null;
  phone: string;
  company: string;
  role: string;
  status: string;
}

export interface DossierCorrection {
  workDate: string;
  employee: string | null;
  note: string | null;
}

export interface DossierNotification {
  event: string;
  summary: string | null;
  read: string | null;
  pushed: string | null;
  createdAt: string | null;
}

export interface DossierAuditRow {
  action: string;
  isActor: boolean;
  createdAt: string | null;
}

export interface DossierActivity {
  event: string;
  jobNumber: string | null;
  createdAt: string | null;
}

export interface DossierReport {
  type: string;
  status: string;
  createdAt: string | null;
}

export interface DossierCompany {
  name: string;
  members: number;
  customers: number;
  jobs: number;
  attendanceRows: number;
  address: string | null;
  state: string | null;
  timezone: string | null;
  isFounder: boolean;
  gstin: string | null;
  upi: string | null;
}

export interface LookupResponse {
  user: DossierUser;
  counts: DossierCounts;
  memberships: DossierMembership[];
  offices: DossierOffice[];
  jobs: DossierJob[];
  attendance: DossierAttendance;
  leave: DossierLeaveItem[];
  leaveDays: DossierLeaveDay[];
  leaveEvents: DossierLeaveEvent[];
  skills: string[];
  invites: { sent: DossierInvite[]; invitedBy: string | null };
  authored: { corrections: DossierCorrection[] };
  notifications: DossierNotification[];
  audit: DossierAuditRow[];
  activity: DossierActivity[];
  reports: DossierReport[];
  company: DossierCompany | null;
}
