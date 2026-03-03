export type StaffRole =
  | 'super_admin'
  | 'accountant'
  | 'customer_support'
  | 'operations_support'
  | 'reception'
  | 'manager'
  | 'staff';

export type PermissionMap = {
  isSuperAdmin?: boolean;
  canViewDashboard?: boolean;
  canViewBookings?: boolean;
  canEditBookings?: boolean;
  canDeleteBookings?: boolean;
  canManagePayments?: boolean;
  canViewSettings?: boolean;
  canEditSettings?: boolean;
  canAccessSettings?: boolean;
  canManageUsers?: boolean;
  canManageStaff?: boolean;
  canViewHouseboatReservations?: boolean;
  canEditHouseboatReservations?: boolean;
  canViewRestaurantReservations?: boolean;
  canEditRestaurantReservations?: boolean;
  canViewRiverCruiseReservations?: boolean;
  canEditRiverCruiseReservations?: boolean;
  canViewClients?: boolean;
  canEditClients?: boolean;
  canViewMessages?: boolean;
  [key: string]: boolean | undefined;
};

export type PermissionSource = {
  role?: string | null;
  permissions?: PermissionMap | null;
} | null | undefined;

const KNOWN_PERMISSION_KEYS: Array<keyof PermissionMap> = [
  'isSuperAdmin',
  'canViewDashboard',
  'canViewBookings',
  'canEditBookings',
  'canDeleteBookings',
  'canManagePayments',
  'canViewSettings',
  'canEditSettings',
  'canAccessSettings',
  'canManageUsers',
  'canManageStaff',
  'canViewHouseboatReservations',
  'canEditHouseboatReservations',
  'canViewRestaurantReservations',
  'canEditRestaurantReservations',
  'canViewRiverCruiseReservations',
  'canEditRiverCruiseReservations',
  'canViewClients',
  'canEditClients',
  'canViewMessages',
];

const EMPTY_PERMISSIONS: PermissionMap = KNOWN_PERMISSION_KEYS.reduce(
  (acc, key) => ({ ...acc, [key]: false }),
  {}
);

export const ROLE_PERMISSION_TEMPLATES: Record<StaffRole, PermissionMap> = {
  super_admin: KNOWN_PERMISSION_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: true }),
    {}
  ),
  accountant: {
    canViewDashboard: true,
    canViewBookings: true,
    canManagePayments: true,
    canViewClients: true,
    canViewMessages: true,
    canViewHouseboatReservations: true,
    canViewRestaurantReservations: true,
    canViewRiverCruiseReservations: true,
  },
  customer_support: {
    canViewDashboard: true,
    canViewBookings: true,
    canEditBookings: true,
    canViewClients: true,
    canEditClients: true,
    canViewMessages: true,
    canViewHouseboatReservations: true,
    canViewRestaurantReservations: true,
    canViewRiverCruiseReservations: true,
  },
  operations_support: {
    canViewDashboard: true,
    canViewBookings: true,
    canEditBookings: true,
    canViewClients: true,
    canViewMessages: true,
    canViewHouseboatReservations: true,
    canEditHouseboatReservations: true,
    canViewRestaurantReservations: true,
    canEditRestaurantReservations: true,
    canViewRiverCruiseReservations: true,
    canEditRiverCruiseReservations: true,
  },
  reception: {
    canViewDashboard: true,
    canViewBookings: true,
    canEditBookings: true,
    canViewClients: true,
    canViewMessages: true,
    canViewHouseboatReservations: true,
    canEditHouseboatReservations: true,
    canViewRestaurantReservations: true,
    canEditRestaurantReservations: true,
    canViewRiverCruiseReservations: true,
    canEditRiverCruiseReservations: true,
  },
  manager: {
    canViewDashboard: true,
    canViewBookings: true,
    canEditBookings: true,
    canDeleteBookings: true,
    canManagePayments: true,
    canViewSettings: true,
    canEditSettings: true,
    canAccessSettings: true,
    canViewClients: true,
    canEditClients: true,
    canViewMessages: true,
    canViewHouseboatReservations: true,
    canEditHouseboatReservations: true,
    canViewRestaurantReservations: true,
    canEditRestaurantReservations: true,
    canViewRiverCruiseReservations: true,
    canEditRiverCruiseReservations: true,
  },
  staff: {
    canViewDashboard: true,
    canViewBookings: true,
    canViewMessages: true,
  },
};

const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: 'Site Administrator',
  accountant: 'Accountant',
  customer_support: 'Customer Support',
  operations_support: 'Operations Support',
  reception: 'Reception',
  manager: 'Manager',
  staff: 'Staff',
};

export function getRolePermissions(role?: string | null): PermissionMap {
  if (!role) return {};
  const key = role as StaffRole;
  return ROLE_PERMISSION_TEMPLATES[key] || {};
}

function normalizeWithDerivations(
  role?: string | null,
  permissions?: PermissionMap | null
): PermissionMap {
  const raw = permissions || {};
  const next: PermissionMap = {
    ...EMPTY_PERMISSIONS,
    ...getRolePermissions(role),
    ...raw,
  };

  const explicitViewReservationKeys =
    raw.canViewHouseboatReservations !== undefined ||
    raw.canViewRestaurantReservations !== undefined ||
    raw.canViewRiverCruiseReservations !== undefined;

  const explicitEditReservationKeys =
    raw.canEditHouseboatReservations !== undefined ||
    raw.canEditRestaurantReservations !== undefined ||
    raw.canEditRiverCruiseReservations !== undefined;

  if (raw.canViewBookings && !explicitViewReservationKeys) {
    next.canViewHouseboatReservations = true;
    next.canViewRestaurantReservations = true;
    next.canViewRiverCruiseReservations = true;
  }

  if (raw.canEditBookings && !explicitEditReservationKeys) {
    next.canEditHouseboatReservations = true;
    next.canEditRestaurantReservations = true;
    next.canEditRiverCruiseReservations = true;
  }

  if (next.canEditHouseboatReservations) next.canViewHouseboatReservations = true;
  if (next.canEditRestaurantReservations) next.canViewRestaurantReservations = true;
  if (next.canEditRiverCruiseReservations) next.canViewRiverCruiseReservations = true;

  if (
    next.canViewHouseboatReservations ||
    next.canViewRestaurantReservations ||
    next.canViewRiverCruiseReservations
  ) {
    next.canViewBookings = true;
  }

  if (
    next.canEditHouseboatReservations ||
    next.canEditRestaurantReservations ||
    next.canEditRiverCruiseReservations
  ) {
    next.canEditBookings = true;
    next.canViewBookings = true;
  }

  if (next.canDeleteBookings) {
    next.canEditBookings = true;
    next.canViewBookings = true;
  }

  if (next.canEditSettings) {
    next.canViewSettings = true;
    next.canAccessSettings = true;
  }

  if (next.canViewSettings) {
    next.canAccessSettings = true;
  }

  if (next.canManageStaff) {
    next.canManageUsers = true;
  }
  if (next.canManageUsers) {
    next.canManageStaff = true;
  }

  if (next.canManagePayments) {
    next.canViewDashboard = true;
  }

  const superAdmin = role === 'super_admin' || next.isSuperAdmin;
  if (superAdmin) {
    KNOWN_PERMISSION_KEYS.forEach((key) => {
      next[key] = true;
    });
  }

  return next;
}

export function normalizePermissions(source: PermissionSource): PermissionMap {
  return normalizeWithDerivations(source?.role, source?.permissions);
}

export function isSuperAdmin(...sources: PermissionSource[]): boolean {
  return sources.some((source) => normalizePermissions(source).isSuperAdmin);
}

export function hasAnyPermission(
  sources: PermissionSource[],
  keys: Array<keyof PermissionMap>
): boolean {
  return sources.some((source) => {
    const permissions = normalizePermissions(source);
    return keys.some((key) => Boolean(permissions[key]));
  });
}

export function canViewDashboard(...sources: PermissionSource[]): boolean {
  return hasAnyPermission(sources, ['canViewDashboard']);
}

export function canAccessSettings(...sources: PermissionSource[]): boolean {
  return hasAnyPermission(sources, [
    'canAccessSettings',
    'canViewSettings',
    'canEditSettings',
  ]);
}

export function canManageStaff(...sources: PermissionSource[]): boolean {
  return hasAnyPermission(sources, ['canManageStaff', 'canManageUsers']);
}

export function canEditRestaurantReservations(
  ...sources: PermissionSource[]
): boolean {
  return hasAnyPermission(sources, [
    'canEditBookings',
    'canEditRestaurantReservations',
  ]);
}

export function canEditRiverCruiseReservations(
  ...sources: PermissionSource[]
): boolean {
  return hasAnyPermission(sources, [
    'canEditBookings',
    'canEditRiverCruiseReservations',
  ]);
}

export function hasStaffDashboardAccess(
  ...sources: PermissionSource[]
): boolean {
  return canViewDashboard(...sources);
}

export function getRoleLabel(source: PermissionSource): string {
  const role = (source?.role as StaffRole | undefined) || 'staff';
  if (normalizePermissions(source).isSuperAdmin) {
    return ROLE_LABELS.super_admin;
  }
  return ROLE_LABELS[role] || ROLE_LABELS.staff;
}
