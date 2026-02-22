import { Outlet } from "react-router";
import { Toaster } from "sonner";
import { FloatingJarvis } from "./components/FloatingJarvis";

const natureBg = "https://images.unsplash.com/photo-1681926946700-73c10c72ef15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxDYWxpZm9ybmlhJTIwbmF0dXJlJTIwZm9yZXN0JTIwdHJhaWx8ZW58MXx8fHwxNzcxNzI1MTgwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

export function Root() {
  return (
    <div className="min-h-screen text-white selection:bg-[#F2E8CF]/30 relative">
      {/* Fixed nature background */}
      <div className="fixed inset-0 z-0">
        <img src={natureBg} alt="" className="w-full h-full object-cover scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a2e10]/80 via-[#1a2e10]/75 to-[#0d1208]/90" />
      </div>
      <div className="relative z-10">
        <Toaster
          position="top-center"
          richColors
          theme="dark"
          toastOptions={{
            style: {
              background: 'rgba(30, 58, 18, 0.92)',
              border: '1px solid rgba(242, 232, 207, 0.15)',
              color: '#F2E8CF',
              backdropFilter: 'blur(12px)',
              fontWeight: 700,
              fontSize: '13px',
            },
            classNames: {
              success: '!bg-[#1e4a12]/95 !border-[#8BC34A]/25 !text-[#c5e1a5]',
              error: '!bg-[#3a1212]/95 !border-[#ef5350]/25 !text-[#ef9a9a]',
              info: '!bg-[#1a2e10]/95 !border-[#F2E8CF]/20 !text-[#F2E8CF]',
            },
          }}
        />
        <Outlet />
        <FloatingJarvis />
      </div>
    </div>
  );
}