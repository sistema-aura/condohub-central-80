"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

const MIN_SHEET_WIDTH = 340;
const SHEET_EDGE_GAP = 24;
const SHEET_KEY_PREFIX = "sheet-width:";

function clampSheetWidth(value: number) {
  const max = Math.max(MIN_SHEET_WIDTH, window.innerWidth - SHEET_EDGE_GAP);
  return Math.round(Math.min(Math.max(value, MIN_SHEET_WIDTH), max));
}

interface SheetContentProps
  extends
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /** Permite arrastar a bordo da ficha para lhe alterar a largura. */
  resizable?: boolean;
  /** Identificador usado para lembrar a largura escolhida. */
  resizeKey?: string;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, resizable = false, resizeKey, style, ...props }, ref) => {
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState<number | null>(null);
  const [dragging, setDragging] = React.useState(false);

  React.useEffect(() => {
    if (!resizable || !resizeKey) return;
    try {
      const saved = Number(window.localStorage.getItem(SHEET_KEY_PREFIX + resizeKey));
      if (Number.isFinite(saved) && saved >= MIN_SHEET_WIDTH) setWidth(clampSheetWidth(saved));
    } catch {
      /* sem acesso a armazenamento local */
    }
  }, [resizable, resizeKey]);

  React.useEffect(() => {
    if (width === null) return;
    const onResize = () => setWidth((w) => (w === null ? w : clampSheetWidth(w)));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [width]);

  const remember = React.useCallback(
    (value: number | null) => {
      if (!resizeKey) return;
      try {
        if (value === null) window.localStorage.removeItem(SHEET_KEY_PREFIX + resizeKey);
        else window.localStorage.setItem(SHEET_KEY_PREFIX + resizeKey, String(value));
      } catch {
        /* sem acesso a armazenamento local */
      }
    },
    [resizeKey],
  );

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizable || event.button !== 0) return;
    const el = innerRef.current;
    if (!el) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = el.getBoundingClientRect().width;
    const direction = side === "left" ? 1 : -1;
    let latest = startWidth;
    setDragging(true);
    document.body.style.userSelect = "none";
    const move = (e: PointerEvent) => {
      latest = clampSheetWidth(startWidth + direction * (e.clientX - startX));
      setWidth(latest);
    };
    const stop = () => {
      setDragging(false);
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      remember(latest);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  const nudge = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!resizable) return;
    const step = event.shiftKey ? 80 : 24;
    const base = width ?? innerRef.current?.getBoundingClientRect().width ?? MIN_SHEET_WIDTH;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const next = clampSheetWidth(base + (side === "left" ? -step : step));
      setWidth(next);
      remember(next);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = clampSheetWidth(base + (side === "left" ? step : -step));
      setWidth(next);
      remember(next);
    }
  };

  const reset = () => {
    setWidth(null);
    remember(null);
  };

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={cn(sheetVariants({ side }), className)}
        style={{
          ...(width !== null ? { width, maxWidth: "none" } : null),
          ...(dragging ? { transition: "none" } : null),
          ...style,
        }}
        {...props}
      >
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
        {resizable && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Arrastar para ajustar a largura"
            title="Arrasta para alargar · duplo clique para repor"
            tabIndex={0}
            onPointerDown={startDrag}
            onDoubleClick={reset}
            onKeyDown={nudge}
            className={cn(
              "group absolute top-0 z-20 hidden h-[100dvh] w-5 -translate-x-1/2 cursor-col-resize touch-none select-none items-center justify-center outline-none sm:flex",
              side === "right" ? "left-0" : "right-0",
            )}
          >
            <span className="h-24 w-1.5 rounded-full bg-foreground/10 transition-all duration-200 group-hover:h-40 group-hover:bg-primary/60 group-focus-visible:h-40 group-focus-visible:bg-primary/70" />
          </div>
        )}
        {children}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
