import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Script from 'next/script';
import * as gtag from '../lib/gtag';
import { AuthProvider } from '../contexts/AuthContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import Navigation from '../components/layout/Navigation';
import Footer from '../components/layout/Footer';
import ProtectedRoute from '../components/ProtectedRoute';

// Define route configurations
const routes = {
  // Public routes (no auth required)
  public: [
    '/login',
    '/signin',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/404',
    '/500'
  ],
  // Auth required but no subscription needed
  authOnly: [
    '/subscription',
    '/checkout',
    '/profile',
    '/settings'
  ],
  // Admin only routes
  adminOnly: [
    '/admin',
    '/admin/upload-images',
    '/admin/manage-users',
    '/admin/manage-galleries',
    '/admin/generate',
    '/admin/config'
  ],
  // All other routes require both auth and subscription
  protected: true // Default for unlisted routes
};

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      gtag.pageview(url);
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  // Function to determine route requirements
  const getRouteRequirements = (path: string) => {
    // Get the base path without dynamic parameters
    const basePath = path.split('/[')[0];

    // Check if it's a public route
    if (routes.public.includes(basePath)) {
      return { requireAuth: false, requireSubscription: false, requireAdmin: false };
    }

    // Check if it's an auth-only route
    if (routes.authOnly.includes(basePath)) {
      return { requireAuth: true, requireSubscription: false, requireAdmin: false };
    }

    // Check if it's an admin route
    if (routes.adminOnly.includes(basePath)) {
      return { requireAuth: true, requireSubscription: false, requireAdmin: true };
    }

    // Default to protected route (requires auth and subscription)
    return { requireAuth: true, requireSubscription: true, requireAdmin: false };
  };

  // Determine if navigation should be hidden
  const shouldHideNavigation = () => {
    const basePath = router.pathname.split('/[')[0];
    return routes.public.includes(basePath);
  };

  const isAdminRoute = router.pathname.startsWith('/admin');

  // Get requirements for current route
  const requirements = getRouteRequirements(router.pathname);

  // Wrap component based on route requirements
  const getPageContent = () => {
    if (!requirements.requireAuth) {
      return <Component {...pageProps} />;
    }

    return (
      <ProtectedRoute
        requireAdmin={requirements.requireAdmin}
        requireSubscription={requirements.requireSubscription}
        fallbackPath={requirements.requireAdmin ? '/' : '/signin'}
      >
        <Component {...pageProps} />
      </ProtectedRoute>
    );
  };

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gtag.GA_TRACKING_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
      <AuthProvider>
        <SubscriptionProvider>
          <div className="h-[100dvh] flex flex-col bg-black overflow-x-hidden w-full max-w-full">
            {!shouldHideNavigation() && <Navigation />}
            <main
              className={`flex-1 overflow-x-hidden w-full max-w-full ${
                isAdminRoute ? 'overflow-hidden' : 'overflow-y-auto'
              }`}
            >
              {getPageContent()}
            </main>
            {/* Footer removed on global layout; pages can render their own footer */}
          </div>
        </SubscriptionProvider>
      </AuthProvider>
    </>
  );
}

export default MyApp;