import Image from "next/image";

import RegisterForm from "@/components/auth/RegisterForm";
import WitchHouseLogo from "@/public/images/Shapes 14.png";

export default function RegisterPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div
        className="absolute inset-0 h-full w-full"
        style={{ transform: "translate3d(0, 0, 0)" }}
      ></div>
      <div className="z-10 w-full max-w-lg">
        <div className="flex flex-col justify-center items-center space-y-6">
          <div className="flex flex-col items-center space-y-2">
            <Image
              src={WitchHouseLogo}
              alt="Witch House"
              width={80}
              height={80}
              style={{ width: "auto", height: "80px" }}
              priority
            />
            <h1 className="text-2xl font-bold tracking-tight">Witch House</h1>
          </div>
          <div className="w-full px-8">
            <div className="grid gap-6">
              <div className="flex h-20 items-end pb-6 justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Create your account
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Enter your details below to create your account
                  </p>
                </div>
              </div>
              <RegisterForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
