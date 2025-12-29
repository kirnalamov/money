"use client"

import * as React from "react"
import { DollarSign } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useStore } from "@/lib/store"
import { Currency } from "@/types"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const currencies: { code: Currency; name: string; symbol: string }[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
];

const currenciesRu: { code: Currency; name: string; symbol: string }[] = [
  { code: 'USD', name: 'Доллар США', symbol: '$' },
  { code: 'EUR', name: 'Евро', symbol: '€' },
  { code: 'GBP', name: 'Фунт стерлингов', symbol: '£' },
  { code: 'RUB', name: 'Российский рубль', symbol: '₽' },
];

export function CurrencyToggle() {
  const { i18n } = useTranslation()
  const { defaultCurrency, setDefaultCurrency } = useStore()
  const isRussian = i18n.language === 'ru'
  const currencyList = isRussian ? currenciesRu : currencies
  const currentCurrency = currencyList.find(c => c.code === defaultCurrency) || currencyList[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <DollarSign className="h-[1.2rem] w-[1.2rem]" />
          <span>{currentCurrency.code}</span>
          <span className="sr-only">Toggle currency</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {currencyList.map((currency) => (
          <DropdownMenuItem
            key={currency.code}
            onClick={() => setDefaultCurrency(currency.code)}
            className={defaultCurrency === currency.code ? "bg-accent" : ""}
          >
            <span className="mr-2">{currency.symbol}</span>
            {currency.name} ({currency.code})
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

