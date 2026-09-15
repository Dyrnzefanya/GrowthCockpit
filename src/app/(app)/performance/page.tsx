import { performanceModel } from "@/services/performance";
import { Performance } from "@/components/performance";
import { DecisionHistory } from "@/components/decisions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  return (
    <>
      <Performance m={await performanceModel(search)} />
      <DecisionHistory search={search} />
    </>
  );
}
