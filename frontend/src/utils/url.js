const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const getBackendBaseUrl = () => {
    if (import.meta.env.VITE_BACKEND_BASE_URL) {
        return import.meta.env.VITE_BACKEND_BASE_URL.replace(/\/$/, '');
    }

    if (API_BASE_URL.startsWith('http')) {
        return API_BASE_URL.replace(/\/api\/?$/, '');
    }

    return window.location.origin;
};

export const assetUrl = (filename) => {
    if (!filename) return null;
    if (/^https?:\/\//i.test(filename)) return filename;

    const normalized = String(filename).replace(/^\/+/, '');
    if (normalized.startsWith('uploads/')) {
        return `${getBackendBaseUrl()}/${normalized}`;
    }

    return `${getBackendBaseUrl()}/uploads/${normalized}`;
};

export const apiStreamUrl = (path) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${getBackendBaseUrl()}${normalized}`;
};
