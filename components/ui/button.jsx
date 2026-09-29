import { cva } from 'class-variance-authority';
import { cn } from 'cn';
import { Slot } from 'radix-ui';

export const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-sm font-semibold transition-[background-color,color,border-color] duration-150 ease-out select-none disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
        outline:
          'border-input bg-card text-primary hover:border-primary hover:bg-accent active:bg-accent aria-expanded:bg-accent',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-muted active:bg-muted aria-expanded:bg-muted',
        ghost: 'text-primary hover:bg-accent active:bg-accent aria-expanded:bg-accent',
        destructive: 'bg-danger-bg text-danger hover:bg-danger/15 active:bg-danger/20',
        'danger-solid': 'bg-danger text-white hover:bg-danger-hover active:bg-danger-active',
        inverse:
          'bg-champagne text-champagne-foreground hover:bg-champagne-hover active:bg-champagne-active',
        link: 'text-primary underline underline-offset-4 hover:text-primary-hover',
      },
      shape: { default: 'rounded-md', pill: 'rounded-full' },
      size: {
        default: 'min-h-11 gap-2 px-4 py-2',
        xs: "min-h-11 gap-1 px-2 py-1 text-xs md:min-h-8 [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-11 gap-1.5 px-3 py-1.5 text-sm md:min-h-9 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'min-h-12 gap-2 px-5 py-3',
        icon: 'size-11',
        'icon-xs': "size-11 md:size-8 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-11 md:size-9',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: { variant: 'default', size: 'default', shape: 'default' },
  },
);

export function Button({
  className,
  variant = 'default',
  size = 'default',
  shape = 'default',
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, shape, className }))}
      {...props}
    />
  );
}
