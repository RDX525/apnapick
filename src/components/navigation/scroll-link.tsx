import Link from "next/link";
import type { ComponentProps } from "react";

export function ScrollLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} scroll />;
}
