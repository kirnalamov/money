"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Edit2, Check } from "lucide-react";

export function ProfileCard() {
    const { t } = useTranslation();
    const { user, updateProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(t('profile.card.placeholder_name'));
    const [bio, setBio] = useState(t('profile.card.placeholder_bio'));

    useEffect(() => {
        if (user) {
            setName(user.full_name || user.username || t('profile.card.placeholder_name'));
            setBio(user.financial_goal || t('profile.card.placeholder_bio'));
        }
    }, [user, t]);

    const handleSave = async () => {
        try {
            await updateProfile({ full_name: name, financial_goal: bio });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update profile", error);
            setIsEditing(false);
        }
    };

    const getInitials = (n: string) => {
        if (!n) return 'U';
        return n.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    };

    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
        : 'Jan 2024';

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>{t('profile.card.personal_details')}</span>
                    <Button variant="ghost" size="icon" onClick={() => isEditing ? handleSave() : setIsEditing(true)}>
                        {isEditing ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24">
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                            {getInitials(name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                        {isEditing ? (
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="text-center font-bold text-xl h-auto py-1"
                            />
                        ) : (
                            <h3 className="text-xl font-bold">{name}</h3>
                        )}
                        <p className="text-muted-foreground text-sm">{t('profile.card.member_since', { date: memberSince })}</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>{t('profile.card.financial_goal')}</Label>
                    {isEditing ? (
                        <Input
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                        />
                    ) : (
                        <div className="p-3 bg-muted/50 rounded-lg text-sm italic">
                            "{bio}"
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
