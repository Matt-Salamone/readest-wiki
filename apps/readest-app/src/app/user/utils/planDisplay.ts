/** Display-only plan badge for the profile page (no external billing). */
export type PlanDisplay = {
  name: string;
  color: string;
};

export const DEFAULT_PLAN_DISPLAY: PlanDisplay = {
  name: 'Free',
  color: 'bg-gray-100 text-gray-800',
};
