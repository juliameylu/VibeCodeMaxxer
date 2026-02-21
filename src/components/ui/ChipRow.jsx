export default function ChipRow({ options, value, onChange, className = "" }) {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 ${className}`.trim()}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`chip whitespace-nowrap ${value === option.value ? "chip-active" : "chip-idle"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
