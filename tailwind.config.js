/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: "class",
	content: ["./views/**/*.hbs", "./src/**/*.ts"],
	theme: {
		extend: {
			colors: {
				"type-movie": "#F59E0B",
				"type-tv": "#3B82F6",
				"type-game": "#22C55E",
				"type-boardgame": "#F97316",
				"type-music": "#EC4899",
				"bg-base": "rgb(var(--bg-base) / <alpha-value>)",
				"bg-surface": "rgb(var(--bg-surface) / <alpha-value>)",
				"bg-elevated": "rgb(var(--bg-elevated) / <alpha-value>)",
				"text-primary": "rgb(var(--text-primary) / <alpha-value>)",
				"text-secondary": "rgb(var(--text-secondary) / <alpha-value>)",
				"text-muted": "rgb(var(--text-muted) / <alpha-value>)",
				"border-subtle": "rgb(var(--border-subtle) / <alpha-value>)",
			},
			fontFamily: {
				heading: ["Outfit", "sans-serif"],
				body: ["DM Sans", "sans-serif"],
			},
			fontSize: {
				badge: ["0.6875rem", { lineHeight: "1rem" }],
			},
		},
	},
	plugins: [],
};
