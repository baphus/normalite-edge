const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;
const UTF16_LE_BOM = [0xff, 0xfe] as const;
const UTF16_BE_BOM = [0xfe, 0xff] as const;

const hasBom = (bytes: Uint8Array, bom: readonly number[]) =>
    bom.every((value, index) => bytes[index] === value);

const countReplacementCharacters = (value: string) =>
    Array.from(value).reduce((count, char) => count + (char === '\uFFFD' ? 1 : 0), 0);

const stripBom = (value: string) => value.replace(/^\uFEFF/, '');

export const readUploadedText = async (file: File) => {
    const bytes = new Uint8Array(await file.arrayBuffer());

    if (hasBom(bytes, UTF8_BOM)) {
        return stripBom(new TextDecoder('utf-8').decode(bytes));
    }

    if (hasBom(bytes, UTF16_LE_BOM)) {
        return stripBom(new TextDecoder('utf-16le').decode(bytes));
    }

    if (hasBom(bytes, UTF16_BE_BOM)) {
        return stripBom(new TextDecoder('utf-16be').decode(bytes));
    }

    const utf8Text = stripBom(new TextDecoder('utf-8').decode(bytes));
    const utf8ReplacementCount = countReplacementCharacters(utf8Text);

    if (utf8ReplacementCount === 0) {
        return utf8Text;
    }

    const windows1252Text = stripBom(new TextDecoder('windows-1252').decode(bytes));
    const windows1252ReplacementCount = countReplacementCharacters(windows1252Text);

    return windows1252ReplacementCount < utf8ReplacementCount ? windows1252Text : utf8Text;
};