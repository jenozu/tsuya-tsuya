import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-[#2D2A26] text-[#F9F8F4] hover:bg-[#3D3A36] focus:ring-[#2D2A26]",
        secondary: "bg-[#E5E0D8] text-[#2D2A26] hover:bg-[#D4CEC5] focus:ring-[#E5E0D8]",
        outline: "border border-[#2D2A26] text-[#2D2A26] hover:bg-[#2D2A26] hover:text-[#F9F8F4] focus:ring-[#2D2A26]",
        ghost: "text-[#2D2A26] hover:bg-[#E5E0D8] focus:ring-[#E5E0D8]",
        danger: "bg-[#8C3F3F] text-white hover:bg-red-700 focus:ring-[#8C3F3F]",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        default: "px-6 py-3 text-base",
        lg: "px-8 py-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
