export const apiDomainAdmin = process.env.NEXT_PUBLIC_BASE_URL_ADMIN!;
export const apiDomainCommon = process.env.NEXT_PUBLIC_BASE_URL_COMMON!;
export const apiDomainSetting = process.env.NEXT_PUBLIC_BASE_URL_SETTING!;
export const apiDomainStaffing = process.env.NEXT_PUBLIC_BASE_URL_STAFFING!;
export const apiDomainUser = process.env.NEXT_PUBLIC_BASE_URL_USER!;

const devAPIBasePaths: Record<string, string> = {
  main_admin: "admin",
  common: "common",
  stripe: "stripe",
  staffing: "staffing",
  admin: "hospital-admin",
  multimedia: "multimedia",
  appointment: "appointment",
  admin_setting: "admin_setting",
  settings: "settings",
  ext: "hospital-admin-extensions",
  feed: "feed",
  cms: "cms",
  content: "content",
  client: "client",
  expert: "expert",
  patient: "patient",
  comment: "comment",
  feedback: "feedback",
  payment: "payment",
  community: "community",
  templateandguidemgmt: "templateandguidemgmt",
  organisation: "organisation",
  user: "user",
  subnetwork: "hospital-admin",
};

const testAPIBasePaths = { ...devAPIBasePaths };
const prodAPIBasePaths = { ...devAPIBasePaths };

const env = process.env.NEXT_PUBLIC_ENVIRONMENT;

export const apiBasePath: Record<string, string> =
  env === "test"
    ? testAPIBasePaths
    : env === "prod"
    ? prodAPIBasePaths
    : devAPIBasePaths;
