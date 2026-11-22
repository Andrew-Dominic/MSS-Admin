import "server-only";
import { mssApi } from "./api";

/** Answer counts the API returns (questionnaire statistics). Totals only: no names, phones or ids. */
export interface QuestionnaireStats {
  generated_at: string;
  states: string[] | null;
  total: number;
  signed_in: number;
  guests: number;
  completed: number;
  with_location: number;
  by_source: Record<string, number>;
  fields: Record<string, Record<string, number>>;
  employees: { businesses: number; total_staff: number; women_staff: number };
  by_state: { state: string; count: number }[];
  by_district: { state: string; district: string; count: number }[];
  daily: { day: string; count: number }[];
}

/** states: undefined = every state; otherwise state keys such as "maharashtra". */
export async function getQuestionnaireStats(states?: string[]): Promise<QuestionnaireStats> {
  const path = states?.length ? `/admin/questionnaire/analytics?states=${states.join(",")}` : "/admin/questionnaire/analytics";
  return (await mssApi<QuestionnaireStats>(path)).data;
}
