"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Check, Eye, EyeOff, Loader2, Lock, Mail, User, UserRound } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { AuthShell } from "@/components/auth/auth-shell";
import { Fld, fldInput, Lbl, PrimaryBtn } from "@/components/ui/modal-kit";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
    const { register, isLoading } = useAuth();
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
        full_name: "",
    });
    const [show, setShow] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const rules = [
        { ok: formData.password.length >= 8, label: t("auth.rule_length", "От 8 символов") },
        { ok: /[A-Z]/.test(formData.password), label: t("auth.rule_upper", "Заглавная буква") },
        { ok: /[a-z]/.test(formData.password), label: t("auth.rule_lower", "Строчная буква") },
        { ok: /[0-9]/.test(formData.password), label: t("auth.rule_digit", "Цифра") },
    ];

    const validatePassword = (password: string): string | null => {
        if (password.length < 8) {
            return t("auth.password_min_length");
        }
        if (!/[A-Z]/.test(password)) {
            return t("auth.password_uppercase");
        }
        if (!/[a-z]/.test(password)) {
            return t("auth.password_lowercase");
        }
        if (!/[0-9]/.test(password)) {
            return t("auth.password_digit");
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        if (!formData.email || !formData.username || !formData.password) {
            setError(t("auth.required_fields"));
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError(t("auth.passwords_do_not_match"));
            return;
        }

        const passwordError = validatePassword(formData.password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        try {
            await register({
                email: formData.email,
                username: formData.username,
                password: formData.password,
                full_name: formData.full_name || undefined,
            });
            setSuccess(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t("auth.registration_failed"));
        }
    };

    if (success) {
        return (
            <AuthShell
                title={t("auth.registration_successful")}
                subtitle={t("auth.account_created")}
                footer={null}
            >
                <div className="flex flex-col items-center gap-5 rounded-[20px] border border-[#232721] bg-[#151714] px-6 py-8 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C6F24E] text-[#10170A]">
                        <Check className="h-7 w-7" strokeWidth={2.6} aria-hidden="true" />
                    </span>
                    <Link href="/login" className="inline-flex h-[46px] items-center justify-center rounded-xl bg-[#C6F24E] px-6 text-sm font-bold text-[#10170A] no-underline hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E0F0E]">
                        {t("auth.go_to_login")}
                    </Link>
                </div>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title={t("auth.register_title")}
            subtitle={t("auth.register_description")}
            footer={
                <>
                    {t("auth.has_account")}{" "}
                    <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-[#C6F24E] no-underline hover:text-[#E2FF92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]">
                        {t("auth.log_in")}
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                {error && (
                    <div role="alert" className="rounded-xl border border-[#F87171]/30 bg-[#F87171]/[0.08] px-4 py-3 text-[13.5px] text-[#FCA5A5]">
                        {error}
                    </div>
                )}

                <div>
                    <Lbl htmlFor="email">{t("auth.email")}</Lbl>
                    <Fld prefix={<Mail className="h-4 w-4 text-[#8D9388]" aria-hidden="true" />}>
                        <input id="email" name="email" type="email" className={fldInput} autoComplete="email" placeholder={t("auth.email_placeholder")} value={formData.email} onChange={handleChange} disabled={isLoading} required />
                    </Fld>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Lbl htmlFor="username">{t("auth.username")}</Lbl>
                        <Fld prefix={<User className="h-4 w-4 text-[#8D9388]" aria-hidden="true" />}>
                            <input id="username" name="username" type="text" className={fldInput} autoComplete="username" placeholder={t("auth.choose_username")} value={formData.username} onChange={handleChange} disabled={isLoading} required />
                        </Fld>
                    </div>
                    <div>
                        <Lbl htmlFor="full_name" hint={t("dialogs.optional", "необязательно")}>{t("auth.full_name")}</Lbl>
                        <Fld prefix={<UserRound className="h-4 w-4 text-[#8D9388]" aria-hidden="true" />}>
                            <input id="full_name" name="full_name" type="text" className={fldInput} autoComplete="name" placeholder={t("auth.full_name_placeholder")} value={formData.full_name} onChange={handleChange} disabled={isLoading} />
                        </Fld>
                    </div>
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
                        <input id="password" name="password" type={show ? "text" : "password"} className={fldInput} autoComplete="new-password" placeholder={t("auth.create_password")} value={formData.password} onChange={handleChange} disabled={isLoading} required />
                    </Fld>
                    <ul className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5" aria-label={t("auth.password_hint")}>
                        {rules.map((r) => (
                            <li key={r.label} className={cn("flex items-center gap-2 text-[12.5px]", r.ok ? "text-[#6EE7A0]" : "text-[#8D9388]")}>
                                <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border", r.ok ? "border-[#6EE7A0] bg-[#6EE7A0]/15" : "border-[#2A2E27]")}>
                                    {r.ok && <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />}
                                </span>
                                {r.label}
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <Lbl htmlFor="confirmPassword">{t("auth.confirm_password")}</Lbl>
                    <Fld prefix={<Lock className="h-4 w-4 text-[#8D9388]" aria-hidden="true" />}>
                        <input id="confirmPassword" name="confirmPassword" type={show ? "text" : "password"} className={fldInput} autoComplete="new-password" placeholder={t("auth.confirm_password_placeholder")} value={formData.confirmPassword} onChange={handleChange} disabled={isLoading} required />
                    </Fld>
                </div>

                <PrimaryBtn type="submit" className="mt-1 w-full" disabled={isLoading}>
                    {isLoading ? (
                        <span className="inline-flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            {t("auth.creating_account")}
                        </span>
                    ) : (
                        t("auth.create_account")
                    )}
                </PrimaryBtn>
            </form>
        </AuthShell>
    );
}
