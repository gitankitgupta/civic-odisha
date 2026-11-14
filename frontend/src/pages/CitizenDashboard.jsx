import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../config';

export default function CitizenDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/citizen-login');
        return;
      }

      const token = session.access_token;

      try {
        const profileRes = await fetch(`${API_BASE_URL}/api/citizen/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profileData = await profileRes.json();
        setProfile(profileData);

        const grievancesRes = await fetch(`${API_BASE_URL}/api/citizen/my-grievances`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const grievancesData = await grievancesRes.json();
        setGrievances(Array.isArray(grievancesData) ? grievancesData : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/citizen-login');
  };

  if (loading) {
    return <div className="p-8 text-[#94A3B8]" style={{ fontFamily: "'Inter', sans-serif" }}>Loading your dashboard...</div>;
  }

  const statusCounts = grievances.reduce((acc, g) => {
    acc[g.status] = (acc[g.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
        .display-font { font-family: 'Space Grotesk', sans-serif; }
      `}</style>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3">CITIZEN DASHBOARD</p>
            <h1 className="display-font text-3xl font-bold text-[#0B1F3A]">
              Welcome{profile?.name ? `, ${profile.name}` : ''}
            </h1>
            {profile?.email && <p className="text-sm text-[#64748B] mt-1">{profile.email}</p>}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-[#64748B] hover:text-[#DC2626] transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-[#E5EEEC] rounded-2xl p-5 text-center">
            <p className="display-font text-2xl font-bold text-[#D97706]">{statusCounts.submitted || 0}</p>
            <p className="text-xs text-[#64748B] mt-1">Pending</p>
          </div>
          <div className="bg-white border border-[#E5EEEC] rounded-2xl p-5 text-center">
            <p className="display-font text-2xl font-bold text-[#0284C7]">{statusCounts.in_progress || 0}</p>
            <p className="text-xs text-[#64748B] mt-1">In Progress</p>
          </div>
          <div className="bg-white border border-[#E5EEEC] rounded-2xl p-5 text-center">
            <p className="display-font text-2xl font-bold text-[#16A34A]">{statusCounts.resolved || 0}</p>
            <p className="text-xs text-[#64748B] mt-1">Resolved</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="display-font text-lg font-bold text-[#0B1F3A]">My Complaints</h2>
          <Link
            to="/report"
            className="text-sm font-semibold bg-[#0EA5A0] text-white px-4 py-2 rounded-full hover:bg-[#0B8A85] transition-colors"
          >
            Submit New Complaint
          </Link>
        </div>

        {grievances.length === 0 ? (
          <p className="text-[#64748B] text-sm">You haven't submitted any complaints yet.</p>
        ) : (
          <div className="space-y-3">
            {grievances.map((g) => (
              <Link
                key={g.id}
                to={`/issue/${g.id}`}
                className="block bg-white border border-[#E5EEEC] rounded-2xl p-5 hover:border-[#0EA5A0] transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-[#0B1F3A]">{g.title}</p>
                    <p className="text-xs text-[#94A3B8]">{g.category}</p>
                  </div>
                  <span className="text-xs font-medium text-[#64748B] capitalize">{g.status.replace('_', ' ')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}