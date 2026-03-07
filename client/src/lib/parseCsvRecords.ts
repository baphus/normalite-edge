const stripBom = (value: string) => value.replace(/^\uFEFF/, '');

const shouldSkipRow = (row: string[]) => {
    const trimmedRow = row.map((cell) => cell.trim());

    if (trimmedRow.every((cell) => cell.length === 0)) {
        return true;
    }

    return trimmedRow[0]?.startsWith('#') && trimmedRow.slice(1).every((cell) => cell.length === 0);
};

export const parseCsvRecords = (content: string) => {
    const normalizedContent = stripBom(content).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let index = 0; index < normalizedContent.length; index += 1) {
        const char = normalizedContent[index];

        if (char === '"') {
            if (inQuotes && normalizedContent[index + 1] === '"') {
                currentValue += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            currentRow.push(currentValue);
            currentValue = '';
            continue;
        }

        if (char === '\n' && !inQuotes) {
            currentRow.push(currentValue);
            rows.push(currentRow);
            currentRow = [];
            currentValue = '';
            continue;
        }

        currentValue += char;
    }

    if (currentValue.length > 0 || currentRow.length > 0) {
        currentRow.push(currentValue);
        rows.push(currentRow);
    }

    const normalizedRows = rows.filter((row) => !shouldSkipRow(row));
    if (normalizedRows.length < 2) {
        return [] as Array<Record<string, string>>;
    }

    const headers = normalizedRows[0].map((header) => stripBom(header).trim());

    return normalizedRows.slice(1).map((row) => (
        headers.reduce<Record<string, string>>((acc, header, index) => {
            acc[header] = row[index] ?? '';
            return acc;
        }, {})
    ));
};