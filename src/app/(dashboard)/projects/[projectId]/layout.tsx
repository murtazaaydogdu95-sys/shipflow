import { Sidebar } from "@/components/layout/sidebar";
import { QuickCaptureProvider } from "@/components/providers/quick-capture-provider";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <>
      <Sidebar projectId={projectId} />
      <QuickCaptureProvider projectId={projectId}>
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </QuickCaptureProvider>
    </>
  );
}
