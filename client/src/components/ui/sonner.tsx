import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "font-lexend text-xs rounded-lg border border-gray-100 shadow-md",
          title: "font-semibold text-gray-900",
          description: "text-gray-500",
          actionButton: "bg-primary text-white text-xs rounded-md",
          cancelButton: "bg-gray-100 text-gray-700 text-xs rounded-md",
          error: "!border-red-100 !bg-red-50",
          success: "!border-green-100 !bg-green-50",
          warning: "!border-amber-100 !bg-amber-50",
          info: "!border-blue-100 !bg-blue-50",
        },
      }}
      richColors
      {...props}
    />
  )
}

export { Toaster }
