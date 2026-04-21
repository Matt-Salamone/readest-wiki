import { jwtDecode } from 'jwt-decode';
import { supabase } from '@/utils/supabase';
import { UserPlan } from '@/types/quota';
import { DEFAULT_DAILY_TRANSLATION_QUOTA, DEFAULT_STORAGE_QUOTA } from '@/services/constants';
import { isWebAppPlatform } from '@/services/environment';
import { getDailyUsage } from '@/services/translators/utils';

interface Token {
  plan: UserPlan;
  storage_usage_bytes: number;
  storage_purchased_bytes: number;
  [key: string]: string | number;
}

export const getSubscriptionPlan = (token: string): UserPlan => {
  const data = jwtDecode<Token>(token) || {};
  return data['plan'] || 'free';
};

/** Self-hosted: no paid tiers; optional extra storage still reflected as `purchase` when purchased bytes > 0. */
export const getUserProfilePlan = (token: string): UserPlan => {
  const data = jwtDecode<Token>(token) || {};
  const purchasedQuota = data['storage_purchased_bytes'] || 0;
  if (purchasedQuota > 0) {
    return 'purchase';
  }
  return 'free';
};

export const STORAGE_QUOTA_GRACE_BYTES = 10 * 1024 * 1024; // 10 MB grace

export const getStoragePlanData = (token: string) => {
  const data = jwtDecode<Token>(token) || {};
  const usage = data['storage_usage_bytes'] || 0;
  const purchasedQuota = data['storage_purchased_bytes'] || 0;
  const fixedQuota = parseInt(process.env['NEXT_PUBLIC_STORAGE_FIXED_QUOTA'] || '0');
  const planQuota = fixedQuota || DEFAULT_STORAGE_QUOTA['free'];
  const quota = planQuota + purchasedQuota;

  return {
    plan: 'free' as UserPlan,
    usage,
    quota,
  };
};

export const getTranslationQuota = (plan: UserPlan): number => {
  const fixedQuota = parseInt(process.env['NEXT_PUBLIC_TRANSLATION_FIXED_QUOTA'] || '0');
  return (
    fixedQuota || DEFAULT_DAILY_TRANSLATION_QUOTA[plan] || DEFAULT_DAILY_TRANSLATION_QUOTA['free']
  );
};

export const getTranslationPlanData = (_token: string) => {
  const usage = getDailyUsage() || 0;
  const quota = getTranslationQuota('free');

  return {
    plan: 'free' as UserPlan,
    usage,
    quota,
  };
};

export const getDailyTranslationPlanData = (_token: string) => {
  const quota = getTranslationQuota('free');

  return {
    plan: 'free' as UserPlan,
    quota,
  };
};

export const getAccessToken = async (): Promise<string | null> => {
  // In browser context there might be two instances of supabase one in the app route
  // and the other in the pages route, and they might have different sessions
  // making the access token invalid for API calls. In that case we should use localStorage.
  if (isWebAppPlatform()) {
    return localStorage.getItem('token') ?? null;
  }
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
};

export const getUserID = async (): Promise<string | null> => {
  if (isWebAppPlatform()) {
    const user = localStorage.getItem('user') ?? '{}';
    return JSON.parse(user).id ?? null;
  }
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
};

export const validateUserAndToken = async (authHeader: string | null | undefined) => {
  if (!authHeader) return {};

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return {};
  return { user, token };
};
