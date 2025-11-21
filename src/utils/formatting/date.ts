/**
 * Date formatting utilities
 */

/**
 * Formats a date string in the format "day_month_year" to "Day Month, Year".
 *
 * @param date - The input date string in "DD_MM_YYYY" format.
 * @returns The formatted date in "Day Month, Year" format.
 * @throws Error if the input date is invalid or cannot be parsed.
 */
export function formatDate(date: string): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Validate input: Ensure the input is a string and matches the "DD_MM_YYYY" pattern
  if (typeof date !== 'string' || !/^\d{2}_\d{2}_\d{4}$/.test(date)) {
    throw new Error("Invalid date format. Expected format is 'DD_MM_YYYY'.");
  }

  const [day, month, year] = date.split('_');

  // Validate day, month, and year components
  const dayNumber = parseInt(day, 10);
  const monthNumber = parseInt(month, 10);
  const yearNumber = parseInt(year, 10);

  if (isNaN(dayNumber) || isNaN(monthNumber) || isNaN(yearNumber)) {
    throw new Error(
      'Invalid date components. Please ensure all parts are numeric.'
    );
  }

  if (monthNumber < 1 || monthNumber > 12) {
    throw new Error(`Invalid month value: ${month}. Must be between 01 and 12.`);
  }

  if (dayNumber < 1 || dayNumber > 31) {
    throw new Error(`Invalid day value: ${day}. Must be between 01 and 31.`);
  }

  const monthName = months[monthNumber - 1]; // Convert month number to name

  return `${dayNumber} ${monthName}, ${yearNumber}`; // Format the output
}

/**
 * Format a date string to a readable format
 * Used in detail views
 */
export function formatDateString(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

