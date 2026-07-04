import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OWCSLE USA OWWC",
  description: "Guess the USA OWWC player.",
  openGraph: {
    title: "OWCSLE USA OWWC",
    description: "Guess the USA OWWC player.",
    url: "https://usa.owcsle.xyz",
    images: [
      {
        url: "/images/Nail_679x382.png",
        width: 679,
        height: 382,
        alt: "OWCSLE USA OWWC",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OWCSLE USA OWWC",
    description: "Guess the USA OWWC player in 6 tries.",
    images: ["/images/Nail_679x382.png"],
  },
};

export default function UsaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
