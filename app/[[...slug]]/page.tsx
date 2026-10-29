import { Platform } from "@/components/platform";
export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  return <Platform path={"/" + (slug?.join("/") ?? "")} />;
}
