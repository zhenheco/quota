import type { Company } from './types';

export interface SettingsView {
  showFirstRunSetup: boolean;
  setupSteps: string[];
}

const SETUP_STEPS = ['填公司資料', '上傳品牌圖檔', '設定稅率與備註'];

export function createSettingsView(company: Company): SettingsView {
  return {
    showFirstRunSetup:
      company.name.trim() === '' && !company.logo_key && !company.stamp_key && !company.bank_image_key,
    setupSteps: SETUP_STEPS,
  };
}
