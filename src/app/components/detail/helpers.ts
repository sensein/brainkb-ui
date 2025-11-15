// Helper function to get array value (first element if array, otherwise the value itself)
export function getValue(field: any): string | string[] {
    if (Array.isArray(field)) {
        return field.length > 0 ? field.map(String) : [];
    }
    return field ? String(field) : '';
}

// Helper function to format date
export function formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    } catch {
        return dateString;
    }
}

