import { BrainCircuit, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { LoginPopup } from "@/components/loginPopup.tsx";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center">
        <Link className="flex items-center justify-center" to="#">
          <BrainCircuit className="h-6 w-6 mr-2" />
          <span className="font-bold">Quizzma</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <LoginPopup
            buttonProps={{
              variant: "ghost",
              className: "font-sm",
              children: "Login",
            }}
          />
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Welcome to Quizzma
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  The new way to teach dynamically
                </p>
              </div>
              <div className="space-y-2">
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Capture open-ended questions in a live classroom setting and
                  engage your students like never before.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <LoginPopup
                  buttonProps={{
                    variant: "default",
                    className: "w-full max-w-sm space-y-2",
                    children: "Get started",
                    size: "lg",
                  }}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Try it free for 30 days. No credit card required.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                  Why Choose Quizzma?
                </h2>
                <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Revolutionize your classroom with our innovative approach to
                  student engagement.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col items-center space-y-4">
                <Users className="h-10 w-10" />
                <h3 className="text-xl font-bold">Interactive Learning</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Encourage participation and foster a dynamic learning
                  environment.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <BrainCircuit className="h-10 w-10" />
                <h3 className="text-xl font-bold">Real-time Insights</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Gain immediate understanding of student comprehension and
                  engagement.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <Users className="h-10 w-10" />
                <h3 className="text-xl font-bold">Personalized Teaching</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Adapt your teaching style based on real-time student feedback
                  and questions.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          © 2024 Quizzma. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" to="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" to="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
