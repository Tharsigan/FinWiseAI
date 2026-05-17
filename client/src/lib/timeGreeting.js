/**
 * Salutation from the user's local clock.
 * Morning: before noon · Afternoon: noon–5:59pm · Evening: 6pm–midnight
 */
export function getTimeOfDayGreeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
