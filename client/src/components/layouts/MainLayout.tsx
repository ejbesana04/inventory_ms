import React, { useState, type ReactNode } from "react";
import { Navbar, Sidebar, Footer } from "../layouts/index";

interface MainLayoutProps {
  content: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ content }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-bg-dark">
        <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <Sidebar isOpen={isSidebarOpen} />
        <div className="sm:ml-64 pt-16 flex min-h-screen min-w-0 max-w-full flex-col overflow-x-hidden">
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm sm:hidden" 
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          <main className="grow min-w-0 max-w-full overflow-x-hidden p-4 md:p-6">
            <div className="mx-auto mt-3 w-full min-w-0 max-w-7xl">
              {content}
            </div>
          </main>
          <Footer />
        </div>
      </div>
  );
  
};

export default MainLayout;