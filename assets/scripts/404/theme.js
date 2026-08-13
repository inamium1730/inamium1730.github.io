export let currentTheme = 'light';

export const initTheme = (themeToggleBtn) => {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    currentTheme = localStorage.getItem('theme') || (systemPrefersDark ? 'dark' : 'light');

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
    };

    applyTheme(currentTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', currentTheme);
            applyTheme(currentTheme);
        });
    }
};

export const getThemeColor = (varName) => {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
};
