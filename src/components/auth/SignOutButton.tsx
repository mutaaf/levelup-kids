// Tiny form that POSTs to /auth/signout. Use this instead of
// <Link href="/auth/signout"> — Link prefetches the URL eagerly in
// production, and if signout is a GET handler the prefetch silently
// signs the user out. Hence: signout is POST-only and triggered by an
// explicit user click via this form.

export function SignOutButton({
  className,
  children = "Sign out",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <form action="/auth/signout" method="POST" className="inline">
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
