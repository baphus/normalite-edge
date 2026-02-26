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
                    DEFAULT: '#7A1E1E',
                    foreground: '#FFFFFF',
                },
                secondary: {
                    DEFAULT: '#F2B744',
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
