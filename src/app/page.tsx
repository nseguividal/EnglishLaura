import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  GraduationCap,
  Layers,
  LockOpen,
  SplitSquareHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserProfile } from "@/lib/auth";

export default async function HomePage() {
  const { user, profile } = await getCurrentUserProfile();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 font-bold text-[#0f2544]">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0f2544] text-white">
              <BookOpenCheck className="h-5 w-5" />
            </span>
            <span className="text-lg tracking-tight">
              Cambridge<span className="text-[#0f766e]">Prep</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild>
                <Link
                  href={profile?.role === "admin" ? "/admin" : "/dashboard"}
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button variant="accent" asChild>
                  <Link href="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <Badge variant="success" className="mb-6 px-3 py-1 text-xs">
              <GraduationCap className="h-3.5 w-3.5" />
              B2 First (FCE) &amp; C1 Advanced (CAE) Exam Preparation
            </Badge>
            <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-[#0f2544] sm:text-5xl lg:text-6xl">
              Master Cambridge English,{" "}
              <span className="text-[#0f766e]">one sequential step</span> at a
              time.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              A structured learning path covering Reading, Listening, Writing,
              Grammar, Vocabulary, and Use of English — with instant
              auto-grading, split-screen passages, mistake reviews, and live
              analytics.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" variant="default" asChild>
                <Link href={user ? "/dashboard" : "/signup"}>
                  Start Your Study Path
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Student &amp; Teacher Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: LockOpen,
                title: "Sequential Step Path",
                desc: "Unlock each weekly module by completing 100% of the prior step's assignments.",
              },
              {
                icon: SplitSquareHorizontal,
                title: "Split-Screen Exam Mode",
                desc: "Sticky reading passages, video embeds, and audio players side-by-side with questions.",
              },
              {
                icon: CheckCircle2,
                title: "Instant Mistake Review",
                desc: "Auto-graded Multiple Choice and Use of English fill-in-the-blanks with explanations.",
              },
              {
                icon: BarChart3,
                title: "Skill Analytics & Writing",
                desc: "Track category scores with Recharts and write timed essays with live word counters.",
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f2544]/5 text-[#0f766e]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#0f2544]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0f766e]">
                <Layers className="h-4 w-4" />
                Level Track 1
              </div>
              <h2 className="mt-2 text-2xl font-bold text-[#0f2544]">
                B2 First (FCE)
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Build upper-intermediate fluency with B2 Reading Part 5–7
                strategies, word formation, key word transformations, and
                140–190 word essays.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0f766e]">
                <Layers className="h-4 w-4" />
                Level Track 2
              </div>
              <h2 className="mt-2 text-2xl font-bold text-[#0f2544]">
                C1 Advanced (CAE)
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Sharpen academic precision with C1 inference reading, inversion
                transformations, nuanced listening, and 220–260 word formal
                essays.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
