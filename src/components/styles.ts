/** Clases de Tailwind compartidas para mantener un aspecto coherente. */

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60";

export const buttonStyles = {
  primary: `${buttonBase} bg-indigo-600 text-white hover:bg-indigo-700`,
  secondary: `${buttonBase} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`,
  danger: `${buttonBase} border border-red-200 bg-white text-red-700 hover:bg-red-50`,
};

export type ButtonVariant = keyof typeof buttonStyles;

export const inputStyles =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-2 focus:outline-indigo-200";

export const labelStyles = "block text-sm font-medium text-slate-700";

export const cardStyles = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
