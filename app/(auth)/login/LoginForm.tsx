"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RC_PUBLIC_URL } from "@/lib/rc/config";
import { cn } from "cn";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

const credentialsSchema = z.object({
  user: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

type CredentialsForm = z.infer<typeof credentialsSchema>;

export default function LoginForm({
  logoUrl,
  siteName,
  keycloakEnabled,
}: {
  logoUrl: string;
  siteName: string;
  keycloakEnabled: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [showPassword, setShowPassword] = useState(false);
  // RC's own asset endpoint can be transiently unreachable (observed during
  // GATE 6 testing when the RC dev server itself was down) — fail
  // gracefully to the site name alone rather than a broken-image icon.
  const [logoFailed, setLogoFailed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [needsTwoFa, setNeedsTwoFa] = useState<{ method: string } | null>(null);
  const [twoFaCode, setTwoFaCode] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsSchema),
  });

  async function onSubmit(values: CredentialsForm) {
    setFormError(null);
    try {
      const res = await fetch("/api/rc/session/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(needsTwoFa ? { "X-2fa-code": twoFaCode, "X-2fa-method": needsTwoFa.method } : {}),
        },
        body: JSON.stringify(values),
      });
      const body = await res.json();

      if (res.ok && body.success) {
        router.push(from);
        return;
      }

      const errorCode = body?.error === "totp-required" || body?.error?.error === "totp-required";
      if (errorCode) {
        setNeedsTwoFa({ method: body?.details?.method ?? "totp" });
        return;
      }

      setFormError(
        res.status === 401
          ? "Incorrect email/username or password."
          : (body?.error ?? "Login failed. Please try again."),
      );
    } catch {
      setFormError("Can't reach the server right now. Check your connection and try again.");
    }
  }

  return (
    <main className="flex min-h-dvh">
      {/* Form column — eprisi-theme/tokens.json layout.login (orientation:
          horizontal, asideWidth: 50%, bg: surface.light) */}
      <div className="relative isolate flex w-full flex-col justify-between overflow-hidden bg-background px-6 py-10 sm:px-12 md:w-1/2 md:px-16 lg:px-24">
        {/* Decorative watermark — mockups/rocketchat/watermark-gear.jpg,
            bottom-left of the form panel per the mockup. Purely
            decorative (aria-hidden), never obstructs form content
            (negative offset + low z-index). */}
        <Image
          src="/images/watermark-gear.png"
          alt=""
          aria-hidden
          width={422}
          height={422}
          className="pointer-events-none absolute -bottom-24 -left-24 -z-10 opacity-60"
        />
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-start gap-12 pt-4 md:gap-20 md:pt-12">
          <div className="flex items-center gap-2">
            {logoUrl && !logoFailed && (
              <Image
                src={logoUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0"
                unoptimized
                onError={() => setLogoFailed(true)}
              />
            )}
            <span className="font-heading text-lg font-bold text-foreground">{siteName}</span>
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-1.5">
              <h1 className="font-heading text-[2rem] leading-tight font-bold text-foreground">
                Login to {siteName}
              </h1>
              <p className="text-sm text-muted-foreground">Collaborate and communicate in a secure environment.</p>
            </div>

            {formError && (
              <Alert variant="destructive" role="alert" aria-live="assertive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user">Email or username</Label>
                <Input
                  id="user"
                  autoComplete="username"
                  placeholder={`example@${siteName.toLowerCase().replace(/\s+/g, "")}.com`}
                  aria-invalid={Boolean(errors.user)}
                  aria-describedby={errors.user ? "user-error" : undefined}
                  disabled={isSubmitting}
                  className="h-10 border-transparent bg-secondary"
                  {...register("user")}
                />
                {errors.user && (
                  <p id="user-error" role="alert" className="text-xs text-destructive">
                    {errors.user.message}
                  </p>
                )}
              </div>

              <div className="relative flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    disabled={isSubmitting}
                    className="h-10 border-transparent bg-secondary pr-9"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {/* Placed after the input in DOM (not in a flex row before
                    it) so tab order goes username -> password -> show/hide
                    -> this link, never password -> this link -> show/hide —
                    visually repositioned to top-right via absolute
                    positioning against the outer `relative` container. */}
                <a
                  href={`${RC_PUBLIC_URL}/forgot-password`}
                  className="absolute top-0 right-0 text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  Forgot your password?
                </a>
                {errors.password && (
                  <p id="password-error" role="alert" className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {needsTwoFa && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="twoFaCode">Two-factor code ({needsTwoFa.method})</Label>
                  <Input
                    id="twoFaCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value)}
                    disabled={isSubmitting}
                    className="h-10 border-transparent bg-secondary"
                  />
                </div>
              )}

              <Button type="submit" size="lg" className="mt-1 h-10 text-base" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Logging in…
                  </>
                ) : (
                  "Login"
                )}
              </Button>

              {keycloakEnabled && (
                <>
                  <Separator />
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className={cn("h-10 text-base")}
                    onClick={() => signIn("keycloak", { callbackUrl: from })}
                    disabled={isSubmitting}
                  >
                    <KeyRound className="size-4 text-eprisi-accent" />
                    Login with {siteName} Account
                  </Button>
                </>
              )}
            </form>

            <p className="text-sm text-muted-foreground">
              New here?{" "}
              <a
                href={`${RC_PUBLIC_URL}/register`}
                className="font-medium text-primary underline underline-offset-2"
              >
                Create an account
              </a>
            </p>
          </div>
        </div>

        <p className="mx-auto w-full max-w-[420px] text-xs text-muted-foreground">
          © {new Date().getFullYear()} {siteName.replace(/\s*Chat$/i, "")} — By proceeding you are agreeing to our{" "}
          <a href={`${RC_PUBLIC_URL}/terms-of-service`} className="underline underline-offset-2">
            Terms of Service
          </a>
          ,{" "}
          <a href={`${RC_PUBLIC_URL}/privacy-policy`} className="underline underline-offset-2">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href={`${RC_PUBLIC_URL}/legal-notice`} className="underline underline-offset-2">
            Legal Notice
          </a>
          .
        </p>
      </div>

      {/* Image column — decorative, hidden below md per mockup's desktop-only
          split-view (a stacked photo panel below the form serves no purpose
          on a narrow viewport). eprisi-theme/tokens.json has no mobile
          variant for this panel to match against. */}
      <div className="relative hidden w-1/2 md:block">
        <Image
          src="/images/login-background.png"
          alt=""
          fill
          sizes="50vw"
          priority
          className="object-cover grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-10 lg:p-16">
          <h2 className="font-heading text-2xl font-bold text-white lg:text-3xl">Secure Real-time Collaboration</h2>
          <p className="max-w-md text-sm text-white/80">
            Empower your team with institutional-grade messaging, instant secure rooms, and file sharing backed by
            modern encryption keys.
          </p>
        </div>
      </div>
    </main>
  );
}
