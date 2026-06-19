import { useState } from "react";
import { LanguageSwitcher } from "@/i18n/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import type { LoginRequest, RegisterRequest } from "@/types/drama";

type LoginGateProps = {
  onLogin: (payload: LoginRequest) => Promise<void>;
  onRegister: (payload: RegisterRequest) => Promise<void>;
};

export function LoginGate({ onLogin, onRegister }: LoginGateProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError("");
    setSubmitting(true);

    try {
      if (mode === "register") {
        await onRegister({ invite_code: inviteCode.trim(), email: email.trim(), password });
      } else {
        await onLogin({ email: email.trim(), password });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("app.authFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#1a1030_0%,#06070d_62%,#05060b_100%)] px-5 py-8 text-white">
      <div className="absolute right-5 top-5">
        <LanguageSwitcher />
      </div>
      <section className="w-full max-w-[380px] text-center">
        <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] text-2xl font-black shadow-xl shadow-fuchsia-950/35">
          N
        </div>
        <h1 className="mt-4 text-[27px] font-bold tracking-normal">
          Nuvelle <span className="bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] bg-clip-text text-transparent">Scout</span>
        </h1>
        <p className="mt-2 text-sm text-[#9aa2c0]">{t("login.subtitle")}</p>
        <div className="mt-5 grid gap-2.5">
          {mode === "register" ? (
            <Input
              autoComplete="one-time-code"
              className="h-12 rounded-xl bg-[#0c0f1a]"
              placeholder={t("login.inviteCode")}
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
            />
          ) : null}
          <Input
            autoComplete="email"
            className="h-12 rounded-xl bg-[#0c0f1a]"
            placeholder={t("login.email")}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            className="h-12 rounded-xl bg-[#0c0f1a]"
            placeholder={t("login.password")}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void submit();
              }
            }}
          />
          <Button className="h-12 rounded-xl" disabled={submitting} variant="gradient" onClick={() => void submit()}>
            {mode === "register" ? t("login.register") : t("login.login")}
          </Button>
          <Button
            className="h-11 rounded-xl"
            type="button"
            variant="ghost"
            onClick={() => {
              setError("");
              setMode(mode === "register" ? "login" : "register");
            }}
          >
            {mode === "register" ? t("login.back") : t("login.createAccount")}
          </Button>
        </div>
        <div className="mt-2 h-5 text-xs text-[#ff7a7a]">{error}</div>
      </section>
    </main>
  );
}
