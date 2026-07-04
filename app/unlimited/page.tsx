"use client";

import { Suspense } from "react";
import { HomeContent } from "../page";

export default function ArcadePage() {
  return (
    <Suspense>
      <HomeContent showOWTVBanner={true} />
    </Suspense>
  );
}
