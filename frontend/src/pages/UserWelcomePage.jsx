import { useAuth } from "../contexts/AuthContext";

export default function UserWelcomePage() {
  const { user } = useAuth();

  return (
    <div className="flex h-full items-center justify-center bg-bg px-4 py-8">
      <section className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-8 text-center sm:p-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <span className="material-symbols-outlined text-[28px]">waving_hand</span>
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          Welcome{user?.full_name ? `, ${user.full_name}` : ""}!
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted sm:text-base">
          Your workspace is ready. You can continue from the Applications area
          using the menu.
        </p>
      </section>
    </div>
  );
}
