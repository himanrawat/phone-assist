export default function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Calls" value="--" subtitle="Today" />
        <StatCard title="Avg Duration" value="--" subtitle="This week" />
        <StatCard title="AI Resolution" value="--" subtitle="This month" />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Getting Started
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>
            Start Docker containers:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              bun run docker:up
            </code>
          </li>
          <li>
            Push DB schema:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              bun run db:push
            </code>
          </li>
          <li>
            Seed demo data:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              bun run db:seed
            </code>
          </li>
          <li>
            Start backend:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              bun run dev
            </code>
          </li>
          <li>
            Start ngrok:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              ngrok http 3000
            </code>
          </li>
          <li>
            Set Twilio voice webhook to{" "}
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              https://&lt;ngrok-url&gt;/webhooks/twilio/voice
            </code>{" "}
            with HTTP POST
          </li>
          <li>
            Set Twilio call status webhook to{" "}
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              https://&lt;ngrok-url&gt;/webhooks/twilio/status
            </code>{" "}
            with HTTP POST
          </li>
        </ol>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}
