import type { Metadata, Viewport } from "next";
import { VendorProvider } from "@/context/useVendorStore";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import "./globals.css";


export const metadata: Metadata = {
  title: "VendorOS - Mobile POS & Restaurant Operating System",
  description: "The mobile-first operating system for tea stalls, burger stalls, food carts, and micro-restaurants.",
  alternates: {
    canonical: "https://vendoros.com"
  },
  openGraph: {
    title: "VendorOS - Mobile POS & Restaurant Operating System",
    description: "The mobile-first operating system for tea stalls, burger stalls, food carts, and micro-restaurants.",
    url: "https://vendoros.com",
    siteName: "VendorOS",
    images: [
      {
        url: "https://vendoros.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "VendorOS - The Hyper-Local Food Stall Operating System"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "VendorOS - Mobile POS & Restaurant Operating System",
    description: "The mobile-first operating system for tea stalls, burger stalls, food carts, and micro-restaurants.",
    images: ["https://vendoros.com/twitter-image.png"],
    creator: "@vendoros"
  },
  appleWebApp: {
    capable: true,
    title: "VendorOS",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FF6B35"
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "VendorOS",
  "url": "https://vendoros.com",
  "logo": "https://vendoros.com/logo.png",
  "description": "VendorOS is the mobile-first operating system and POS terminal for local food stalls, food trucks, and micro-restaurants.",
  "sameAs": [
    "https://twitter.com/vendoros"
  ]
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "VendorOS Cashier POS License",
  "image": "https://vendoros.com/og-image.png",
  "description": "Operating system and digital cashier terminal tailored for local food stalls, cafes, and street food vendors.",
  "brand": {
    "@type": "Brand",
    "name": "VendorOS"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://vendoros.com",
    "priceCurrency": "INR",
    "price": "499",
    "priceValidUntil": "2027-12-31",
    "availability": "https://schema.org/InStock"
  }
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How VendorOS is Revolutionizing Hyper-Local Food Stalls",
  "image": "https://vendoros.com/og-image.png",
  "author": {
    "@type": "Organization",
    "name": "VendorOS Product Team"
  },
  "publisher": {
    "@type": "Organization",
    "name": "VendorOS",
    "logo": {
      "@type": "ImageObject",
      "url": "https://vendoros.com/logo.png"
    }
  },
  "datePublished": "2026-06-09T08:00:00+05:30",
  "dateModified": "2026-06-20T17:00:00+05:30",
  "description": "A deep dive into how digital cashier terminals and real-time inventory management enable street food stalls to scale efficiently."
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is VendorOS?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "VendorOS is a hyper-local, mobile-first restaurant operating system and POS terminal designed for street food stalls, food trucks, chai shops, and micro-kitchens."
      }
    },
    {
      "@type": "Question",
      "name": "Does VendorOS work offline?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, VendorOS includes a secure local sandbox database which auto-synchronizes with Supabase cloud nodes once an active internet connection is detected."
      }
    },
    {
      "@type": "Question",
      "name": "How does QR ordering work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Customers can scan a dynamically generated QR code on their table to browse the digital menu and place orders directly to the kitchen queue, syncing in real-time with the cashier terminal."
      }
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('SW registered:', reg.scope);
                    
                    reg.addEventListener('updatefound', function() {
                      var newWorker = reg.installing;
                      if (newWorker) {
                        newWorker.addEventListener('statechange', function() {
                          if (newWorker.state === 'activated') {
                            console.log('New Service Worker active in background.');
                          }
                        });
                      }
                    });
                  }).catch(function(err) {
                    console.log('SW registration failed:', err);
                  });
                  
                  var refreshing = false;
                  navigator.serviceWorker.addEventListener('controllerchange', function() {
                    if (!refreshing) {
                      refreshing = true;
                      console.log('Service Worker controller changed.');
                    }
                  });
                });
              }
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-slate-50 dark:bg-[#0A0A0A] text-slate-900 dark:text-slate-50">
        <VendorProvider>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </VendorProvider>

        {/* ── SEO / AEO Visually Hidden Semantic Content Section ── */}
        <section 
          className="sr-only" 
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            borderWidth: 0
          }}
        >
          <h1>VendorOS: The Mobile-First Restaurant Operating System</h1>
          <p>
            Welcome to VendorOS, a comprehensive digital cashier terminal, POS system, and operating system tailored for local food stalls, food trucks, street vendors, and micro-restaurants. Our offline-first solution empowers small food businesses with enterprise-grade tools.
          </p>

          <h2>Core POS and Store Management Capabilities</h2>
          <ul>
            <li>
              <strong>Cashier POS Terminal:</strong> Take orders, process payments, and manage order status with high speed, even without an active internet connection.
            </li>
            <li>
              <strong>Dynamic QR Ordering Menu:</strong> Generate scan-to-order codes for tables, allowing customers to browse items and check out instantly.
            </li>
            <li>
              <strong>Real-Time Stock and Inventory Tracking:</strong> Prevent stockouts with automatic depletion calculations and restock alerts.
            </li>
            <li>
              <strong>AI Predictive Analytics:</strong> Forecast tomorrow's sales volume, anticipate shortages, and generate smart menu combo promotions.
            </li>
          </ul>

          <h2>Frequently Asked Questions (FAQ)</h2>
          <div>
            <h3>Does VendorOS support offline cashier mode?</h3>
            <p>
              Yes. VendorOS is designed with an offline-first architecture. It features a secure local sandbox database that saves all transactions, stock mutations, and orders locally. Once an internet connection is established, it automatically syncs all local changes to secure Supabase cloud nodes.
            </p>

            <h3>How can I set up QR table ordering?</h3>
            <p>
              From the admin dashboard, you can print dedicated QR codes for your stall's tables. Customers scan the QR code to access your digital menu, customize their order, and send it directly to the kitchen preparation queue.
            </p>

            <h3>What pricing options are available?</h3>
            <p>
              VendorOS offers a single operational StallOS POS License starting at ₹499 per month. The subscription includes unlimited orders, real-time sync, analytics reports, and inventory management. A 7-day free trial is included for all new vendors.
            </p>
          </div>

          <h2>Citation and Publisher Information</h2>
          <p>
            Published by the VendorOS Product Development & Engineering Group. Last updated and verified on June 20, 2026. Distributed by VendorOS SaaS Technologies Inc. Version 2.4.0 (Stable release).
          </p>
        </section>
      </body>

    </html>
  );
}
