import Dashboard from "@/components/Dashboard";
import SetupScreen from "@/components/SetupScreen";

export default function Page() {
  const configured = Boolean(process.env.WINDSOR_API_KEY);

  return (
    <main className="app-bg relative min-h-screen">
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {configured ? <Dashboard /> : <SetupScreen />}
      </div>
    </main>
  );
}
