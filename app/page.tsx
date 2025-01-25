import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import RegisterIcon from "@/public/images/shape-47.png";
import LoginIcon from "@/public/images/Shapes 2.png";
import WitchHouseLogo from "@/public/images/Shapes 14.png";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation - more subtle with refined spacing */}
      <nav className="flex items-center justify-between px-8 py-6 w-full">
        <Link href="/" className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/5 p-1">
            <Image
              src={WitchHouseLogo}
              alt="Witch House"
              width={28}
              height={28}
              className="h-7 w-7"
            />
          </div>
          <span className="text-xl font-semibold tracking-tight">
            Witch House
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" className="flex items-center gap-1.5">
              <Image
                src={LoginIcon}
                alt="Login"
                width={18}
                height={18}
                className="opacity-80"
              />
              <span>Login</span>
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="default" className="flex items-center gap-1.5">
              <Image
                src={RegisterIcon}
                alt="Register"
                width={18}
                height={18}
                className="opacity-90"
              />
              <span>Register</span>
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section - improved vertical rhythm */}
      <div className="grid flex-1 lg:grid-cols-2">
        <div className="flex flex-col justify-center px-8 py-16 lg:px-16">
          <div className="max-w-xl space-y-8">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Customer Support Made Simple
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Streamline your customer support with our powerful help desk
              solution. Start managing tickets efficiently today.
            </p>
            <div className="flex gap-3 pt-4">
              <Button size="lg" className="h-11" asChild>
                <Link href="/register" className="flex items-center">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 opacity-90" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-11" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Right side image - improved contrast and sizing */}
        <div className="relative hidden bg-background bg-gradient-to-b from-background via-primary/5 to-background rounded-lg lg:block">
          <Image
            src={WitchHouseLogo}
            alt="Witch House Illustration"
            className="absolute inset-0 h-full w-full object-cover object-center"
            priority
            width={1200}
            height={1200}
          />
        </div>
      </div>
    </div>
  );
}
