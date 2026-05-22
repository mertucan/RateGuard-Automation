const DATE_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
});

function parseDisplayDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const text = String(value).trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const europeanDate = text.match(/^(\d{2})[.-](\d{2})[.-](\d{4})$/);
  if (europeanDate) {
    const [, day, month, year] = europeanDate;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDisplayDate(value, fallback = "-") {
  const date = parseDisplayDate(value);
  return date ? DATE_FORMATTER.format(date) : fallback;
}

export function formatDisplayDateTime(value, fallback = "-") {
  const date = parseDisplayDate(value);
  return date ? DATE_TIME_FORMATTER.format(date) : fallback;
}

export function formatDisplayTime(value, fallback = "") {
  const date = parseDisplayDate(value);
  return date ? TIME_FORMATTER.format(date) : fallback;
}
