import Link from "next/link";
import { ShieldAlert, ArrowRight, Zap, MapPin, Database, BrainCircuit, Activity, Users, Globe } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background overflow-hidden relative">
      
      {/* Background Glow Ring & Grid */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-start justify-center">
        <div className="w-[1200px] h-[600px] bg-primary/10 rounded-full blur-[120px] -mt-64 relative -z-10 animate-pulse" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />
      </div>

      <main className="flex-1 flex flex-col z-10">
        
        {/* --- HERO SECTION --- */}
        <section className="w-full max-w-6xl mx-auto px-6 pt-32 pb-24 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20 mb-8 tracking-wider uppercase">
            <Globe className="w-3.5 h-3.5 animate-pulse" />
            Active Geospatial Command
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Intelligent Crisis <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">
              Command Centre
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            NeedNow Map empowers emergency responders and civic authorities to ingest, analyze, and orchestrate crisis telemetry in real-time. Actionable intelligence, not just data.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link 
              href="/dashboard" 
              className="flex items-center justify-center gap-2 px-8 py-4 w-full sm:w-auto rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:-translate-y-0.5"
            >
              Launch Admin Dashboard <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/report" 
              className="flex items-center justify-center gap-2 px-8 py-4 w-full sm:w-auto rounded-xl border border-border bg-card/50 text-foreground font-semibold hover:bg-secondary hover:text-foreground transition-all hover:-translate-y-0.5"
            >
              Report an Incident
            </Link>
          </div>
        </section>

        {/* --- HIGHLIGHTS SECTION --- */}
        <section className="w-full max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="flex flex-col p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-md hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4 border border-blue-500/20">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">Real-time Triage</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Proprietary urgency calculations ensure that critical red-zone emergencies immediately float to the top of the operations queue.
              </p>
            </div>

            <div className="flex flex-col p-6 rounded-2xl border border-red-500/20 bg-red-950/10 backdrop-blur-md hover:border-red-500/50 transition-colors relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-[30px] rounded-full" />
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 mb-4 border border-red-500/20">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">Live Map Awareness</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Map coordinates, affected zones, and spatial proximity metrics give response units absolute visual situational awareness.
              </p>
            </div>

            <div className="flex flex-col p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-md hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 border border-indigo-500/20">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">AI Analysis</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Unstructured chaotic inputs are instantly converted into prioritized, actionable JSON action-plans before human review.
              </p>
            </div>

            <div className="flex flex-col p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-md hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 border border-emerald-500/20">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">Fast Coordination</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Assign response teams natively within the queue, synchronizing the entire global command state in milliseconds.
              </p>
            </div>

          </div>
        </section>

        {/* --- HOW IT WORKS FLOW --- */}
        <section className="w-full max-w-5xl mx-auto px-6 py-24 border-t border-border/50 mt-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Operational Flow Matrix</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">From chaos to coordination in seconds.</p>
          </div>
          
          <div className="relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 -z-10" />
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="bg-card border border-border p-5 rounded-xl shadow-sm relative text-center flex flex-col items-center group hover:border-primary/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm absolute -top-4 shadow-lg ring-4 ring-background">1</div>
                <div className="mt-4 mb-2 p-3 bg-secondary rounded-full text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors"><ShieldAlert className="w-5 h-5"/></div>
                <h4 className="font-bold text-sm uppercase tracking-wider mb-1">Ingest</h4>
                <p className="text-xs text-muted-foreground">Citizen submits field report.</p>
              </div>
              
              <div className="bg-card border border-border p-5 rounded-xl shadow-sm relative text-center flex flex-col items-center group hover:border-primary/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm absolute -top-4 shadow-lg ring-4 ring-background">2</div>
                <div className="mt-4 mb-2 p-3 bg-secondary rounded-full text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors"><BrainCircuit className="w-5 h-5"/></div>
                <h4 className="font-bold text-sm uppercase tracking-wider mb-1">Assess</h4>
                <p className="text-xs text-muted-foreground">AI classifies and ranks urgency.</p>
              </div>

              <div className="bg-card border border-border p-5 rounded-xl shadow-sm relative text-center flex flex-col items-center group hover:border-primary/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm absolute -top-4 shadow-lg ring-4 ring-background">3</div>
                <div className="mt-4 mb-2 p-3 bg-secondary rounded-full text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors"><MapPin className="w-5 h-5"/></div>
                <h4 className="font-bold text-sm uppercase tracking-wider mb-1">Project</h4>
                <p className="text-xs text-muted-foreground">Mapped to global visual array.</p>
              </div>

              <div className="bg-card border border-border p-5 rounded-xl shadow-sm relative text-center flex flex-col items-center group hover:border-primary/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm absolute -top-4 shadow-lg ring-4 ring-background">4</div>
                <div className="mt-4 mb-2 p-3 bg-secondary rounded-full text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors"><Activity className="w-5 h-5"/></div>
                <h4 className="font-bold text-sm uppercase tracking-wider mb-1">Deploy</h4>
                <p className="text-xs text-muted-foreground">Operators dispatch correct teams.</p>
              </div>
            </div>
          </div>
        </section>

        {/* --- TRUST & IMPACT --- */}
        <section className="w-full max-w-4xl mx-auto px-6 py-20 bg-muted/30 border border-border rounded-3xl text-center mb-16">
          <Database className="w-10 h-10 mx-auto text-primary mb-6 opacity-80" />
          <h2 className="text-2xl font-bold mb-4">Built for Civic Resilience</h2>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            In crisis events, information chaos costs lives. We designed NeedNow Map to bypass raw noise, instantly structuring fragmented reports into an elite, actionable command feed built specifically for professional operations.
          </p>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="border-t border-border mt-auto w-full">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-primary font-bold tracking-tight">
            <ShieldAlert className="w-5 h-5" /> NeedNow Map
          </div>
          <p className="text-xs text-muted-foreground text-center md:text-left">
            Civic Hackathon Prototype Edition. Operating in simulated data environment.
          </p>
          <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Link href="/dashboard" className="hover:text-primary transition-colors">System Ops</Link>
            <Link href="/live-map" className="hover:text-primary transition-colors">Live Matrix</Link>
          </div>
        </div>
      </footer>
      
    </div>
  );
}
