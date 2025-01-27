import HomePage from "@/components/Home";
import ScrollingLogoBanner from "@/components/ScrollingLogo";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between">
      <ScrollingLogoBanner />
      <HomePage />
    </div>
  );
}
