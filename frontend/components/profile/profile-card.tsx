"use client";

import { useState } from "react";
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
    const [name, setName] = useState(user?.full_name || user?.username || t('profile.card.placeholder_name'));
    const [bio, setBio] = useState(user?.financial_goal || t('profile.card.placeholder_bio'));
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setError(null);
        if (!name.trim()) {
            setError(t('profile.card.name_required'));
            return;
        }
        if (newPassword && newPassword !== confirmPassword) {
            setError(t('profile.passwords_do_not_match'));
            return;
        }
        if (newPassword && !currentPassword) {
            setError(t('profile.current_password_required'));
            return;
        }
        try {
            await updateProfile({
                full_name: name.trim(),
                financial_goal: bio.trim(),
                ...(newPassword ? { current_password: currentPassword, password: newPassword } : {}),
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setIsEditing(false);
        } catch (error) {
            setError(error instanceof Error ? error.message : t('common.error'));
        }
    };

    const getInitials = (n: string) => {
        if (!n) return 'U';
        return n.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    };

    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
        : t('profile.card.unknown_date');

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>{t('profile.card.personal_details')}</span>
                    <Button variant="ghost" size="icon" onClick={() => {
                        if (isEditing) void handleSave();
                        else {
                            setError(null);
                            setIsEditing(true);
                        }
                    }} title={isEditing ? t('common.save') : t('common.edit')} aria-label={isEditing ? t('common.save') : t('common.edit')}>
                        {isEditing ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
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
                            &quot;{bio}&quot;
                        </div>
                    )}
                </div>

                {isEditing && (
                    <div className="space-y-3 border-t pt-4">
                        <p className="text-sm font-medium">{t('profile.change_password')}</p>
                        <div className="space-y-2">
                            <Label htmlFor="current-password">{t('profile.current_password')}</Label>
                            <Input
                                id="current-password"
                                type="password"
                                value={currentPassword}
                                onChange={(event) => setCurrentPassword(event.target.value)}
                                autoComplete="current-password"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-password">{t('profile.new_password')}</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                autoComplete="new-password"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">{t('profile.confirm_password')}</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                autoComplete="new-password"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">{t('profile.password_hint')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
