import React from "react";
import { getCurrentDbUser } from "@/lib/auth";
import LandingClientPage from "./LandingClientPage";

export default async function Home() {
  const user = await getCurrentDbUser();
  return <LandingClientPage user={user} />;
}
