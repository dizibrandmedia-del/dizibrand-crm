import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { PotentialHandover } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { toast } from 'sonner';
import { Sparkles, Clock, CheckCircle2, Award, ArrowRight } from 'lucide-react';

export const ConsultantPotentialPage: React.FC = () => {
  const [potentialLeads, setPotentialLeads] = useState<PotentialHandover[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPotentialLeads = async () => {
    setIsLoading(true);
    try {
      const res = await api.potentialLeads.list();
      setPotentialLeads(res.potentialLeads);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load potential leads');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPotentialLeads();
  }, []);

  return (
    <div className="space-y-4 pb-6">
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          My Handed-Over Potential Leads ({potentialLeads.length})
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          High-intent qualified opportunities handed over for executive closing. Your attribution remains permanent!
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Fetching your submitted opportunities..." />
      ) : potentialLeads.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="w-8 h-8 text-amber-500" />}
          title="No Potential Leads Submitted Yet"
          description="When you identify a client with clear requirement and budget, click 'Send as Potential Lead' on any lead card to hand over to leadership."
        />
      ) : (
        <div className="space-y-3">
          {potentialLeads.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-400">{p.lead_code}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  p.admin_status === 'WON' ? 'bg-emerald-500/20 text-emerald-300' :
                  p.admin_status === 'LOST' ? 'bg-rose-500/20 text-rose-300' :
                  p.admin_status === 'PROPOSAL_SENT' ? 'bg-violet-500/20 text-violet-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  Stage: {p.admin_status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-white">{p.company_name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Contact: <strong className="text-slate-200">{p.contact_person}</strong> • <span className="font-mono text-indigo-300">{p.mobile}</span>
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Requirement: {p.requirement}
                </span>
                <p className="text-slate-300">{p.requirement_details}</p>
                <div className="pt-1.5 flex flex-wrap gap-2 text-[11px] text-slate-400">
                  <span>Budget: <strong className="text-emerald-400">{p.budget || 'Not specified'}</strong></span>
                  <span>•</span>
                  <span>Urgency: <strong className="text-amber-400">{p.urgency}</strong></span>
                </div>
              </div>

              {p.admin_notes && (
                <div className="p-2.5 bg-indigo-950/30 rounded-xl border border-indigo-900/40 text-xs text-indigo-300">
                  <strong className="block text-[10px] uppercase tracking-wider text-indigo-400">Leadership Closing Notes:</strong>
                  <p className="mt-0.5">{p.admin_notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                <span>Handed Over: {new Date(p.created_at).toLocaleString()}</span>
                <span className="text-amber-400 font-bold">Attribution: Permanent to You</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
