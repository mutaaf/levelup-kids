// Plain constants shared between the server action file and the client
// component. Lives OUTSIDE the "use server" module because that wraps
// every export as a server-action reference — a plain array exported
// from a "use server" file arrives at the client as a function, not an
// array, and `.map()` throws.

import { AVATARS } from "@/lib/children/avatars";

export const AVAILABLE_AVATARS: readonly string[] = AVATARS;
export const MAX_KIDS = 6;
