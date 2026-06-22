/**
 * Form primitives — RHF-friendly wrappers around shadcn inputs.
 *
 * Each component is uncontrolled when used with RHF Controller, and
 * controlled when used standalone. They expose `label`, `helper`, `error`
 * for consistent layout.
 */
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RadioGroup as RadixRadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/* ----------------------------- Field shell ----------------------------- */
interface FieldShellProps {
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  id?: string;
}

function FieldShell({ label, helper, error, required, className, children, id }: FieldShellProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={id} className="text-sm">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : helper ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------- AppInput ------------------------------ */
export interface AppInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  leftIcon?: React.ComponentType<{ className?: string }>;
  rightIcon?: React.ComponentType<{ className?: string }>;
}

export const AppInput = React.forwardRef<HTMLInputElement, AppInputProps>(
  ({ label, helper, error, leftIcon: L, rightIcon: R, className, id, required, ...rest }, ref) => {
    const reactId = React.useId();
    const fieldId = id || reactId;
    return (
      <FieldShell label={label} helper={helper} error={error} required={required} id={fieldId}>
        <div className="relative">
          {L && <L className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
          <Input
            id={fieldId}
            ref={ref}
            aria-invalid={!!error}
            className={cn(L && "pl-9", R && "pr-9", error && "border-destructive", className)}
            {...rest}
          />
          {R && <R className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
        </div>
      </FieldShell>
    );
  },
);
AppInput.displayName = "AppInput";

/* ----------------------------- AppTextarea ----------------------------- */
export interface AppTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
}

export const AppTextarea = React.forwardRef<HTMLTextAreaElement, AppTextareaProps>(
  ({ label, helper, error, className, id, required, ...rest }, ref) => {
    const reactId = React.useId();
    const fieldId = id || reactId;
    return (
      <FieldShell label={label} helper={helper} error={error} required={required} id={fieldId}>
        <Textarea
          id={fieldId}
          ref={ref}
          aria-invalid={!!error}
          className={cn(error && "border-destructive", className)}
          {...rest}
        />
      </FieldShell>
    );
  },
);
AppTextarea.displayName = "AppTextarea";

/* ------------------------------ AppSelect ------------------------------ */
export interface AppSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface AppSelectProps {
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  options: AppSelectOption[];
  required?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function AppSelect({
  label,
  helper,
  error,
  placeholder = "Select...",
  value,
  onValueChange,
  options,
  required,
  disabled,
  className,
  triggerClassName,
}: AppSelectProps) {
  return (
    <FieldShell label={label} helper={helper} error={error} required={required} className={className}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={cn(error && "border-destructive", triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

/* ---------------------------- AppCheckbox ----------------------------- */
export interface AppCheckboxProps {
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function AppCheckbox({
  label,
  helper,
  error,
  checked,
  onCheckedChange,
  disabled,
  className,
  id,
}: AppCheckboxProps) {
  const reactId = React.useId();
  const fieldId = id || reactId;
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <Checkbox
        id={fieldId}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange?.(v === true)}
        disabled={disabled}
        aria-invalid={!!error}
      />
      <div className="grid gap-0.5">
        {label && (
          <Label htmlFor={fieldId} className="text-sm leading-tight">
            {label}
          </Label>
        )}
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : helper ? (
          <p className="text-xs text-muted-foreground">{helper}</p>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------ AppRadio ------------------------------ */
export interface AppRadioOption {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
}

export interface AppRadioProps {
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  value?: string;
  onValueChange?: (v: string) => void;
  options: AppRadioOption[];
  required?: boolean;
  className?: string;
  orientation?: "vertical" | "horizontal";
}

export function AppRadio({
  label,
  helper,
  error,
  value,
  onValueChange,
  options,
  required,
  className,
  orientation = "vertical",
}: AppRadioProps) {
  return (
    <FieldShell label={label} helper={helper} error={error} required={required} className={className}>
      <RadixRadioGroup
        value={value}
        onValueChange={onValueChange}
        className={cn(orientation === "horizontal" ? "flex flex-wrap gap-4" : "flex flex-col gap-2")}
      >
        {options.map((o) => {
          const id = `radio-${o.value}`;
          return (
            <div key={o.value} className="flex items-center gap-2">
              <RadioGroupItem value={o.value} id={id} disabled={o.disabled} />
              <Label htmlFor={id} className="text-sm">{o.label}</Label>
            </div>
          );
        })}
      </RadixRadioGroup>
    </FieldShell>
  );
}

/* ---------------------------- AppDatePicker --------------------------- */
export interface AppDatePickerProps {
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  value?: Date;
  onChange?: (d: Date | undefined) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Date format token (date-fns). */
  displayFormat?: string;
  min?: Date;
  max?: Date;
}

export function AppDatePicker({
  label,
  helper,
  error,
  value,
  onChange,
  placeholder = "Pick a date",
  required,
  disabled,
  className,
  displayFormat = "PPP",
  min,
  max,
}: AppDatePickerProps) {
  return (
    <FieldShell label={label} helper={helper} error={error} required={required} className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            type="button"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              error && "border-destructive",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, displayFormat) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            disabled={(d) => (min && d < min) || (max && d > max) || false}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </FieldShell>
  );
}

/* ----------------------------- AppUpload ----------------------------- */
export interface AppUploadProps {
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  accept?: string;
  multiple?: boolean;
  value?: File[];
  onChange?: (files: File[]) => void;
  required?: boolean;
  className?: string;
  buttonLabel?: string;
}

export function AppUpload({
  label,
  helper,
  error,
  accept,
  multiple,
  value = [],
  onChange,
  required,
  className,
  buttonLabel = "Choose file",
}: AppUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <FieldShell label={label} helper={helper} error={error} required={required} className={className}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" />
            {buttonLabel}
          </Button>
          <span className="text-xs text-muted-foreground">
            {value.length === 0 ? "No file selected" : `${value.length} file(s)`}
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            onChange?.(files);
          }}
        />
        {value.length > 0 && (
          <ul className="text-xs space-y-1">
            {value.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md border border-border px-2 py-1">
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => onChange?.(value.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remove file"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FieldShell>
  );
}
