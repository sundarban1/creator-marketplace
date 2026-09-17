/**
 * Notice shown under the browse-page search bar while Kolab is pre-launch.
 * Remove once the platform is officially live.
 */
export function TestPhaseBanner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-line bg-white px-5 py-4 shadow-[0_12px_34px_-20px_rgba(20,17,16,0.25)] ${className}`}
    >
      <p className="text-[13px] leading-relaxed text-red-600">
        <span className="font-semibold">🧪 Kolab is in Test Phase</span>
        <br />
        Welcome to Kolab! 🎉 Feel free to explore the platform, create your account, and try out the
        features, workflows, and payment experience.
        <br />
        This is your chance to see how Kolab works before the official launch. 🚀
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-green-600">
        Good news: Your account will stay active after launch. You can simply continue using the same
        account and login details—no need to sign up again!
      </p>
    </div>
  );
}
