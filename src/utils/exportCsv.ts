import { toCsvCell, dateStamp } from "./helper";

export type CsvColumn<T> = {
  header: string;
  value: (item: T) => unknown;
};

type ExportCsvOptions<T> = {
  items: T[];
  columns: CsvColumn<T>[];
  fileNamePrefix: string;
  separator?: string;
};

export function exportCsv<T>({
  items,
  columns,
  fileNamePrefix,
  separator = ";",
}: ExportCsvOptions<T>): void {
  if (!items.length || !columns.length) return;

  const headers = columns.map((column) => toCsvCell(column.header)).join(separator);
  const rows = items.map((item) =>
    columns
      .map((column) => toCsvCell(column.value(item)))
      .join(separator),
  );

  const csv = [headers, ...rows].join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileNamePrefix}-${dateStamp()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
