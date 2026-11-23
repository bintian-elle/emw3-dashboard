export type BaselineSummary = {
  code: string;
  source_script_id: string;
  title: string;
};

export type BaselineScript = BaselineSummary & {
  source_url: string;
  synopsis: string;
  source_combination: string;
  configuration: string | null;
  opening_hook: string;
  body: { time: string; visual: string; dialogue: string; subtitle: string }[];
  storyboard: { columns: string[]; rows: string[][]; notes: string };
  rationale: string;
  compliance: string;
};

export type BaselineLibrary = {
  scripts: BaselineSummary[];
  selected: BaselineScript | null;
};

export function isBaselineCode(code: string) {
  return /^#(?:0[1-9]|[12][0-9]|30)$/.test(code);
}
