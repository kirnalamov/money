"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
    const { login, isLoading } = useAuth();
    const { t } = useTranslation();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
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
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md rounded-2xl border bg-card">
                <CardHeader className="space-y-1">
                    <h2 className="text-center text-2xl font-bold">{t("auth.login_title")}</h2>
                    <CardDescription className="text-center">
                        {t("auth.login_description")}
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
                            <Label htmlFor="username">{t("auth.username_or_email")}</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder={t("auth.username_placeholder")}
                                autoComplete="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">{t("auth.password")}</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder={t("auth.password_placeholder")}
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                                    {t("auth.logging_in")}
                                </>
                            ) : (
                                t("auth.login")
                            )}
                        </Button>

                        {demoModeEnabled && (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={fillDemoCredentials}
                                disabled={isLoading}
                            >
                                {t("auth.demo_account")}
                            </Button>
                        )}

                        <p className="text-sm text-center text-muted-foreground">
                            {t("auth.no_account")} {" "}
                            <Link href="/register" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                {t("auth.sign_up")}
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
