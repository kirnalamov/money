"use client";

import { useTranslation } from "react-i18next";
import { ProfileCard } from "@/components/profile/profile-card";
import { MotivationalStats } from "@/components/profile/motivational-stats";

export default function ProfilePage() {
    const { t } = useTranslation();

    return (
        <div className="space-y-6 md:space-y-8 pb-10">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
                <p className="text-muted-foreground">Your personal financial hub and achievements.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-[600px]">
                {/* Profile Column */}
                <div className="lg:col-span-3 h-full">
                    <ProfileCard />
                </div>

                {/* Stats Column */}
                <div className="lg:col-span-4 h-full">
                    <MotivationalStats />
                </div>
            </div>
        </div>
    );
}
