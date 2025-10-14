export type Lead = {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  status: string;
  source?: string;
  is_active: boolean;
};

export type LeadPage = {
  items: Lead[];
  total: number;
  page: number;
  per_page: number;
};