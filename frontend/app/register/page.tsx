"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

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
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

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

        // Validation
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
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md rounded-2xl border bg-card">
                    <CardHeader className="space-y-1">
                        <div className="flex justify-center mb-4">
                            <CheckCircle2 className="h-16 w-16 text-income" />
                        </div>
                        <h2 className="text-center text-2xl font-bold">{t("auth.registration_successful")}</h2>
                        <CardDescription className="text-center">
                            {t("auth.account_created")}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Button asChild>
                            <Link href="/login" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">{t("auth.go_to_login")}</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md rounded-2xl border bg-card">
                <CardHeader className="space-y-1">
                    <h2 className="text-center text-2xl font-bold">{t("auth.register_title")}</h2>
                    <CardDescription className="text-center">
                        {t("auth.register_description")}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">{t("auth.email")} *</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder={t("auth.email_placeholder")}
                                value={formData.email}
                                onChange={handleChange}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">{t("auth.username")} *</Label>
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                placeholder={t("auth.choose_username")}
                                value={formData.username}
                                onChange={handleChange}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="full_name">{t("auth.full_name")}</Label>
                            <Input
                                id="full_name"
                                name="full_name"
                                type="text"
                                autoComplete="name"
                                placeholder={t("auth.full_name_placeholder")}
                                value={formData.full_name}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">{t("auth.password")} *</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                placeholder={t("auth.create_password")}
                                value={formData.password}
                                onChange={handleChange}
                                disabled={isLoading}
                                required
                            />
                            <p className="text-sm text-muted-foreground">
                                {t("auth.password_hint")}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">{t("auth.confirm_password")} *</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                placeholder={t("auth.confirm_password_placeholder")}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                disabled={isLoading}
                                required
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-4">
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t("auth.creating_account")}
                                </>
                            ) : (
                                t("auth.create_account")
                            )}
                        </Button>

                        <p className="text-sm text-center text-muted-foreground">
                            {t("auth.has_account")} {" "}
                            <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                {t("auth.log_in")}
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
