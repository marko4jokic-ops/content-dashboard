import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#060606",
        panel: "#101012",
        panel2: "#17171a",
        edge: "#242427",
        "edge-strong": "#33333a",
        ink: "#f7f7f5",
        dim: "#9c9ca1",
        faint: "#68686e",
        gold: "#ffde59",
        "gold-deep": "#f2c218",
        "gold-wash": "#3a341a",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        glass: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -24px rgba(0,0,0,0.8)",
        glow: "0 0 0 1px rgba(255,222,89,0.16), 0 12px 32px -12px rgba(242,194,24,0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
