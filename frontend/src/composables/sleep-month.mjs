// Match diary YYYY-MM-DD keys without timezone conversion.
export function sleepMonth(date) {
  const [year, month] = date.split('-').map(Number)
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const prefix = `${year}-${String(month).padStart(2, '0')}-`
  return Array.from({ length }, (_, i) => ({day: i + 1, date: prefix + String(i + 1).padStart(2, '0')}))
}