import { EmptyPage } from "@/components/EmptyPage";

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  return <EmptyPage title={ref} body="Coming soon" />;
}
