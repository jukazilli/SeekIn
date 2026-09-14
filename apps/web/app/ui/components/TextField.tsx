import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  endAction?: ReactNode;
  error?: string;
  hint?: string;
  label: string;
}

export function TextField({
  className,
  endAction,
  error,
  hint,
  id,
  label,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="text-field">
      <label className="text-field__label" htmlFor={inputId}>
        {label}
      </label>
      <div
        className={`text-field__control${error ? " text-field__control--error" : ""}`}
      >
        <input
          {...props}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error) || undefined}
          className={["text-field__input", className].filter(Boolean).join(" ")}
          id={inputId}
        />
        {endAction}
      </div>
      {hint ? (
        <p className="text-field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
