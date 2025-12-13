import React, { useEffect, useMemo, useRef, useState } from 'react'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function parseDateString(value?: string): Date | null {
  if (!value) return null
  const [yearStr, monthStr, dayStr] = value.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }
  return new Date(year, month - 1, day, 12)
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isSameDate(a: Date | null, b: Date | null) {
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function buildCalendarMatrix(baseDate: Date) {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const firstDayOfMonth = new Date(year, month, 1)
  const leadingEmptyDays = (firstDayOfMonth.getDay() + 6) % 7 // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<Date | null> = []
  for (let i = 0; i < leadingEmptyDays; i += 1) {
    cells.push(null)
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day, 12))
  }
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }
  const weeks: Array<Array<Date | null>> = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

const monthLabelFormatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
const displayFormatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

export type DatePickerFieldProps = {
  label: string
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  min?: string
  max?: string
  disabled?: boolean
  containerClassName?: string
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  min,
  max,
  disabled,
  containerClassName = ''
}) => {
  const [open, setOpen] = useState(false)
  const selectedDate = useMemo(() => parseDateString(value), [value])
  const minDate = useMemo(() => parseDateString(min), [min])
  const maxDate = useMemo(() => parseDateString(max), [max])
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => selectedDate ?? new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickAway = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickAway)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickAway)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const weeks = useMemo(() => buildCalendarMatrix(visibleMonth), [visibleMonth])
  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  }, [])

  const handleToggle = () => {
    if (disabled) return
    setOpen((prev) => {
      const next = !prev
      if (!prev) {
        setVisibleMonth(selectedDate ?? new Date())
      }
      return next
    })
  }

  const handleSelectDate = (date: Date | null) => {
    if (!date || disabled) return
    if (minDate && date < minDate) return
    if (maxDate && date > maxDate) return
    onChange(formatIsoDate(date))
    setOpen(false)
  }

  const handleClear = () => {
    if (disabled) return
    onChange('')
    setOpen(false)
  }

  const handleToday = () => {
    const today = new Date()
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12)
    if (minDate && todayMid < minDate) return
    if (maxDate && todayMid > maxDate) return
    onChange(formatIsoDate(todayMid))
    setVisibleMonth(todayMid)
    setOpen(false)
  }

  const changeMonth = (offset: number) => {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1, 12))
  }

  const renderValue = () => {
    if (!selectedDate) return <span className="text-zinc-500">{placeholder}</span>
    return displayFormatter.format(selectedDate)
  }

  const isDateDisabled = (date: Date | null) => {
    if (!date) return true
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  return (
    <div className={`relative space-y-1 ${containerClassName}`} ref={containerRef}>
      <label className="text-xs font-semibold text-zinc-400">{label}</label>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-2xl border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-left text-sm text-white transition ${disabled ? 'opacity-60' : 'hover:border-zinc-500'}`}
      >
        <span>{renderValue()}</span>
        <span className="text-zinc-500">📅</span>
      </button>
      {open && !disabled && (
        <div className="absolute left-0 z-50 mt-2 w-72 rounded-2xl border border-zinc-800/80 bg-zinc-950/95 p-3 text-sm text-white shadow-2xl">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
            <button
              type="button"
              className="rounded-full border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:border-zinc-600"
              onClick={() => changeMonth(-1)}
            >
              ←
            </button>
            <span className="uppercase tracking-[0.2em] text-zinc-400">{monthLabelFormatter.format(visibleMonth)}</span>
            <button
              type="button"
              className="rounded-full border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:border-zinc-600"
              onClick={() => changeMonth(1)}
            >
              →
            </button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-[11px] text-zinc-400">
            {DAY_LABELS.map((day) => (
              <span key={day} className="text-center text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                {day}
              </span>
            ))}
            {weeks.map((week, weekIndex) =>
              week.map((date, dayIndex) => {
                const key = `${weekIndex}-${dayIndex}`
                const disabledDay = isDateDisabled(date)
                const isSelected = isSameDate(date, selectedDate)
                const isToday = isSameDate(date, today)
                return date ? (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectDate(date)}
                    disabled={disabledDay}
                    className={`flex h-9 items-center justify-center rounded-xl text-sm transition ${
                      isSelected
                        ? 'bg-emerald-500/90 text-emerald-950'
                        : isToday
                        ? 'border border-emerald-500/40 text-emerald-200'
                        : 'text-zinc-200 hover:bg-zinc-800'
                    } ${disabledDay ? 'cursor-not-allowed opacity-30 hover:bg-transparent' : ''}`}
                  >
                    {date.getDate()}
                  </button>
                ) : (
                  <span key={key} />
                )
              })
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
            <button
              type="button"
              className="rounded-full border border-zinc-800 px-3 py-1 hover:border-zinc-600"
              onClick={handleClear}
            >
              Borrar
            </button>
            <button
              type="button"
              className="rounded-full border border-zinc-800 px-3 py-1 text-emerald-200 hover:border-emerald-400"
              onClick={handleToday}
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
