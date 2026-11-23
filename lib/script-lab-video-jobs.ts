import type { LocalizedText } from "./script-lab-project";
import type { SampleScript, SampleStoryboard } from "./script-lab-sample-batch";
import type { ComplianceReport } from "./script-lab-compliance";

export type VideoMode = "script" | "storyboard";
export type VideoJob = {
  id: string;
  batch_id: string;
  mode: VideoMode;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  can_cancel?: boolean;
  stage: string;
  recent_events: { at: string; stage: string; processed: number; item_no?: number; reason?: string }[];
  issues: { code: string; count: number }[];
  requested_name: string;
  submitted_at: string;
  started_at: string | null;
  finished_at: string | null;
  total: number;
  processed: number;
  generated_count: number;
  queue_position: number;
  error_code: string | null;
  combination: LocalizedText;
  first_script_id: string | null;
  source_batch_id: string | null;
  storyboard_script_ids: string[];
};

export type GeneratedScript = SampleScript & { revision: string; rationale: SampleStoryboard["logic"]; compliance?: ComplianceReport; compliance_failed?: boolean };
export type GeneratedStoryboard = {
  storage_batch_id?: string;
  id: string;
  script_id: string;
  script_revision: string;
  revision: string;
  storyboard: SampleStoryboard;
  compliance?: ComplianceReport;
  compliance_failed?: boolean;
  compliance_in_script?: boolean;
};
export type VideoBatch = VideoJob & { scripts: GeneratedScript[]; storyboards: GeneratedStoryboard[] };

export const videoIdPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
