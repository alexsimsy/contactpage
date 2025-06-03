'use client';

import Image from 'next/image';
import Script from 'next/script';
import { useEffect, useState } from 'react';

export default function Home() {
  const [hasClientId, setHasClientId] = useState<boolean | null>(null);
  const [isStripeLoaded, setIsStripeLoaded] = useState(false);

  useEffect(() => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const CLIENT = urlParams.get('client_reference_id');
    setHasClientId(!!CLIENT);
  }, []);

  if (hasClientId === null) {
    return null; // Loading state
  }

  if (!hasClientId) {
    return (
      <main className="min-h-screen bg-navy text-text-primary flex flex-col">
        <div className="bg-brand-blue p-8">
          <div className="flex justify-center mb-8">
            <div className="relative w-48 h-16">
              <Image
                src="/simsy-logo.png"
                alt="SIMSY Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
            <p className="text-lg">A topup is not possible as the Customer Reference Identifier was not supplied.</p>
          </div>
        </div>

        <footer className="bg-brand-blue p-8 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">S-IMSY</h2>
            <p className="text-lg mb-4">Your mobile network. Open. Secure. Programmable.</p>
            <div className="text-sm">
              <p>S-IMSY Ltd</p>
              <p>Registered in England & Wales</p>
              <p>Company Reg No.: 15594994</p>
            </div>
          </div>
        </footer>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-navy text-text-primary flex flex-col">
      <div className="bg-brand-blue p-8">
        <div className="flex justify-center mb-8">
          <div className="relative w-48 h-16">
            <Image
              src="/simsy-logo.png"
              alt="SIMSY Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex-grow">
        {isStripeLoaded && (
          <stripe-pricing-table 
            id="spt" 
            pricing-table-id="prctbl_1Qwg1HP2tDGLRpd65lHQatAQ"
            publishable-key="pk_live_51P11JmP2tDGLRpd6EpUNPSd0XxxGistCYxhBa2YMBbkeJWnd5iwpOoqcv1OsZhXNsqJiYMU8LVMY3srtHb87Y1Uz00NMGCFNnP"
            client-reference-id="fromuri"
            customer-email="fromuri">
          </stripe-pricing-table>
        )}
      </div>

      <footer className="bg-brand-blue p-8 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">S-IMSY</h2>
          <p className="text-lg mb-4">Your mobile network. Open. Secure. Programmable.</p>
          <div className="text-sm">
            <p>S-IMSY Ltd</p>
            <p>Registered in England & Wales</p>
            <p>Company Reg No.: 15594994</p>
          </div>
        </div>
      </footer>

      <Script 
        src="https://js.stripe.com/v3/pricing-table.js" 
        strategy="afterInteractive"
        onLoad={() => {
          setIsStripeLoaded(true);
          const queryString = window.location.search;
          const urlParams = new URLSearchParams(queryString);
          const CLIENT = urlParams.get('client_reference_id');
          const EMAIL = urlParams.get('prefilled_email');
          const spt = document.getElementById("spt");
          if (spt) {
            spt.setAttribute('client-reference-id', CLIENT || '');
            spt.setAttribute('customer-email', EMAIL || '');
          }
        }}
      />
    </main>
  );
}
