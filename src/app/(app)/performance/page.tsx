import { performanceModel } from "@/services/performance";
import { Performance } from "@/components/performance";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <Performance m={await performanceModel(await searchParams)} />;
}
