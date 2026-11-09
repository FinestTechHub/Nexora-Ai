import StoreButtons from "../StoreButton";

export default function Download() {
  return (
    <section id="download" className="py-20">
      <div className="wrap">
        <div className="rounded-[32px] bg-gradient-to-br from-blue-700 via-brand to-sky px-6 py-14 text-center text-white">
          <h2 className="h2">Your Next Great Creation <br className="hidden sm:block" />Starts Here.</h2>
          <p className="mx-auto mb-8 mt-4 max-w-lg text-blue-100">Take your creativity further with AI. Download the app and start creating.</p>
          <StoreButtons />
        </div>
      </div>
    </section>
  );
}
