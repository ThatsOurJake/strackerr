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
				"bg-base": "#111111",
				"bg-surface": "#1A1A1A",
				"bg-elevated": "#242424",
				"text-primary": "#F0EDE8",
				"text-secondary": "#9CA3AF",
				"border-subtle": "#2C2C2C",
			},
			fontFamily: {
				heading: ["Outfit", "sans-serif"],
				body: ["DM Sans", "sans-serif"],
			},
		},
	},
	plugins: [],
};
