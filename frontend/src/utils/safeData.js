export const asArray = (value) => Array.isArray(value) ? value : [];
export const asObject = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export const parseArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};
