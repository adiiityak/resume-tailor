import { redirect } from "next/navigation";
import GitHubSignInButton from "@/components/auth/GitHubSignInButton";
import { safeReturnPath } from "@/lib/auth/access";
import { usesDatabaseStorage } from "@/lib/store/shared";

export const metadata = {
  title: "Sign in · Resume Tailor",
  description: "Sign in to your private Resume Tailor workspace.",
};

export default async function SignInPage({ searchParams }) {
  if (!usesDatabaseStorage()) redirect("/");

  const params = await searchParams;
  const callbackUrl = safeReturnPath(params?.callbackUrl);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9" aria-labelledby="sign-in-title">
        <div className="mb-6 grid h-11 w-11 place-items-center rounded-xl bg-slate-900 text-sm font-bold text-white" aria-hidden="true">RT</div>
        <h1 id="sign-in-title" className="text-2xl font-semibold tracking-tight text-slate-950">Open your private workspace</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sign in with GitHub to access your resumes, job applications, contacts, and interview preparation.
        </p>

        <div className="mt-7">
          <GitHubSignInButton callbackUrl={callbackUrl} />
        </div>

        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
          Your records are isolated by account. Resume content is only sent to Anthropic when you explicitly use Claude API mode.
        </div>
      </section>
    </main>
  );
}
