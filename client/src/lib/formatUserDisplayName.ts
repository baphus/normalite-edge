export interface NameParts {
    name?: string;
    firstName?: string;
    middleInitial?: string;
    lastName?: string;
    suffix?: string;
}

export const formatUserDisplayName = (parts: NameParts) => {
    const firstName = parts.firstName?.trim() || '';
    const middleInitial = (parts.middleInitial?.trim() || '').slice(0, 1).toUpperCase();
    const lastName = parts.lastName?.trim() || '';
    const suffix = parts.suffix?.trim() || '';

    const baseName = [firstName, middleInitial ? `${middleInitial}.` : '', lastName]
        .filter(Boolean)
        .join(' ')
        .trim();

    if (!baseName) {
        return parts.name?.trim() || 'User';
    }

    return suffix ? `${baseName}, ${suffix}` : baseName;
};
