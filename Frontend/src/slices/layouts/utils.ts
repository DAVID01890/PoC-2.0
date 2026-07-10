/**
 * Changes the body attribute
 */
const changeHTMLAttribute = (attribute: string, value: string): boolean => {
    if (document.documentElement) {
        document.documentElement.setAttribute(attribute, value);
    }
    return true;
};

/**
 * Storage helpers
 */
const setLocalStorage = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const getLocalStorage = (key: string) => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
};

const updateLocalStorage = (key: string, updatedValues: any) => {
    const existing = getLocalStorage(key) || {};
    const newData = { ...existing, ...updatedValues };
    setLocalStorage(key, newData);
};

export { changeHTMLAttribute, setLocalStorage, getLocalStorage, updateLocalStorage };