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

  // Define routes where navigation should be hidden
  const hideNavigation = [
    '/login',
    '/signin',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/404',
    '/500',
    '/subscription'
  ].includes(router.pathname);

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
          <div className="min-h-screen flex flex-col bg-black">
            {!hideNavigation && <Navigation />}
            <main className="flex-grow">
              <Component {...pageProps} />
            </main>
            <Footer />
          </div>
        </SubscriptionProvider>
      </AuthProvider>
    </>
  );
}

export default MyApp;