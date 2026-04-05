import { redirect } from "next/navigation";

export default async function LegacyAdminRedirect({
  params,
}: Readonly<{
  params: Promise<{ slug?: string[] }>;
}>) {
  const { slug = [] } = await params;
  redirect(slug.length > 0 ? `/app/${slug.join("/")}` : "/app/dashboard");
}
