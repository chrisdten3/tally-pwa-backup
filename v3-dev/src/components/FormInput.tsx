import React from "react";

type Props = {
  id: string;
  label?: string;
  type?: string;
  value?: string;
  placeholder?: string;
  onChange?: (v: string) => void;
};

export default function FormInput({ id, label, type = "text", value, placeholder, onChange }: Props) {
  return (
    <label htmlFor={id} className="block">
      {label && <span className="text-sm font-medium text-cool-gray">{label}</span>}
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-2 w-full rounded-lg border border-border bg-onyx px-3 py-2 text-soft-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-bright-indigo/50"
      />
    </label>
  );
}
