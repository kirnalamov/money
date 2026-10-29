"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, X } from "lucide-react"

import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export interface MultiSelectCreatableProps {
  options: { label: string; value: string }[]
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  emptyText?: string
  onCreate?: (value: string) => void
  'aria-labelledby'?: string
}

export function MultiSelectCreatable({
  options,
  values,
  onChange,
  placeholder = "Select options...",
  emptyText = "No results found.",
  onCreate,
  'aria-labelledby': labelledBy,
}: MultiSelectCreatableProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  )

  const handleSelect = (selectedValue: string) => {
    if (values.includes(selectedValue)) {
      onChange(values.filter(v => v !== selectedValue))
    } else {
      onChange([...values, selectedValue])
    }
    setInputValue("")
    // Don't close popover for multi-select
  }

  const handleCreate = () => {
    const val = inputValue.trim()
    if (val) {
      if (!values.includes(val)) {
        onChange([...values, val])
        if (onCreate) onCreate(val)
      }
      setInputValue("")
    }
  }

  const removeValue = (valToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(values.filter(v => v !== valToRemove))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-labelledby={labelledBy}
          className="w-full justify-between font-normal text-left h-auto min-h-10 py-1.5 px-3"
        >
          <div className="flex flex-wrap gap-1 items-center">
            {values.length > 0 ? (
              values.map(val => {
                const displayLabel = options.find((opt) => opt.value === val)?.label || val
                return (
                  <Badge variant="secondary" key={val} className="mr-1 mb-1 font-normal flex items-center gap-1">
                    {displayLabel}
                    <button
                      className="text-muted-foreground hover:text-foreground outline-none focus:outline-none"
                      onClick={(e) => removeValue(val, e)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })
            ) : (
              <span className="text-muted-foreground pt-1">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 mb-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex flex-col">
          <div className="p-2 border-b">
            <Input
              placeholder={t('common.search_placeholder') || "Search or add fresh..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-8 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 border-none px-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  const exactMatch = filteredOptions.find(o => o.label.toLowerCase() === inputValue.trim().toLowerCase())
                  if (exactMatch) {
                    handleSelect(exactMatch.value)
                  } else {
                    handleCreate()
                  }
                }
              }}
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filteredOptions.length === 0 && !inputValue.trim() && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            )}
            
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
                {values.includes(option.value) && (
                  <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </button>
            ))}
            
            {inputValue.trim() && !options.find(o => o.label.toLowerCase() === inputValue.trim().toLowerCase()) && (
              <button
                type="button"
                className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-primary font-medium"
                onClick={handleCreate}
              >
                <Plus className="h-4 w-4" />
                {t('common.create') || 'Create'} &quot;{inputValue}&quot;
              </button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
