export const isValidDate = (dateString: string): boolean => {
  // 1. Vérification du format via Regex (DD/MM/YYYY)
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!dateString.match(regex)) return false;

  const [day, month, year] = dateString.split('/').map(Number);

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

export const toPrestashopDate = (dateString: string): string | null => {
  const value = String(dateString ?? "").trim();
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (isValidDate(value)) {
    const [day, month, year] = value.split("/").map(Number);
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().split("T")[0];
};