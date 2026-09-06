import { useRef } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { CanvasStage } from "@/components/canvas/CanvasStage";

function App() {
  const canvasRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-base-950">
      <Topbar canvasRef={canvasRef} />
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 p-6">
          <CanvasStage ref={canvasRef} />
        </main>
        <Sidebar />
      </div>
    </div>
  );
}

export default App;
