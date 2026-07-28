import { redirect } from "next/navigation";

// Root redirect ke admin panel
export default function Home() {
  redirect("/admin");
}
