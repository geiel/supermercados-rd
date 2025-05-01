export function isLessThan12HoursAgo(date: Date): boolean {
  const now = new Date();
  const twelveHoursInMs = 12 * 60 * 60 * 1000;
  return now.getTime() - date.getTime() < twelveHoursInMs;
}
