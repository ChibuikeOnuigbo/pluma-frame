import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-panel border border-base-800 bg-base-900/60 p-3", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

export { Card };
