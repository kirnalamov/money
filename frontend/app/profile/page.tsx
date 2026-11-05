"use client";

import { useTranslation } from "react-i18next";
import ProtectedRoute from "@/components/auth/protected-route";
import { ProfileCard } from "@/components/profile/profile-card";
import { MotivationalStats } from "@/components/profile/motivational-stats";

export default function ProfilePage() {
    const { t } = useTranslation();

    return (
        <ProtectedRoute>
            <div className="mx-auto max-w-[1440px] space-y-6 pb-10 md:space-y-8">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold tracking-tight">{t('profile.page.title')}</h2>
                    <p className="text-muted-foreground">{t('profile.page.subtitle')}</p>
                </div>

                <div className="grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-7">
                    {/* Profile Column */}
                    <div className="lg:col-span-3">
                        <ProfileCard />
                    </div>

                    {/* Stats Column */}
                    <div className="lg:col-span-4">
                        <MotivationalStats />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
