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
      </body>

    </html>
  );
}
