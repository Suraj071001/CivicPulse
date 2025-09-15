import { NavLink } from "react-router-dom";
import { Map, PlusCircle, Shield } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="container max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="h-3 w-3 rounded-full bg-primary block" />
            </div>
            <span className="font-extrabold tracking-tight">CivicPulse</span>
          </div>
          <div className="text-xs text-muted-foreground">City reporting</div>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-4 flex-1">
        {children}
      </main>

      <nav className="sticky bottom-0 z-40 border-t bg-background/80 backdrop-blur">
        <div className="container max-w-3xl mx-auto px-8 py-2 grid grid-cols-2 gap-3">
          <Tab
            to="/"
            icon={<PlusCircle className="h-5 w-5" />}
            label="Report"
            end
          />
          <Tab to="/dashboard" icon={<Map className="h-5 w-5" />} label="Map" />
          {/* <Tab
            to="/admin"
            icon={<Shield className="h-5 w-5" />}
            label="Admin"
          /> */}
        </div>
      </nav>
    </div>
  );
}

function Tab({
  to,
  label,
  icon,
  end = false,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm",
          isActive
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-foreground hover:bg-muted",
        ].join(" ")
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
