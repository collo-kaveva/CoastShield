/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Premium CoastShield color palette
        navy: { 50: "#EEF2F6", 100: "#DDE5ED", 200: "#BCC9D8", 300: "#8FA9C2", 400: "#6387AB", 500: "#3E6590", 600: "#2D4A73", 700: "#203056", 800: "#16203D", 900: "#102A56" },
        teal: { 50: "#E8FBF9", 100: "#C5F4EF", 200: "#8DE6DC", 300: "#55D4C7", 400: "#2CC0B2", 500: "#14B8A6", 600: "#0E8A7F", 700: "#0B766D", 800: "#095E57", 900: "#074A45" },
        sky: { 50: "#F0F9FF", 100: "#E0F2FE", 200: "#BAE6FD", 300: "#7DD3FC", 400: "#38BDF8", 500: "#0891B2", 600: "#0284C7", 700: "#0369A1", 800: "#075985", 900: "#0C4A6E" },
        amber: { 50: "#FFFBEB", 100: "#FEF3C7", 200: "#FDE68A", 300: "#FCD34D", 400: "#FBBF24", 500: "#F59E0B", 600: "#D97706", 700: "#B45309", 800: "#92400E", 900: "#78350F" },
        emerald: { 50: "#ECFDF5", 100: "#D1FAE5", 200: "#A7F3D0", 300: "#6EE7B7", 400: "#34D399", 500: "#10B981", 600: "#059669", 700: "#047857", 800: "#065F46", 900: "#064E3B" },
        // Legacy colors for compatibility
        ocean: { 50: "#EEF4F9", 100: "#D9E6F1", 200: "#B5CDE3", 300: "#86A9C8", 400: "#5C86AB", 500: "#44688C", 600: "#355574", 700: "#274260", 800: "#17304F", 900: "#0B2545" },
        lagoon: { 50: "#E8FBF9", 100: "#C5F4EF", 200: "#8DE6DC", 300: "#55D4C7", 400: "#2CC0B2", 500: "#1BA79A", 600: "#0E8A7F", 700: "#0B766D", 800: "#095E57", 900: "#074A45" },
        sand: { 50: "#F8FAFC", 100: "#F1F5F9", 200: "#E2E8F0", 300: "#CBD5E1", 400: "#94A3B8", 500: "#64748B", 600: "#475569", 700: "#334155", 800: "#1E293B", 900: "#0F172A" },
        coral: { 50: "#FEF0EB", 100: "#FCDCD0", 500: "#E4572E", 600: "#C9421C", 700: "#A53517" },
        sun: { 50: "#FFF7E6", 100: "#FDE9B8", 500: "#F2A33A", 700: "#8A5A0B" },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', '"Iowan Old Style"', '"Palatino Linotype"', "Palatino", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "Helvetica", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,37,69,.06), 0 4px 16px rgba(11,37,69,.06)",
        lift: "0 10px 30px rgba(11,37,69,.15)",
        glow: "0 0 40px rgba(8, 145, 178, 0.15)",
      },
      backgroundImage: {
        'gradient-coastal': 'linear-gradient(135deg, #102A56 0%, #0891B2 50%, #14B8A6 100%)',
        'gradient-sky': 'linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 100%)',
      },
    },
  },
  plugins: [],
};
