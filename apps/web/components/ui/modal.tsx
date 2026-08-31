"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ isOpen, onClose, title, children, maxWidth = "md" }: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Prevent body scroll while modal open
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.top = `-${scrollY}px`;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
          return;
        }

        // Focus trap
        if (e.key === "Tab" && modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);

      // Focus first interactive element
      setTimeout(() => {
        if (modalRef.current) {
          const firstInput = modalRef.current.querySelector<HTMLElement>(
            "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])"
          );
          if (firstInput) {
            firstInput.focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 50);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        // Restore body scroll
        const scrollY = document.body.style.top;
        document.body.style.overflow = "";
        document.body.style.top = "";
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      {/* Accessible Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container — fills on mobile, max-height on desktop */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          "relative w-full bg-surface border border-border shadow-modal z-10 focus:outline-none flex flex-col",
          "rounded-t-2xl sm:rounded-2xl",
          "max-h-[95dvh] sm:max-h-[90dvh]",
          "animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200",
          "transition-colors",
          widths[maxWidth]
        )}
      >
        {/* Modal Header — always visible, never scrolls */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-border bg-surface rounded-t-2xl sm:rounded-t-2xl">
          <h3 id={titleId} className="text-base font-bold text-text-main tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Cerrar ventana modal"
            className="text-text-muted hover:text-text-main transition-colors p-1.5 rounded-xl hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body — scrolls internally */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 text-text-main">
          {children}
        </div>
      </div>
    </div>
  );
}