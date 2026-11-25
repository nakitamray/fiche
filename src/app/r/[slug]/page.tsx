import { Workbench } from "./Workbench";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Workbench slug={slug} />;
}
