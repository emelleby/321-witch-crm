"use client";

import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/auth/LoginForm";
import WitchHouseLogo from "@/public/images/Shapes 14.png";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-transparent text-primary-foreground">
              <Image
                src={WitchHouseLogo}
                alt="Witch House"
                width={32}
                height={32}
              />
            </div>
            Witch House
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-background lg:block">
        <Image
          src={WitchHouseLogo}
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.8]"
          width={1000}
          height={1000}
        />
      </div>
    </div>
  );
}
