"use client";

import { useEffect, useState } from "react";
import CookieConsent, { getCookieConsentValue } from "react-cookie-consent";

export default function CookieConsentBanner() {
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    if (getCookieConsentValue("cookie_consent") === "true") {
      setConsentGiven(true);
    }
  }, []);

  return (
    <>
      {/* Google Tag Manager - This will only run if consent is given */}
      {consentGiven && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (document.cookie.includes('cookie_consent=true')) {
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
                var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
                j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id=GTM-W79DN38R';
                f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','GTM-W79DN38R');
              }
            `,
          }}
        />
      )}

      {/* Cookie Consent Banner */}
      <CookieConsent
        location="bottom"
        buttonText="Accept"
        declineButtonText="Decline"
        enableDeclineButton
        cookieName="cookie_consent"
        style={{ background: "#2B373B", color: "#ffffff", textAlign: "center" }}
        buttonStyle={{ background: "#4CAF50", color: "#ffffff", fontSize: "14px" }}
        declineButtonStyle={{ background: "#f44336", color: "#ffffff", fontSize: "14px" }}
        expires={365}
        onAccept={() => {
          document.cookie = "cookie_consent=true; path=/; max-age=" + 60 * 60 * 24 * 365;
          setConsentGiven(true);
          window.location.reload();
        }}
        onDecline={() => {
          document.cookie = "cookie_consent=false; path=/; max-age=" + 60 * 60 * 24 * 365;
          setConsentGiven(false);
          window.location.reload();
        }}
      >
        We use cookies for analytics to improve our website experience. By clicking "Accept", you consent to
        data collection.
      </CookieConsent>
    </>
  );
}
