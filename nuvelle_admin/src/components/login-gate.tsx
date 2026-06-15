import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginGateProps = {
  onLogin: (username: string, password: string) => boolean;
};

export function LoginGate({ onLogin }: LoginGateProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!onLogin(username.trim(), password)) {
      setError("Wrong username or password.");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#1a1030_0%,#06070d_62%,#05060b_100%)] px-5 py-8 text-white">
      <section className="w-full max-w-[380px] text-center">
        <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] text-2xl font-black shadow-xl shadow-fuchsia-950/35">
          N
        </div>
        <h1 className="mt-4 text-[27px] font-bold tracking-normal">
          Nuvelle <span className="bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] bg-clip-text text-transparent">Scout</span>
        </h1>
        <p className="mt-2 text-sm text-[#9aa2c0]">AI Shorts selection dashboard - internal</p>
        <div className="mt-5 grid gap-2.5">
          <Input
            autoComplete="username"
            className="h-12 rounded-xl bg-[#0c0f1a]"
            placeholder="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <Input
            autoComplete="current-password"
            className="h-12 rounded-xl bg-[#0c0f1a]"
            placeholder="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submit();
              }
            }}
          />
          <Button className="h-12 rounded-xl" variant="gradient" onClick={submit}>
            Login
          </Button>
        </div>
        <div className="mt-2 h-5 text-xs text-[#ff7a7a]">{error}</div>
      </section>
    </main>
  );
}
