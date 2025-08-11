"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// Cookie utilities
const COOKIE_NAME = 'finance_date_range'

const setCookie = (name: string, value: string, days: number = 365) => {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

const getCookie = (name: string): string | null => {
  try {
    const nameEQ = name + "="
    const ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    return null
  } catch (error) {
    console.error('Error reading cookie:', error)
    return null
  }
}

// Generate default one year range
const getDefaultDateRange = (): string => {
  const today = new Date()
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
  
  const formatDate = (date: Date) => 
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  
  return `${formatDate(oneYearAgo)} - ${formatDate(today)}`
}

const dateRangeOptions = [
  "Today",
  "Yesterday", 
  "This Week",
  "Last 7 Days",
  "Last 28 Days",
  "This Month",
  "Last Month",
  "This Year",
  "Custom Range",
]

const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

interface CalendarComponentProps {
  dateRange: string
  onDateRangeChange: (range: string) => void
}

export default function CalendarComponent({ dateRange, onDateRangeChange }: CalendarComponentProps) {
  const [selectedRange, setSelectedRange] = useState("This Year")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)
  const [open, setOpen] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize with saved cookie or default to one year
  useEffect(() => {
    if (isInitialized) return
    
    const savedDateRange = getCookie(COOKIE_NAME)
    const initialDateRange = savedDateRange || getDefaultDateRange()
    
    // If no dateRange prop provided or it's the old default, use the saved/default range
    if (!dateRange || dateRange === "" || dateRange === "03 Jul 2025 - 30 Jul 2025") {
      onDateRangeChange(initialDateRange)
    }
    
    setIsInitialized(true)
  }, [dateRange, onDateRangeChange, isInitialized])

  // Initialize selected range based on dateRange prop
  useEffect(() => {
    if (!isInitialized || !dateRange) return
    
    // Try to match the dateRange to a preset option
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const todayStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const yesterdayStr = yesterday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    
    if (dateRange === todayStr) {
      setSelectedRange("Today")
    } else if (dateRange === yesterdayStr) {
      setSelectedRange("Yesterday")
    } else if (dateRange.includes(' - ')) {
      // Check if it matches any of the preset ranges
      const [startStr, endStr] = dateRange.split(' - ')
      const start = new Date(startStr)
      const end = new Date(endStr)
      
      // Calculate the difference in days
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays <= 1) {
        setSelectedRange("Today")
      } else if (diffDays === 6 || diffDays === 7) {
        setSelectedRange("This Week")
      } else if (diffDays === 7) {
        setSelectedRange("Last 7 Days")
      } else if (diffDays === 28) {
        setSelectedRange("Last 28 Days")
      } else if (diffDays >= 360 && diffDays <= 370) {
        setSelectedRange("This Year")
      } else {
        setSelectedRange("Custom Range")
        setStartDate(start)
        setEndDate(end)
      }
    } else {
      setSelectedRange("Custom Range")
    }
  }, [dateRange, isInitialized])

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const getNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const formatDateRange = (start: Date, end: Date) => {
    const formatDate = (date: Date) => 
      date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    
    if (start.getTime() === end.getTime()) {
      return formatDate(start)
    }
    return `${formatDate(start)} - ${formatDate(end)}`
  }

  const handleRangeSelect = (range: string) => {
    if (range === "Custom Range") {
      setSelectedRange(range)
      // Clear any existing selection to start fresh
      setStartDate(null)
      setEndDate(null)
      return
    }
    
    setSelectedRange(range)
    // Clear custom date selection when using preset ranges
    setStartDate(null)
    setEndDate(null)
    
    // Generate appropriate date range string based on selection
    let newDateRange = ""
    const today = new Date()
    
    switch (range) {
      case "Today":
        newDateRange = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        break
      case "Yesterday":
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        newDateRange = yesterday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        break
      case "This Week":
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        newDateRange = `${startOfWeek.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
        break
      case "Last 7 Days":
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(today.getDate() - 7)
        newDateRange = `${sevenDaysAgo.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
        break
      case "Last 28 Days":
        const twentyEightDaysAgo = new Date(today)
        twentyEightDaysAgo.setDate(today.getDate() - 28)
        newDateRange = `${twentyEightDaysAgo.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
        break
      case "This Month":
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        newDateRange = `${startOfMonth.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${endOfMonth.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
        break
      case "Last Month":
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
        newDateRange = `${lastMonthStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${lastMonthEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
        break
      case "This Year":
        const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
        newDateRange = `${oneYearAgo.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
        break
      default:
        newDateRange = getDefaultDateRange()
    }
    
    // Save to cookie
    setCookie(COOKIE_NAME, newDateRange)
    
    onDateRangeChange(newDateRange)
    setOpen(false)
  }

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    
    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(clickedDate)
      setEndDate(null)
      setSelectedRange("Custom Range") // Set to custom range mode
    } else if (startDate && !endDate) {
      // Complete the range
      if (clickedDate < startDate) {
        setEndDate(startDate)
        setStartDate(clickedDate)
      } else {
        setEndDate(clickedDate)
      }
    }
  }

  const handleDateHover = (day: number) => {
    if (startDate && !endDate) {
      const hoveredDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      setHoverDate(hoveredDate)
    }
  }

  const isDateInRange = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    
    if (startDate && endDate) {
      return date >= startDate && date <= endDate
    }
    
    if (startDate && hoverDate && !endDate) {
      const rangeStart = startDate < hoverDate ? startDate : hoverDate
      const rangeEnd = startDate < hoverDate ? hoverDate : startDate
      return date >= rangeStart && date <= rangeEnd
    }
    
    return false
  }

  const isDateSelected = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return (startDate && date.getTime() === startDate.getTime()) || 
           (endDate && date.getTime() === endDate.getTime())
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const daysInPrevMonth = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

    const days = []

    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      days.push(
        <button
          key={`prev-${day}`}
          className="h-10 w-10 text-sm text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
        >
          {day}
        </button>,
      )
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = isDateSelected(day)
      const isInRange = isDateInRange(day)
      
      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          onMouseEnter={() => handleDateHover(day)}
          onMouseLeave={() => setHoverDate(null)}
          className={cn(
            "h-10 w-10 text-sm rounded-md transition-colors relative",
            isSelected 
              ? "bg-black text-white z-10" 
              : isInRange 
                ? "bg-gray-200 text-gray-900" 
                : "text-gray-900 hover:bg-gray-100",
          )}
        >
          {day}
        </button>,
      )
    }

    // Next month's leading days
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7
    const remainingCells = totalCells - (firstDay + daysInMonth)

    for (let day = 1; day <= remainingCells; day++) {
      days.push(
        <button
          key={`next-${day}`}
          className="h-10 w-10 text-sm text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
        >
          {day}
        </button>,
      )
    }

    return days
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
          <Calendar className="h-4 w-4" />
          <span className="text-sm hidden md:inline">{dateRange}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Card className="w-full max-w-4xl p-6 bg-white shadow-lg border-0">
          <div className="flex gap-6">
            {/* Sidebar */}
            <div className="w-48 space-y-1">
              {dateRangeOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleRangeSelect(option)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    selectedRange === option ? "bg-gray-200 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="icon" onClick={getPreviousMonth} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <h2 className="text-lg font-semibold text-gray-900">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>

                <Button variant="ghost" size="icon" onClick={getNextMonth} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {daysOfWeek.map((day) => (
                  <div key={day} className="h-10 flex items-center justify-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">{renderCalendarDays()}</div>
              
              {/* Custom range info and apply button */}
              {startDate && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {startDate && endDate 
                        ? `Selected: ${formatDateRange(startDate, endDate)}`
                        : `Start: ${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                      }
                    </div>
                    {startDate && endDate && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          const customRange = formatDateRange(startDate, endDate)
                          // Save custom range to cookie
                          setCookie(COOKIE_NAME, customRange)
                          onDateRangeChange(customRange)
                          setOpen(false)
                        }}
                        className="bg-black text-white hover:bg-gray-800"
                      >
                        Apply
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
