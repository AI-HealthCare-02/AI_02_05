export type OCRStatus = "pending" | "processing" | "done" | "failed";

export interface ParsedDrug {
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  verified?: boolean;
}

export interface OCRStatusResponse {
  ocr_id: string;
  status: OCRStatus;
  confidence: number | null;
  parsed_drugs: ParsedDrug[] | null;
}

export interface ScheduleItem {
  id: string;
  drug_name: string;
  dosage: string;
  scheduled_time: string;
  checked: boolean;
  checked_at: string | null;
  start_date: string;
  end_date: string;
}

export interface StatsResponse {
  compliance_rate: number;
  streak_days: number;
  total_checked: number;
}
