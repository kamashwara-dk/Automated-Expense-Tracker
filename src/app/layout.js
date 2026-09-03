import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "My Valuta - Automated Expense Tracker",
  description: "Track and automate your personal expenses effortlessly with real-time financial intelligence",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "My Valuta",
    startupImage: [
      { url: "/icon-512.png", media: "(device-width: 390px) and (device-height: 844px)" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-16.png",  sizes: "16x16",   type: "image/png" },
      { url: "/icon-32.png",  sizes: "32x32",   type: "image/png" },
      { url: "/icon-48.png",  sizes: "48x48",   type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-144.png", sizes: "144x144", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: [{ url: "/icon-32.png", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#74FFAC",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* iOS PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="My Valuta" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {/* Apply theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var THEMES={dark:{'--background':'#070b12','--bg-card':'rgba(15,23,42,0.55)','--bg-header':'rgba(7,11,18,0.88)','--bg-nav':'rgba(7,11,18,0.92)','--bg-modal':'rgba(10,15,26,0.97)','--border-subtle':'rgba(255,255,255,0.07)'},midnight:{'--background':'#03060f','--bg-card':'rgba(6,14,35,0.70)','--bg-header':'rgba(3,6,15,0.94)','--bg-nav':'rgba(3,6,15,0.96)','--bg-modal':'rgba(4,8,20,0.98)','--border-subtle':'rgba(80,100,200,0.10)'}};
            var ACCENTS={mint:'#74FFAC',violet:'#a78bfa',sky:'#38bdf8',amber:'#fbbf24',rose:'#fb7185'};
            function hexRgb(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)].join(',');}
            try{
              var t=JSON.parse(localStorage.getItem('myvaluta-theme'))||'dark';
              var a=JSON.parse(localStorage.getItem('myvaluta-accent'))||'mint';
              var tv=THEMES[t]||THEMES.dark;
              var ah=ACCENTS[a]||ACCENTS.mint;
              var ar=hexRgb(ah);
              var r=document.documentElement;
              Object.keys(tv).forEach(function(k){r.style.setProperty(k,tv[k]);});
              r.style.setProperty('--accent',ah);
              r.style.setProperty('--accent-rgb',ar);
              r.style.setProperty('--accent-dim','rgba('+ar+',0.15)');
              document.body&&(document.body.style.backgroundColor=tv['--background']);
            }catch(e){}
          })();
        ` }} />
      </head>
      <body className="min-h-full flex flex-col text-slate-50" style={{ backgroundColor: 'var(--background)' }}>
        {children}
        {/* Service Worker Registration */}
        <Script
          id="sw-registration"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      console.log('[MyValuta] SW registered:', reg.scope);
                    })
                    .catch(function(err) {
                      console.warn('[MyValuta] SW registration failed:', err);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
