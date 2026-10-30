import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/colors";
import { strings } from "../constants/strings";
import {
  compareYearMonth,
  currentYearMonth,
  monthLabel,
  monthRange,
  shiftMonth,
  todayISO,
  type YearMonth,
} from "../lib/dates";
import type { DateRange } from "../types/expense";
import CategoryChip from "./CategoryChip";
import DateField from "./DateField";
import { fieldStyles } from "./TextField";

export type Period = { mode: "month"; month: YearMonth } | { mode: "range"; range: DateRange };

export function initialPeriod(): Period {
  return { mode: "month", month: currentYearMonth() };
}

export function periodRange(p: Period): DateRange {
  return p.mode === "month" ? monthRange(p.month) : p.range;
}

interface PeriodPickerProps {
  value: Period;
  onChange: (p: Period) => void;
  /** Admin can switch to a custom date range. */
  allowRange: boolean;
}

/** ‹ October 2026 › month switcher, plus "Date range" for the admin. */
export default function PeriodPicker({ value, onChange, allowRange }: PeriodPickerProps) {
  const today = todayISO();

  return (
    <View style={styles.wrap}>
      {allowRange ? (
        <View style={styles.modeRow}>
          <CategoryChip
            label={strings.month}
            active={value.mode === "month"}
            onPress={() => onChange({ mode: "month", month: currentYearMonth() })}
          />
          <CategoryChip
            label={strings.dateRange}
            active={value.mode === "range"}
            onPress={() => onChange({ mode: "range", range: periodRange(value) })}
          />
        </View>
      ) : null}

      {value.mode === "month" ? (
        <MonthSwitcher month={value.month} onChange={(month) => onChange({ mode: "month", month })} />
      ) : (
        <View>
          <View style={styles.rangeRow}>
            <DateField
              compact
              label={strings.from}
              value={value.range.from}
              maximumDate={today}
              onChange={(from) =>
                onChange({
                  mode: "range",
                  range: { from, to: from > value.range.to ? from : value.range.to },
                })
              }
            />
            <DateField
              compact
              label={strings.to}
              value={value.range.to}
              maximumDate={today}
              minimumDate={value.range.from}
              onChange={(to) =>
                onChange({
                  mode: "range",
                  range: { from: to < value.range.from ? to : value.range.from, to },
                })
              }
            />
          </View>
          {value.range.from > value.range.to ? (
            <Text style={fieldStyles.error}>{strings.rangeInvalid}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

function MonthSwitcher({ month, onChange }: { month: YearMonth; onChange: (m: YearMonth) => void }) {
  const isCurrent = compareYearMonth(month, currentYearMonth()) >= 0;
  return (
    <View style={styles.monthRow}>
      <Pressable
        onPress={() => onChange(shiftMonth(month, -1))}
        accessibilityRole="button"
        accessibilityLabel={strings.previousMonth}
        style={styles.arrow}
      >
        <Ionicons name="chevron-back" size={26} color={colors.dark} />
      </Pressable>
      <Text style={styles.monthText}>{monthLabel(month)}</Text>
      <Pressable
        onPress={() => onChange(shiftMonth(month, 1))}
        disabled={isCurrent}
        accessibilityRole="button"
        accessibilityLabel={strings.nextMonth}
        accessibilityState={{ disabled: isCurrent }}
        style={[styles.arrow, isCurrent && styles.arrowDisabled]}
      >
        <Ionicons name="chevron-forward" size={26} color={colors.dark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16, gap: 12 },
  modeRow: { flexDirection: "row", gap: 8 },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
  },
  arrow: { width: 56, height: 52, alignItems: "center", justifyContent: "center" },
  arrowDisabled: { opacity: 0.25 },
  monthText: { fontSize: 17, fontWeight: "700", color: colors.dark },
  rangeRow: { flexDirection: "row", gap: 10 },
});
