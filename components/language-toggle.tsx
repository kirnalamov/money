"use client"

import * as React from "react"
import { Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LanguageToggle() {
  const { i18n } = useTranslation()
  const currentLang = i18n.language.toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span>{currentLang}</span>
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => i18n.changeLanguage("en")}>
          English (EN)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => i18n.changeLanguage("ru")}>
          Русский (RU)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

