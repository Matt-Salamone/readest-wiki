'use client';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa, type ViewType } from '@supabase/auth-ui-shared';
import { IoArrowBack } from 'react-icons/io5';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { useEnv } from '@/context/EnvContext';
import { useTheme } from '@/hooks/useTheme';
import { useThemeStore } from '@/store/themeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useTrafficLightStore } from '@/store/trafficLightStore';
import { getBaseUrl, isTauriShell } from '@/services/environment';
import WindowButtons from '@/components/WindowButtons';

const WEB_AUTH_CALLBACK = `${getBaseUrl()}/auth/callback`;
const DEEPLINK_CALLBACK = 'readest://auth-callback';

export default function AuthPage() {
  const _ = useTranslation();
  const router = useRouter();
  const { login } = useAuth();
  const { envConfig, appService } = useEnv();
  const { isDarkMode, safeAreaInsets, isRoundedWindow } = useThemeStore();
  const { isTrafficLightVisible } = useTrafficLightStore();
  const { settings, setSettings, saveSettings } = useSettingsStore();
  const [emailAuthView, setEmailAuthView] = useState<ViewType>('sign_in');
  const [isMounted, setIsMounted] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);

  useTheme({ systemUIVisible: false });

  const getWebRedirectTo = () => {
    return process.env.NODE_ENV === 'production'
      ? WEB_AUTH_CALLBACK
      : `${window.location.origin}/auth/callback`;
  };

  /** Supabase email (magic link, signup, reset) redirect — no third-party OAuth. */
  const getSupabaseEmailRedirectTo = () => {
    if (!isTauriShell()) {
      return getWebRedirectTo();
    }
    if (appService?.isMobileApp) {
      return WEB_AUTH_CALLBACK;
    }
    if (process.env.NODE_ENV === 'production') {
      return DEEPLINK_CALLBACK;
    }
    return WEB_AUTH_CALLBACK;
  };

  const handleGoBack = () => {
    // Keep login false to avoid infinite loop to redirect to the login page
    settings.keepLogin = false;
    setSettings(settings);
    saveSettings(envConfig, settings);
    const redirectTo = new URLSearchParams(window.location.search).get('redirect');
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.back();
    }
  };

  const getAuthLocalization = () => {
    return {
      variables: {
        sign_in: {
          email_label: _('Email address'),
          password_label: _('Your Password'),
          email_input_placeholder: _('Your email address'),
          password_input_placeholder: _('Your password'),
          button_label: _('Sign in'),
          loading_button_label: _('Signing in...'),
          social_provider_text: _('Sign in with {{provider}}'),
          link_text: _('Already have an account? Sign in'),
        },
        sign_up: {
          email_label: _('Email address'),
          password_label: _('Create a Password'),
          email_input_placeholder: _('Your email address'),
          password_input_placeholder: _('Your password'),
          button_label: _('Sign up'),
          loading_button_label: _('Signing up...'),
          social_provider_text: _('Sign in with {{provider}}'),
          link_text: _("Don't have an account? Sign up"),
          confirmation_text: _('Check your email for the confirmation link'),
        },
        magic_link: {
          email_input_label: _('Email address'),
          email_input_placeholder: _('Your email address'),
          button_label: _('Sign in'),
          loading_button_label: _('Signing in ...'),
          link_text: _('Send a magic link email'),
          confirmation_text: _('Check your email for the magic link'),
        },
        forgotten_password: {
          email_label: _('Email address'),
          password_label: _('Your Password'),
          email_input_placeholder: _('Your email address'),
          button_label: _('Send reset password instructions'),
          loading_button_label: _('Sending reset instructions ...'),
          link_text: _('Forgot your password?'),
          confirmation_text: _('Check your email for the password reset link'),
        },
        verify_otp: {
          email_input_label: _('Email address'),
          email_input_placeholder: _('Your email address'),
          phone_input_label: _('Phone number'),
          phone_input_placeholder: _('Your phone number'),
          token_input_label: _('Token'),
          token_input_placeholder: _('Your OTP token'),
          button_label: _('Verify token'),
          loading_button_label: _('Signing in ...'),
        },
      },
    };
  };

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token && session.user) {
        login(session.access_token, session.user);
        const redirectTo = new URLSearchParams(window.location.search).get('redirect');
        const lastRedirectAtKey = 'lastRedirectAt';
        const lastRedirectAt = parseInt(localStorage.getItem(lastRedirectAtKey) || '0', 10);
        const now = Date.now();
        localStorage.setItem(lastRedirectAtKey, now.toString());
        if (now - lastRedirectAt > 3000) {
          router.push(redirectTo ?? '/library');
        }
      }
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const emailAuthModes: { view: ViewType; label: string }[] = [
    { view: 'sign_in', label: _('Sign in') },
    { view: 'sign_up', label: _('Sign up') },
    { view: 'magic_link', label: _('Magic link') },
  ];

  const emailAuthModeTabs = (
    <div className='mb-3 flex w-full justify-center'>
      <div
        role='tablist'
        aria-label={_('Email, password, or magic link')}
        className='grid w-64 grid-cols-3 gap-1'
      >
        {emailAuthModes.map(({ view, label }) => (
          <button
            key={view}
            type='button'
            role='tab'
            aria-selected={emailAuthView === view}
            onClick={() => setEmailAuthView(view)}
            className={clsx(
              'rounded border px-1 py-2 text-xs font-medium transition',
              emailAuthView === view
                ? 'border-primary bg-primary text-primary-content'
                : 'bg-base-100 border-base-300 text-base-content/80 hover:bg-base-200',
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  const emailAuthForgottenBack = (
    <div className='mb-3 flex w-full justify-center'>
      <button
        type='button'
        className='link link-hover text-base-content/80 text-sm'
        onClick={() => setEmailAuthView('sign_in')}
      >
        {_('Back to sign in')}
      </button>
    </div>
  );

  return isTauriShell() ? (
    <div
      className={clsx(
        'bg-base-100 full-height inset-0 flex select-none flex-col items-center overflow-hidden',
        appService?.hasRoundedWindow && isRoundedWindow && 'window-border rounded-window',
      )}
    >
      <div
        className={clsx('flex h-full w-full flex-col items-center overflow-y-auto')}
        style={{
          paddingTop: `${safeAreaInsets?.top || 0}px`,
        }}
      >
        <div
          ref={headerRef}
          className={clsx(
            'fixed z-10 flex w-full items-center justify-between py-2 pe-6 ps-4',
            appService?.hasTrafficLight && 'pt-11',
          )}
        >
          <button
            aria-label={_('Go Back')}
            onClick={handleGoBack}
            className={clsx('btn btn-ghost h-12 min-h-12 w-12 p-0 sm:h-8 sm:min-h-8 sm:w-8')}
          >
            <IoArrowBack className='text-base-content' />
          </button>

          {appService?.hasWindowBar && (
            <WindowButtons
              headerRef={headerRef}
              showMinimize={!isTrafficLightVisible}
              showMaximize={!isTrafficLightVisible}
              showClose={!isTrafficLightVisible}
              onClose={handleGoBack}
            />
          )}
        </div>
        <div
          className={clsx(
            'z-20 flex flex-col items-center pb-8',
            appService?.hasTrafficLight ? 'mt-24' : 'mt-12',
          )}
          style={{ maxWidth: '420px' }}
        >
          <div className='w-full'>
            {emailAuthView === 'forgotten_password' ? emailAuthForgottenBack : emailAuthModeTabs}
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              theme={isDarkMode ? 'dark' : 'light'}
              view={emailAuthView}
              magicLink={true}
              showLinks={false}
              providers={[]}
              redirectTo={getSupabaseEmailRedirectTo()}
              localization={getAuthLocalization()}
            />
            {emailAuthView === 'sign_in' && (
              <div className='mt-2 flex w-full justify-center'>
                <button
                  type='button'
                  className='link link-hover text-base-content/70 text-sm'
                  onClick={() => setEmailAuthView('forgotten_password')}
                >
                  {_('Forgot your password?')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div style={{ maxWidth: '420px', margin: 'auto', padding: '2rem', paddingTop: '4rem' }}>
      <button
        onClick={handleGoBack}
        className='btn btn-ghost fixed left-6 top-6 h-8 min-h-8 w-8 p-0'
      >
        <IoArrowBack className='text-base-content' />
      </button>
      {emailAuthView === 'forgotten_password' ? emailAuthForgottenBack : emailAuthModeTabs}
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        theme={isDarkMode ? 'dark' : 'light'}
        view={emailAuthView}
        magicLink={true}
        showLinks={false}
        providers={[]}
        redirectTo={getSupabaseEmailRedirectTo()}
        localization={getAuthLocalization()}
      />
      {emailAuthView === 'sign_in' && (
        <div className='mt-2 flex justify-center'>
          <button
            type='button'
            className='link link-hover text-base-content/70 text-sm'
            onClick={() => setEmailAuthView('forgotten_password')}
          >
            {_('Forgot your password?')}
          </button>
        </div>
      )}
    </div>
  );
}
