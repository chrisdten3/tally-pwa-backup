import { redirect } from "next/navigation";

export default function Home() {
  // Redirect root to the auth flow so login/signup is the first page.
  redirect("/login");
}
