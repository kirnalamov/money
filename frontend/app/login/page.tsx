"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { AuthShell } from "@/components/auth/auth-shell";
import { Fld, fldInput, GhostBtn, Lbl, PrimaryBtn } from "@/components/ui/modal-kit";

export default function LoginPage() {
    const { login, isLoading } = useAuth();
    const { t } = useTranslation();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [error, setError] = useState("");
    const demoModeEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

    const fillDemoCredentials = () => {
        setUsername("demo");
        setPassword("DemoPass123!");
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!username || !password) {
            setError(t("auth.required_fields"));
            return;
        }

        try {
            await login(username, password);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t("auth.login_failed"));
        }
    };

    return (
        <AuthShell
            title={t("auth.login_title")}
            subtitle={t("auth.login_description")}
            footer={
                <>
                    {t("auth.no_account")}{" "}
                    <Link href="/register" className="inline-flex min-h-11 items-center font-semibold text-[#C6F24E] no-underline hover:text-[#E2FF92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]">
                        {t("auth.sign_up")}
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                {error && (
                    <div role="alert" className="rounded-xl border border-[#F87171]/30 bg-[#F87171]/[0.08] px-4 py-3 text-[13.5px] text-[#FCA5A5]">
                        {error}
                    </div>
                )}

                <div>
                    <Lbl htmlFor="username">{t("auth.username_or_email")}</Lbl>
                    <Fld prefix={<User className="h-4 w-4 text-[#8D9388]" aria-hidden="true" />}>
                        <input
                            id="username"
                            type="text"
                            className={fldInput}
                            placeholder={t("auth.username_placeholder")}
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </Fld>
                </div>

                <div>
                    <Lbl htmlFor="password">{t("auth.password")}</Lbl>
                    <Fld
                        prefix={<Lock className="h-4 w-4 text-[#8D9388]" aria-hidden="true" />}
                        suffix={
                            <button
                                type="button"
                                onClick={() => setShow((v) => !v)}
                                aria-label={show ? t("auth.hide_password", "Скрыть пароль") : t("auth.show_password", "Показать пароль")}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D9388] hover:bg-[#1B1E1A] hover:text-[#F1F3EE]"
                            >
                                {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                            </button>
                        }
                    >
                        <input
                            id="password"
                            type={show ? "text" : "password"}
                            className={fldInput}
                            placeholder={t("auth.password_placeholder")}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </Fld>
                </div>

                <PrimaryBtn type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                        <span className="inline-flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            {t("auth.logging_in")}
                        </span>
                    ) : (
                        t("auth.login")
                    )}
                </PrimaryBtn>

                {demoModeEnabled && (
                    <GhostBtn className="w-full" onClick={fillDemoCredentials} disabled={isLoading}>
                        {t("auth.demo_account")}
                    </GhostBtn>
                )}
            </form>
        </AuthShell>
    );
}
