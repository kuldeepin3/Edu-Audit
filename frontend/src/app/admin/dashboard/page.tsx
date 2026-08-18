"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { 
  ShieldAlert, 
  Users, 
  UserCheck, 
  Building, 
  FileText, 
  Trash2, 
  PlusCircle, 
  LogOut,
  MapPin,
  CheckCircle,
  Briefcase
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [analytics, setAnalytics] = useState<any>(null);
  const [auditors, setAuditors] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields for new Auditor creation
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("Education Department");
  const [district, setDistrict] = useState("Vadodara");
  const [designation, setDesignation] = useState("District Education Officer");
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  const loadData = async () => {
    try {
      const [analyticsRes, auditorsRes, complaintsRes] = await Promise.all([
        api.getAdminAnalytics(),
        api.listAuditors(),
        api.listComplaints({ page: 1, page_size: 50 }).catch(() => ({ items: [] }))
      ]);
      setAnalytics(analyticsRes);
      setAuditors(auditorsRes);
      setComplaints(complaintsRes.items || []);
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAuditor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormSuccess("");
    setFormError("");

    try {
      await api.createAuditor({
        name,
        email,
        phone,
        password,
        employee_id: employeeId,
        department,
        district,
        designation
      });
      setFormSuccess("Auditor account and profile created successfully!");
      // Reset form fields
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setEmployeeId("");
      
      // Reload list and stats
      await loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Failed to create auditor account.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAuditor = async (auditorId: string) => {
    if (!confirm("Are you sure you want to delete this auditor account? This will also delete their login account.")) {
      return;
    }
    try {
      await api.deleteAuditor(auditorId);
      setAuditors(prev => prev.filter(a => a.id !== auditorId));
      loadData(); // Update stats
    } catch (err) {
      console.error("Failed to delete auditor:", err);
      alert("Error deleting auditor account.");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  const stats = [
    { label: "Registered Citizens", value: analytics?.citizens_count || 0, icon: Users, color: "text-blue-400" },
    { label: "Auditor Officers", value: analytics?.auditors_count || 0, icon: UserCheck, color: "text-emerald-400" },
    { label: "Assigned Schools", value: analytics?.schools_count || 0, icon: Building, color: "text-indigo-400" },
    { label: "Total Complaints", value: analytics?.total_complaints || 0, icon: FileText, color: "text-red-400" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-lg">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Admin Console</h1>
            <p className="text-zinc-500 text-xs mt-0.5">EduAudit AI root governance control center</p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-sm font-semibold text-zinc-300 transition-colors"
        >
          <LogOut size={16} /> Logout Admin
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-red-500" />
          <span className="text-sm text-zinc-500">Loading system metrics...</span>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                    <Icon className={stat.color} size={18} />
                  </div>
                  <div className="text-3xl font-extrabold">{stat.value}</div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Auditor Form */}
            <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 space-y-6 lg:col-span-1 h-fit">
              <div>
                <h3 className="text-lg font-bold font-display flex items-center gap-2">
                  <PlusCircle size={20} className="text-red-500" />
                  Register Auditor
                </h3>
                <p className="text-xs text-zinc-500 mt-1">Create official auditor profiles. Self-registration is disabled.</p>
              </div>

              {formSuccess && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <CheckCircle size={16} /> {formSuccess}
                </div>
              )}

              {formError && (
                <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl text-red-400 text-xs font-medium">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateAuditor} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-red-500 text-white"
                    placeholder="Auditor Name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-red-500 text-white"
                      placeholder="auditor@gov.in"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Phone</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-red-500 text-white"
                      placeholder="+91..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Employee ID</label>
                    <input
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-red-500 text-white"
                      placeholder="DEO-VAD-002"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-red-500 text-white"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">District Scope</label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="Vadodara">Vadodara</option>
                      <option value="Ahmedabad">Ahmedabad</option>
                      <option value="Surat">Surat</option>
                      <option value="Rajkot">Rajkot</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Department</label>
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-red-500 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-red-500 text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-lg shadow-red-500/10 transition-colors mt-2"
                >
                  {formLoading ? "Creating account..." : "Register Auditor Account"}
                </button>
              </form>
            </div>

            {/* List Auditors */}
            <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 space-y-6 lg:col-span-2">
              <div>
                <h3 className="text-lg font-bold font-display">System Auditor Directory</h3>
                <p className="text-xs text-zinc-500 mt-1">Review active auditor assignments and revoke access permissions</p>
              </div>

              {auditors.length === 0 ? (
                <div className="py-20 text-center text-zinc-500 text-sm">
                  No auditors registered in the system database.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-6 py-4">Employee ID</th>
                        <th className="px-6 py-4">Name / Designation</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">District / Dept</th>
                        <th className="px-6 py-4 text-right">Revoke</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 bg-zinc-950/20">
                      {auditors.map((aud) => (
                        <tr key={aud.id} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-zinc-300">
                            {aud.employee_id}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-zinc-100">{aud.user?.name || "Officer"}</div>
                            <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5"><Briefcase size={10} /> {aud.designation}</div>
                          </td>
                          <td className="px-6 py-4 text-zinc-400">
                            {aud.user?.email || "-"}
                          </td>
                          <td className="px-6 py-4 text-zinc-400">
                            <div className="flex items-center gap-1"><MapPin size={10} className="text-red-500" /> {aud.district}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">{aud.department}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteAuditor(aud.id)}
                              className="p-2 bg-red-950/20 hover:bg-red-950 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-red-900/30"
                              title="Delete Auditor"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Citizen Complaints & GPS Location Inspector */}
          <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 space-y-6">
            <div>
              <h3 className="text-lg font-bold font-display flex items-center gap-2">
                <MapPin size={20} className="text-red-500" />
                Citizen Complaints & GPS Location Inspector
              </h3>
              <p className="text-xs text-zinc-500 mt-1">Review live filed complaints, severity scores, and exact citizen geolocation coordinates</p>
            </div>

            {complaints.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-sm">
                No active complaints filed in the system.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-4">Report ID</th>
                      <th className="px-6 py-4">School & District</th>
                      <th className="px-6 py-4">Citizen GPS Location</th>
                      <th className="px-6 py-4">Severity & Status</th>
                      <th className="px-6 py-4 text-right">Map Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 bg-zinc-950/20">
                    {complaints.map((comp) => {
                      const hasCoords = comp.latitude && comp.longitude;
                      const mapUrl = hasCoords 
                        ? `https://www.google.com/maps?q=${comp.latitude},${comp.longitude}`
                        : `https://www.google.com/maps/search/${encodeURIComponent((comp.school_name || "School") + " " + (comp.district || "Vadodara"))}`;
                      
                      return (
                        <tr key={comp.id} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-zinc-200">
                            {comp.report_id}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-zinc-100">{comp.school_name || "School"}</div>
                            <div className="text-[10px] text-zinc-500">{comp.district}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                              <MapPin size={14} className="text-red-500 shrink-0" />
                              <span>{comp.gps_location || `${comp.school_name}, ${comp.district}`}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                                {comp.severity_level}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-950/50 text-red-400 border border-red-900/40">
                                {comp.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <a
                              href={mapUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Open Map ↗
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
