"use client";

import {
  createContext,
  useContext,
  type ComponentType,
  type ReactNode,
  type Ref,
} from "react";
import {
  Group as AriaGroup,
  Input as AriaInput,
  TextField as AriaTextField,
} from "react-aria-components";
import type {
  InputProps as AriaInputProps,
  TextFieldProps as AriaTextFieldProps,
} from "react-aria-components";
import { Label } from "./label";
import { HintText } from "./hint-text";
import { cx, sortCx } from "@/utils/cx";
import novaInput from "./nova-input.module.css";

/**
 * Accessible input composition using React Aria:
 *
 *   InputBase   — the styled field shell. Renders <AriaGroup> + adornments
 *                 + <AriaInput>. State (hover / focus / disabled / invalid)
 *                 arrives as render-prop booleans from Aria.
 *   TextField   — wraps <AriaTextField> and a TextFieldContext so size /
 *                 classes can flow from the composer down into InputBase
 *                 without prop drilling.
 *   Input       — opinionated composition: TextField → Label → InputBase
 *                 → HintText. The component most consumers use.
 *
 * Why React Aria:
 *   - Label ↔ input ↔ hint association via aria-labelledby / aria-describedby
 *   - aria-required, aria-invalid auto-applied
 *   - Form library / native validation integration
 *   - i18n, RTL, autofill edge cases handled
 *   - Render-prop state surfaces `isFocusWithin`, `isHovered`, `isDisabled`,
 *     `isInvalid`, `isRequired` — no CSS pseudo gymnastics
 *
 * Visuals follow the source-owned Nova design system.
 */

type InputSize = "medium" | "small";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

/* -------------------------------------------------------------------------- */
/*  TextFieldContext                                                           */
/* -------------------------------------------------------------------------- */

interface TextFieldContextValue {
  size?: InputSize;
  fieldClassName?: string;
  inputClassName?: string;
}

const TextFieldContext = createContext<TextFieldContextValue>({});

/* -------------------------------------------------------------------------- */
/*  TextField                                                                  */
/* -------------------------------------------------------------------------- */

export interface TextFieldProps
  extends Omit<AriaTextFieldProps, "className">,
    TextFieldContextValue {
  className?: string;
  children?: ReactNode | ((state: { isRequired: boolean; isInvalid: boolean; isDisabled: boolean; isReadOnly: boolean }) => ReactNode);
}

export function TextField({
  size = "medium",
  fieldClassName,
  inputClassName,
  className,
  children,
  ...props
}: TextFieldProps) {
  return (
    <TextFieldContext.Provider value={{ size, fieldClassName, inputClassName }}>
      <AriaTextField
        {...props}
        data-input-size={size}
        className={cx(
          "group flex h-max w-full flex-col items-start gap-1",
          className,
        )}
      >
        {children as never /* RAC accepts render-prop children */}
      </AriaTextField>
    </TextFieldContext.Provider>
  );
}

TextField.displayName = "TextField";

/* -------------------------------------------------------------------------- */
/*  InputBase                                                                  */
/* -------------------------------------------------------------------------- */

export interface InputBaseProps extends Omit<AriaInputProps, "size" | "className"> {
  size?: InputSize;
  className?: string;
  leadingIcon?: IconComponent;
  trailingIcon?: IconComponent;
  /** Custom element rendered in the leading slot (Phone basic uses this). */
  leadingAddon?: ReactNode;
  /** Custom interactive element rendered after the input. */
  trailingAddon?: ReactNode;
  /** Class for the field shell. */
  fieldClassName?: string;
  /** Ref to the <input> element. */
  ref?: Ref<HTMLInputElement>;
  /** Ref to the field shell wrapper. */
  groupRef?: Ref<HTMLDivElement>;
}

const inputStyles = sortCx({
  field: [
    novaInput.field,
  ].join(" "),

  fieldSize: {
    medium: novaInput.medium,
    small: novaInput.small,
  },

  // When a leadingAddon is present (Phone basic): tighten left padding.
  fieldWithAddonSize: {
    medium: novaInput.medium,
    small: novaInput.small,
  },

  content: "flex w-full items-center gap-2 min-w-0",
  leftSection: "flex flex-1 items-center gap-0.5 min-w-0",

  input: [
    novaInput.input,
  ].join(" "),

  icon: "size-5 shrink-0",
});

export function InputBase({
  size: sizeProp,
  leadingIcon: Leading,
  trailingIcon: Trailing,
  leadingAddon,
  trailingAddon,
  fieldClassName,
  className,
  ref,
  groupRef,
  ...inputProps
}: InputBaseProps) {
  const ctx = useContext(TextFieldContext);
  const size: InputSize = sizeProp ?? ctx.size ?? "medium";
  const hasAddon = leadingAddon !== undefined && leadingAddon !== null;

  return (
    <AriaGroup
      ref={groupRef}
      className={({ isFocusWithin, isHovered, isDisabled, isInvalid }) =>
        cx(
          inputStyles.field,
          hasAddon
            ? inputStyles.fieldWithAddonSize[size]
            : inputStyles.fieldSize[size],
          // Hover: idle, no focus, no disabled, no invalid
          isHovered &&
            !isFocusWithin &&
            !isDisabled &&
            !isInvalid &&
            novaInput.hover,
          // Focus wins over hover
          isFocusWithin &&
            !isDisabled &&
            !isInvalid &&
            novaInput.focus,
          // Disabled
          isDisabled &&
            novaInput.disabled,
          // Invalid
          isInvalid && novaInput.invalid,
          ctx.fieldClassName,
          fieldClassName,
        )
      }
    >
      <div className={inputStyles.content}>
        <div className={inputStyles.leftSection}>
          {hasAddon ? (
            leadingAddon
          ) : Leading ? (
            <Leading className={inputStyles.icon} aria-hidden />
          ) : null}
          <AriaInput
            ref={ref}
            {...inputProps}
            className={cx(inputStyles.input, ctx.inputClassName, className)}
          />
        </div>
        {trailingAddon ?? (Trailing ? (
          <Trailing className={inputStyles.icon} aria-hidden />
        ) : null)}
      </div>
    </AriaGroup>
  );
}

InputBase.displayName = "InputBase";

/* -------------------------------------------------------------------------- */
/*  Input (composed)                                                           */
/* -------------------------------------------------------------------------- */

export interface InputProps
  extends Omit<TextFieldProps, "children">,
    Pick<
      InputBaseProps,
      | "leadingIcon"
      | "trailingIcon"
      | "leadingAddon"
      | "trailingAddon"
      | "fieldClassName"
      | "groupRef"
      | "ref"
    > {
  label?: ReactNode;
  hint?: ReactNode;
  /** Show an info icon next to the label. Replace with tooltip when Tooltip lands. */
  tooltip?: boolean | string;
  placeholder?: string;
}

export function Input({
  label,
  hint,
  tooltip,
  placeholder,
  leadingIcon,
  trailingIcon,
  leadingAddon,
  trailingAddon,
  fieldClassName,
  ref,
  groupRef,
  className,
  ...textFieldProps
}: InputProps) {
  return (
    <TextField
      {...textFieldProps}
      className={className}
      // Don't clobber an explicit aria-label; fall back to the placeholder
      // only for unlabelled fields that don't provide one.
      aria-label={
        textFieldProps["aria-label"] ??
        (!label && typeof placeholder === "string" ? placeholder : undefined)
      }
    >
      {({ isRequired, isInvalid }) => (
        <>
          {label && (
            <Label
              isRequired={isRequired}
              isInvalid={isInvalid}
              tooltip={tooltip}
            >
              {label}
            </Label>
          )}
          <InputBase
            ref={ref}
            groupRef={groupRef}
            placeholder={placeholder}
            leadingIcon={leadingIcon}
            trailingIcon={trailingIcon}
            leadingAddon={leadingAddon}
            trailingAddon={trailingAddon}
            fieldClassName={fieldClassName}
          />
          {hint && <HintText isInvalid={isInvalid}>{hint}</HintText>}
        </>
      )}
    </TextField>
  );
}

Input.displayName = "Input";
