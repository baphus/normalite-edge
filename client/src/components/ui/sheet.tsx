import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        className={cn(
            "fixed inset-0 z-50 bg-black/40",
            "data-[state=open]:animate-[overlay-in_300ms_cubic-bezier(0.32,0.72,0,1)_forwards]",
            "data-[state=closed]:animate-[overlay-out_300ms_cubic-bezier(0.22,1,0.36,1)_forwards]",
            className
        )}
        {...props}
        ref={ref}
    />
));
SheetOverlay.displayName = "SheetOverlay";

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
    side?: "top" | "bottom" | "left" | "right";
}

const sheetAnimations: Record<NonNullable<SheetContentProps["side"]>, string> = {
    bottom: "data-[state=open]:animate-[sheet-bottom-in_500ms_cubic-bezier(0.32,0.72,0,1)_forwards] data-[state=closed]:animate-[sheet-bottom-out_500ms_cubic-bezier(0.22,1,0.36,1)_forwards]",
    left: "data-[state=open]:animate-[sheet-left-in_500ms_cubic-bezier(0.32,0.72,0,1)_forwards] data-[state=closed]:animate-[sheet-left-out_500ms_cubic-bezier(0.22,1,0.36,1)_forwards]",
    right: "data-[state=open]:animate-[sheet-right-in_500ms_cubic-bezier(0.32,0.72,0,1)_forwards] data-[state=closed]:animate-[sheet-right-out_500ms_cubic-bezier(0.22,1,0.36,1)_forwards]",
    top: "data-[state=open]:animate-[sheet-top-in_500ms_cubic-bezier(0.32,0.72,0,1)_forwards] data-[state=closed]:animate-[sheet-top-out_500ms_cubic-bezier(0.22,1,0.36,1)_forwards]",
};

const sheetPlacement: Record<NonNullable<SheetContentProps["side"]>, string> = {
    bottom: "inset-x-0 bottom-0 h-auto rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]",
    left: "inset-y-0 left-0 h-full w-full max-w-lg rounded-xl shadow-2xl",
    right: "inset-y-0 right-0 h-full w-full max-w-lg rounded-xl shadow-2xl",
    top: "inset-x-0 top-0 h-auto rounded-b-2xl shadow-2xl pt-[env(safe-area-inset-top)]",
};

const SheetContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
    <SheetPortal>
        <SheetOverlay />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed z-50 bg-background",
                sheetAnimations[side],
                sheetPlacement[side],
                className
            )}
            {...props}
        >
            {side === "bottom" && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-black/20"
                />
            )}
            {children}
            <DialogPrimitive.Close className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full opacity-70 ring-offset-background transition-opacity hover:bg-accent hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </SheetPortal>
));
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col gap-1.5", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex items-center gap-2 justify-end", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn("text-base font-bold text-gray-900 leading-none tracking-tight", className)}
        {...props}
    />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn("text-xs text-gray-500", className)}
        {...props}
    />
));
SheetDescription.displayName = "SheetDescription";

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
