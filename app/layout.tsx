import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const posterGothic = localFont({
  src: "../public/fonts/Poster_Gothic_Round_ATF_Heavy.otf",
  variable: "--font-poster-gothic",
});

const owEsports = localFont({
  src: "../public/fonts/Config_Bold.otf",
  variable: "--font-ow-esports",
});

export const metadata: Metadata = {
  title: "OWCSLE",
  description: "Guess the Overwatch Champion Series player.",
  openGraph: {
    title: "OWCSLE",
    description: "Guess the Overwatch Champion Series player.",
    images: [
      {
        url: "/owcsletn.png",
        width: 1920,
        height: 1080,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OWCSLE",
    description: "Guess the Overwatch Champion Series player.",
    images: ["/owcsletn.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={undefined}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (!theme) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.setProperty('background-color', 'rgb(10, 10, 10)', 'important');
                    document.documentElement.style.setProperty('color-scheme', 'dark');
                  } else {
                    document.documentElement.style.setProperty('background-color', 'rgb(243, 244, 246)', 'important');
                    document.documentElement.style.setProperty('color-scheme', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${posterGothic.variable} ${owEsports.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
