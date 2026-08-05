'use client'
/**
 * SplitPaymentSection — Agent Package Creation UI (Step 7)
 *
 * Inserted AFTER the Cancellation Policy card and BEFORE Trip Style.
 * All state is managed by the parent via props — no local DB calls.
 *
 * Props:
 *   splitData   — current split payment form values
 *   onChange    — (field, value) → update parent state
 *   bookingType — 'INSTANT' | 'ENQUIRY' — disabled when ENQUIRY
 *   totalPrice  — price_per_person * (1 + gst) for live preview
 */

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Info, Banknote, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SplitPaymentData {
  split_payment_enabled: boolean
  split_payment_mode: 'date_wise' | 'manual'
  advance_payment_type: 'percentage' | 'fixed'
  advance_payment_value: number
  final_payment_due_days: number
  final_payment_due_direction: 'before_travel' | 'after_booking'
  advance_cancellation_enabled?: boolean
}

interface SplitPaymentSectionProps {
  splitData: SplitPaymentData
  onChange: (field: keyof SplitPaymentData, value: any) => void
  bookingType: 'INSTANT' | 'ENQUIRY'
  totalPrice: number
  cancellationEnabled?: boolean
}

export default function SplitPaymentSection({
  splitData,
  onChange,
  bookingType,
  totalPrice,
  cancellationEnabled,
}: SplitPaymentSectionProps) {
  const disabled = bookingType === 'ENQUIRY'

  // Live preview calculation (mirrors Python split_payment_service.calculate_split_amounts)
  const advanceAmount =
    splitData.advance_payment_type === 'percentage'
      ? Math.floor(totalPrice * splitData.advance_payment_value / 100)
      : splitData.advance_payment_value
  const finalAmount = totalPrice - advanceAmount

  // Warning: due days < 3 before travel
  const showDueDateWarning =
    splitData.split_payment_mode === 'date_wise' &&
    splitData.final_payment_due_direction === 'before_travel' &&
    splitData.final_payment_due_days > 0 &&
    splitData.final_payment_due_days < 3

  return (
    <Card className="glass-card border-0 shadow-lg overflow-hidden group mt-8">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-[var(--primary)]/5 to-white/20 px-6 py-4 border-b border-white/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--primary)]/10 rounded-lg text-black group-hover:scale-110 transition-transform">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-black flex items-center gap-2">
              Split Payment
              {splitData.split_payment_enabled && (
                <Badge className="text-[10px] px-2 py-0 bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 font-bold uppercase tracking-wider">
                  Active
                </Badge>
              )}
            </h3>
            <p className="text-xs text-black opacity-80">
              Allow customers to pay in two instalments — advance now, balance later
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button
          type="button"
          disabled={disabled}
          title={disabled ? 'Split payment is only available for Instant booking packages' : undefined}
          onClick={() => onChange('split_payment_enabled', !splitData.split_payment_enabled)}
          className={cn(
            'relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0',
            disabled && 'opacity-40 cursor-not-allowed',
            splitData.split_payment_enabled
              ? 'bg-[var(--primary)]'
              : 'bg-black/20'
          )}
        >
          <span
            className={cn(
              'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300',
              splitData.split_payment_enabled ? 'left-7' : 'left-1'
            )}
          />
        </button>
      </div>

      {/* Advance Cancel Toggle in Split Payment Header if Cancellation is Enabled */}
      {cancellationEnabled && splitData.split_payment_enabled && (
        <div className="flex items-center gap-3 border-t border-black/5 bg-black/5 px-6 py-3">
          <div className="flex-1">
            <h4 className="text-[11px] font-bold text-black uppercase tracking-wider">Allow Advance Cancel</h4>
            <p className="text-[10px] text-black/60 mt-0.5">Customers can cancel bookings and get refunded from the advance amount</p>
          </div>
          <button
            type="button"
            onClick={() => onChange('advance_cancellation_enabled', !splitData.advance_cancellation_enabled)}
            className={cn(
              'relative w-10 h-5 rounded-full transition-all duration-300 flex-shrink-0',
              splitData.advance_cancellation_enabled
                ? 'bg-emerald-500'
                : 'bg-black/20'
            )}
          >
            <span
              className={cn(
                'absolute top-[2px] w-4 h-4 bg-white rounded-full shadow transition-all duration-300',
                splitData.advance_cancellation_enabled ? 'left-[22px]' : 'left-[2px]'
              )}
            />
          </button>
        </div>
      )}

      {/* Card Body — only shown when enabled */}
      {splitData.split_payment_enabled && (
        <CardContent className="p-6 space-y-7">

          {/* Enquiry-mode warning */}
          {disabled && (
            <div className="flex items-start gap-3 bg-amber-50/60 border border-amber-200/60 rounded-xl p-4">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-medium">
                Split payment is only available for <strong>Instant</strong> booking packages.
                Switch booking type to enable this feature.
              </p>
            </div>
          )}

          {/* ── Mode ──────────────────────────────── */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-black uppercase tracking-wider">
              Payment Mode <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {(['date_wise', 'manual'] as const).map((mode) => {
                const isSelected = splitData.split_payment_mode === mode
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onChange('split_payment_mode', mode)}
                    className={cn(
                      'flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all duration-200',
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                        : 'border-white/40 bg-white/20 hover:border-[var(--primary)]/40'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                          isSelected ? 'border-[var(--primary)]' : 'border-black/30'
                        )}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                        )}
                      </div>
                      <span className="font-bold text-sm text-black capitalize">
                        {mode === 'date_wise' ? 'Date-wise' : 'Manual'}
                      </span>
                    </div>
                    <p className="text-[11px] text-black/60 leading-tight pl-6">
                      {mode === 'date_wise'
                        ? 'Automatically enable the next payment after the initial payment.'
                        : 'You manually send the final payment link when ready'}
                    </p>
                  </button>
                )
              })}
            </div>
            {splitData.split_payment_mode === 'manual' && (
              <div className="flex items-start gap-2 bg-blue-50/40 border border-blue-200/50 rounded-lg p-3">
                <Lock className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-blue-700">
                  In manual mode, the final payment remains <strong>Locked</strong> until you
                  click "Enable Final Payment" from the Split Payments tracker.
                </p>
              </div>
            )}
          </div>

          {/* ── Advance Amount & Final Payment Due ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 items-start">
            {/* Advance Amount */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-black uppercase tracking-wider">
                Advance Amount <span className="text-red-500">*</span>
              </Label>
              
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 p-1 rounded-full bg-black/5 border border-black/5 w-fit">
                  {(['percentage', 'fixed'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        onChange('advance_payment_type', type)
                        const currentVal = Number(splitData.advance_payment_value) || 0
                        if (type === 'percentage' && currentVal > 100) {
                          onChange('advance_payment_value', 100)
                        } else if (type === 'fixed' && totalPrice > 0 && currentVal > totalPrice) {
                          onChange('advance_payment_value', totalPrice)
                        }
                      }}
                      className={cn(
                        'px-6 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300',
                        splitData.advance_payment_type === type
                          ? 'bg-[var(--primary)] text-black shadow-sm shadow-[var(--primary)]/20'
                          : 'text-black/40 hover:text-black/60'
                      )}
                    >
                      {type === 'percentage' ? '% Percentage' : '₹ Fixed Amount'}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-black/60 font-bold text-sm">
                      {splitData.advance_payment_type === 'percentage' ? '%' : '₹'}
                    </span>
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={splitData.advance_payment_value === 0 ? '' : splitData.advance_payment_value}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '')
                      if (val === '') {
                        onChange('advance_payment_value', 0)
                      } else {
                        let num = parseInt(val, 10)
                        if (splitData.advance_payment_type === 'percentage') {
                          if (num > 100) num = 100
                        } else {
                          if (totalPrice > 0 && num > totalPrice) num = totalPrice
                        }
                        onChange('advance_payment_value', num)
                      }
                    }}
                    placeholder={
                      splitData.advance_payment_type === 'percentage'
                        ? 'e.g. 30'
                        : 'e.g. 5000'
                    }
                    className="w-32 pl-8 glass-input h-10 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Final Payment Due (date_wise only) */}
            {splitData.split_payment_mode === 'date_wise' && (
              <div className="space-y-3">
                <Label className="text-xs font-bold text-black uppercase tracking-wider">
                  Final Payment Due <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-3 flex-wrap">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={splitData.final_payment_due_days === 0 ? '' : splitData.final_payment_due_days}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '')
                      if (val === '') {
                        onChange('final_payment_due_days', 0)
                      } else {
                        let num = parseInt(val, 10)
                        if (num > 365) num = 365
                        onChange('final_payment_due_days', num)
                      }
                    }}
                    className="w-24 glass-input h-10 font-mono text-center"
                    placeholder="days"
                  />
                  <span className="text-sm text-black font-medium">days</span>
                  <div className="flex items-center gap-1 p-1 rounded-full bg-black/5 border border-black/5 w-fit">
                    {(['before_travel', 'after_booking'] as const).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => onChange('final_payment_due_direction', dir)}
                        className={cn(
                          'px-6 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300',
                          splitData.final_payment_due_direction === dir
                            ? 'bg-[var(--primary)] text-black shadow-sm shadow-[var(--primary)]/20'
                            : 'text-black/40 hover:text-black/60'
                        )}
                      >
                        {dir === 'before_travel' ? 'Before Travel' : 'After Booking'}
                      </button>
                    ))}
                  </div>
                </div>

                {showDueDateWarning && (
                  <div className="flex items-start gap-2 bg-orange-50/50 border border-orange-200/60 rounded-lg p-3">
                    <Info className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-orange-700">
                      ⚠️ Setting due date less than 3 days before travel gives customers very little
                      time to pay. Consider increasing the window.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Auto-bypass note ──────────────────── */}
          <div className="flex items-start gap-2 bg-black/4 border border-black/10 rounded-lg p-3">
            <Info className="w-3.5 h-3.5 text-black/50 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-black/60 leading-relaxed">
              <strong>Auto-bypass:</strong> If a customer books too close to the travel date
              (less than the due window), the system automatically falls back to full payment
              collection. Split payment is skipped silently.
            </p>
          </div>

          {/* ── Live Preview ──────────────────────── */}
          {totalPrice > 0 && splitData.advance_payment_value > 0 && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                background: 'rgba(255,255,255,0.25)',
                border: '1px solid rgba(255,255,255,0.40)',
              }}
            >
              <p className="text-[11px] font-bold text-black uppercase tracking-wider">
                Payment Preview
              </p>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] text-black/60 font-medium">Total Package Price</p>
                  <p className="font-bold text-black text-base">
                    ₹{totalPrice.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-black/50 font-bold uppercase tracking-wide mb-1">
                      Pay Now
                    </p>
                    <p className="font-black text-lg" style={{ color: 'var(--primary)' }}>
                      ₹{Math.max(0, advanceAmount).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-black/30 font-bold">+</div>
                  <div className="text-center">
                    <p className="text-[10px] text-black/50 font-bold uppercase tracking-wide mb-1">
                      Pay Later
                    </p>
                    <p className="font-black text-lg text-black/70">
                      ₹{Math.max(0, finalAmount).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              {splitData.split_payment_mode === 'date_wise' && splitData.final_payment_due_days > 0 && (
                <p className="text-[11px] text-black/50 border-t border-black/10 pt-2">
                  Final payment link will be auto-sent{' '}
                  <strong>{splitData.final_payment_due_days} days{' '}
                    {splitData.final_payment_due_direction === 'before_travel'
                      ? 'before travel'
                      : 'after booking'}
                  </strong>.
                </p>
              )}
              {splitData.split_payment_mode === 'manual' && (
                <p className="text-[11px] text-black/50 border-t border-black/10 pt-2">
                  You will manually trigger the final payment link from your Split Payments
                  tracker.
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
