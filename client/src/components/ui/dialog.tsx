import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Apple HIG backdrop: 50% black dim, no blur behind modals
      "fixed inset-0 z-50 bg-black/50",
      "data-[state=open]:animate-[overlay-in_300ms_cubic-bezier(0.32,0.72,0,1)_forwards]",
      "data-[state=closed]:animate-[overlay-out_300ms_cubic-bezier(0.32,0.72,0,1)_forwards]",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Center dialog: spring-like scale 0.95→1 + fade, no overshoot (Apple HIG)
        // Note: centering is handled inside the dialog-in/out keyframes
        // (translate(-50%, -50%)), so no Tailwind translate utilities here —
        // in Tailwind v4 those emit the standalone `translate` property and
        // would double-shift the dialog off-center.
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg gap-4 border border-border/50 bg-background p-6 shadow-2xl rounded-xl",
        "data-[state=open]:animate-[dialog-in_400ms_cubic-bezier(0.32,0.72,0,1)_forwards]",
        "data-[state=closed]:animate-[dialog-out_300ms_cubic-bezier(0.22,1,0.36,1)_forwards]",
        // Mobile: bottom sheet (safe-area-aware via max-h, scrolls when tall)
        "max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:translate-x-0 max-sm:translate-y-0 max-sm:w-full max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[85vh] max-sm:overflow-y-auto",
        "max-sm:data-[state=open]:animate-[sheet-bottom-in_500ms_cubic-bezier(0.32,0.72,0,1)_forwards]",
        "max-sm:data-[state=closed]:animate-[sheet-bottom-out_400ms_cubic-bezier(0.22,1,0.36,1)_forwards]",
        className
      )}
      {...props}
    >
      {/* Mobile bottom-sheet grab handle */}
      <div
        className="mx-auto mt-1 mb-3 h-1 w-10 shrink-0 rounded-full bg-muted sm:hidden"
        aria-hidden="true"
      />
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 transition-colors hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none dark:bg-white/10 dark:hover:bg-white/15 sm:h-6 sm:w-6">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
