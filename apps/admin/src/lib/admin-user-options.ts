export interface AdminUserOption {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
}

export function toAdminUserOption(user: {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
}): AdminUserOption {
  return {
    email: user.email,
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    status: user.status,
  };
}
