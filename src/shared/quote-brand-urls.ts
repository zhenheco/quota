import type { Company } from '../server/types';

export interface QuoteBrandUrls {
  logo: string | null;
  stamp: string | null;
  bank: string | null;
}

export function buildQuoteBrandUrls(company: Company): QuoteBrandUrls {
  return {
    logo: company.logo_key ? '/api/company/brand/logo' : null,
    stamp: company.stamp_key ? '/api/company/brand/stamp' : null,
    bank: company.bank_image_key ? '/api/company/brand/bank' : null,
  };
}
