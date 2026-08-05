import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./components/AuthProvider";
import { LanguageProvider } from "./components/LanguageProvider";
import { translations, LANG_COOKIE, type Lang } from "./i18n/translations";

async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return value === "zh" ? "zh" : "en";
}

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

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = (key: string) => translations[lang][key] ?? translations.en[key] ?? key;
  const title = t("meta.title");
  const description = t("meta.description");
  return {
    title,
    description,
    openGraph: {
      title,
      description,
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
      title,
      description,
      images: ["/owcsletn.png"],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLang();
  return (
    <html lang={lang} suppressHydrationWarning className={undefined}>
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
          <LanguageProvider initialLang={lang}>
            <AuthProvider>
              {children}
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
