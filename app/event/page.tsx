import HomePage from "@/components/Home";
import ScrollingLogoBanner_two from "@/components/ScrollingLogo_two";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between">
      <ScrollingLogoBanner_two />
      <HomePage />
    </div>
  );
}
