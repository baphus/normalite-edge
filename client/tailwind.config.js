/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#800000', // Crimson
                    foreground: '#FFFFFF',
                },
                secondary: {
                    DEFAULT: '#FFD700', // Gold
                    foreground: '#000000',
                },
                'background-light': '#f8f5f5',
                'background-dark': '#230f0f',
            },
            fontFamily: {
                display: ['Lexend', 'sans-serif'],
                lexend: ['Lexend', 'sans-serif'],
                'noto-sans': ['Noto Sans', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
