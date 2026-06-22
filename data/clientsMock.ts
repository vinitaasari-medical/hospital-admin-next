export interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  countryCode: string;
  email?: string;
  jobTitle?: string;
}

export interface Branch {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  coverUrl: string | null;
  admins: Admin[];
}

export interface NetworkUser {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string | null;
}

export interface Department {
  id: string;
  name: string;
  head: string | null;
}

export interface Client {
  id: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  status: "Active" | "Pending" | "Inactive";
  hasSubNetworks: boolean;
  admins: Admin[];
  branches: Branch[];
  users: NetworkUser[];
  departments: Department[];
  createdAt: string;
  avatar: string;
  photoUrl: string | null;
  coverUrl: string | null;
}

export const initialClients: Client[] = [
  {
    id: "1",
    name: "City General Hospital",
    type: "Hospital",
    email: "admin@citygeneral.com",
    phone: "+1 (555) 100-2000",
    website: "citygeneral.com",
    address: "123 Medical Ave, New York, NY",
    status: "Active",
    hasSubNetworks: true,
    admins: [
      { id: "a1", firstName: "John", lastName: "Doe", phone: "5551002000", countryCode: "+1", email: "john.doe@citygeneral.com", jobTitle: "Super Admin" },
      { id: "a2", firstName: "Sarah", lastName: "Adams", phone: "5551002001", countryCode: "+1", email: "sarah.adams@citygeneral.com", jobTitle: "Registrar" },
      { id: "a3", firstName: "Mike", lastName: "Lee", phone: "5551002002", countryCode: "+1", email: "mike.lee@citygeneral.com", jobTitle: "Operations" },
    ],
    branches: [
      { id: "b1", name: "Downtown Branch", slug: "downtown-branch", logoUrl: null, coverUrl: null, admins: [] },
      { id: "b2", name: "Westside Clinic", slug: "westside-clinic", logoUrl: null, coverUrl: null, admins: [] },
    ],
    users: [
      { id: "u1", name: "Alice Johnson", email: "alice.j@citygeneral.com", role: "Nurse" },
      { id: "u2", name: "Bob Chen", email: "bob.chen@citygeneral.com", role: "Doctor" },
      { id: "u3", name: "Carla Diaz", email: "carla.d@citygeneral.com", role: "Technician" },
    ],
    departments: [
      { id: "d1", name: "Internal Team", head: null },
      { id: "d2", name: "General Surgery", head: "Zyad Almohya" },
      { id: "d3", name: "Cardiology", head: "Zyad Almohya" },
      { id: "d4", name: "Pulmonology", head: "Zyad Almohya" },
    ],
    createdAt: "Jan 15, 2025",
    avatar: "CG",
    photoUrl: null,
    coverUrl: null,
  },
  {
    id: "2",
    name: "Sunrise Medical Center",
    type: "Medical Center",
    email: "info@sunrisemc.org",
    phone: "+1 (555) 200-3000",
    website: "sunrisemc.org",
    address: "890 Health Park Dr, Los Angeles, CA",
    status: "Active",
    hasSubNetworks: false,
    admins: [
      { id: "a4", firstName: "Raj", lastName: "Patel", phone: "5552003000", countryCode: "+1", email: "raj.patel@sunrisemc.org", jobTitle: "Super Admin" },
    ],
    branches: [],
    users: [
      { id: "u4", name: "Diana Wright", email: "diana.w@sunrisemc.org", role: "Nurse" },
      { id: "u5", name: "Ethan Park", email: "ethan.p@sunrisemc.org", role: "Pharmacist" },
    ],
    departments: [
      { id: "d5", name: "Emergency", head: "Dr. Lina Park" },
      { id: "d6", name: "Pediatrics", head: "Dr. Omar Said" },
    ],
    createdAt: "Feb 3, 2025",
    avatar: "SM",
    photoUrl: null,
    coverUrl: null,
  },
];
