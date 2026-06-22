/**
 * Shared department mock store used by the Departments list page
 * and the DepartmentProfile page.
 */
export interface DepartmentUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  profession: string;
  rank: string;
  avatar: string;
  status?: "Active" | "Pending";
  isMapped?: boolean;
}

export interface OfficialGroup {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  image?: string;
  memberCount: number;
  admins: string[];
  memberIds?: string[];
  adminIds?: string[];
  createdAt?: string;
}

export interface DepartmentTemplate {
  id: string;
  title: string;
  category: string;
  updatedAt: string;
}

export interface DepartmentRecord {
  id: string;
  departmentCode: string;
  name: string;
  description: string;
  type: "Primary" | "Sub-Department";
  parentId?: string | null;
  headName: string;
  headUserId?: string;
  userCount?: number;
  users: DepartmentUser[];
  groups: OfficialGroup[];
  templates: DepartmentTemplate[];
  createdAt: string;
}

export const allAvailableUsers: DepartmentUser[] = [
  { id: "u1", name: "Dr. Amina Hassan", email: "a.hassan@hospital.com", phone: "+966 555-0101", profession: "Physician", rank: "Consultant", avatar: "AH", status: "Active" },
  { id: "u2", name: "James O'Brien", email: "j.obrien@hospital.com", phone: "+966 555-0102", profession: "Surgeon", rank: "Consultant", avatar: "JO", status: "Active" },
  { id: "u3", name: "Maria Santos", email: "m.santos@hospital.com", phone: "+966 555-0103", profession: "Nursing", rank: "Lead", avatar: "MS", status: "Active" },
  { id: "u4", name: "Chen Wei", email: "c.wei@hospital.com", phone: "+966 555-0104", profession: "Technician", rank: "Mid-Level", avatar: "CW", status: "Pending" },
  { id: "u5", name: "Fatima Al-Rashid", email: "f.alrashid@hospital.com", phone: "+966 555-0105", profession: "Pharmacist", rank: "Senior", avatar: "FA", status: "Active" },
  { id: "u6", name: "Dr. Robert Kim", email: "r.kim@hospital.com", phone: "+966 555-0106", profession: "Physician", rank: "Head of Department", avatar: "RK", status: "Active" },
  { id: "u7", name: "Sarah Johnson", email: "s.johnson@hospital.com", phone: "+966 555-0107", profession: "Surgeon", rank: "Senior", avatar: "SJ", status: "Active" },
  { id: "u8", name: "David Park", email: "d.park@hospital.com", phone: "+966 555-0108", profession: "Physician", rank: "Resident", avatar: "DP", status: "Pending" },
  { id: "u9", name: "Lisa Chen", email: "l.chen@hospital.com", phone: "+966 555-0109", profession: "Nursing", rank: "Mid-Level", avatar: "LC", status: "Active" },
];

export const initialDepartments: DepartmentRecord[] = [
  {
    id: "d1",
    departmentCode: "DEP-001",
    name: "Internal Medicine",
    description: "Comprehensive adult medical care across specialities.",
    type: "Primary",
    headName: "Dr. Robert Kim",
    users: [allAvailableUsers[0], allAvailableUsers[1], allAvailableUsers[5], allAvailableUsers[8]],
    groups: [
      { id: "g1", groupId: "3787183557", name: "Internal Medicine Official Group", memberCount: 9, admins: ["Zyad", "Robert"] },
    ],
    templates: [
      { id: "t1", title: "24 Hrs On Call IE", category: "On-Duty", updatedAt: "May 21, 2026" },
      { id: "t2", title: "Internal Medicine Weekly", category: "Roster", updatedAt: "May 18, 2026" },
    ],
    createdAt: "Jan 15, 2026",
  },
  {
    id: "d2",
    departmentCode: "DEP-002",
    name: "Cardiology",
    description: "Heart and cardiovascular system care",
    type: "Sub-Department",
    parentId: "d1",
    headName: "Dr. Amina Hassan",
    users: [allAvailableUsers[0], allAvailableUsers[7]],
    groups: [],
    templates: [],
    createdAt: "Jan 20, 2026",
  },
  {
    id: "d3",
    departmentCode: "DEP-003",
    name: "Pulmonology",
    description: "Respiratory care and lung disease",
    type: "Sub-Department",
    parentId: "d1",
    headName: "Dr. Sarah Johnson",
    users: [allAvailableUsers[6]],
    groups: [],
    templates: [],
    createdAt: "Jan 25, 2026",
  },
  {
    id: "d4",
    departmentCode: "DEP-004",
    name: "Internal Team",
    description: "Operations and internal coordination team",
    type: "Primary",
    headName: "",
    users: [],
    groups: [],
    templates: [],
    createdAt: "Feb 01, 2026",
  },
  {
    id: "d5",
    departmentCode: "DEP-005",
    name: "Emergency",
    description: "Emergency and trauma care",
    type: "Primary",
    headName: "Sarah Johnson",
    users: [allAvailableUsers[6], allAvailableUsers[2]],
    groups: [],
    templates: [],
    createdAt: "Feb 10, 2026",
  },
];
