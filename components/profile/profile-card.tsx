"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Edit2, Check } from "lucide-react";

export function ProfileCard() {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState("John Doe"); // Default/Placeholder
    const [bio, setBio] = useState("Saving for a dream home 🏠");

    const handleSave = () => {
        setIsEditing(false);
        // Ideally save to store/local storage here
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Personal Details</span>
                    <Button variant="ghost" size="icon" onClick={() => isEditing ? handleSave() : setIsEditing(true)}>
                        {isEditing ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src="/avatars/01.png" alt="@johndoe" />
                        <AvatarFallback className="text-2xl">JD</AvatarFallback>
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
                        <p className="text-muted-foreground text-sm">Member since Jan 2024</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Financial Goal</Label>
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
