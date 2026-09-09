import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, RefreshCw, Briefcase, 
  DollarSign, CheckCircle2, UserCheck, Calendar
} from 'lucide-react';
import { api } from '../api/client';
import { Employee } from '../types';

export const WorkforceView: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Employee Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    employee_id: '',
    name: '',
    gender: 'F',
    age: '25',
    work_room: 'Braiding Room 1',
    base_salary: '4500.00',
    performance_score: '85.0',
    work_hours_per_day: '8'
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/workforce/employees/');
      setEmployees(res.results || res);
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/workforce/employees/', {
        ...newEmployee,
        age: Number(newEmployee.age),
        work_hours_per_day: Number(newEmployee.work_hours_per_day)
      });
      setShowAddModal(false);
      setNewEmployee({
        employee_id: '',
        name: '',
        gender: 'F',
        age: '25',
        work_room: 'Braiding Room 1',
        base_salary: '4500.00',
        performance_score: '85.0',
        work_hours_per_day: '8'
      });
      fetchEmployees();
    } catch (err: any) {
      alert(err.message || 'Failed to add laborer');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const term = searchTerm.toLowerCase();
    return (
      emp.name.toLowerCase().includes(term) ||
      emp.employee_id.toLowerCase().includes(term) ||
      (emp.work_room && emp.work_room.toLowerCase().includes(term))
    );
  });

  const totalLaborers = employees.length;
  const totalPayrollBaseline = employees.reduce((sum, e) => sum + parseFloat(e.base_salary || '0'), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-factory-rust/10 text-factory-amber">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              Laborers & Factory Workforce (27 Operators)
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Preserving Excel's LABORERS sheet: machine operators, braiding room assignments, and base monthly wages.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchEmployees}
            className="p-2.5 rounded-lg border border-factory-darkBorder text-factory-muted hover:text-factory-paper hover:bg-factory-darkBorder/40 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-factory-rust/20"
          >
            <Plus className="w-4 h-4" />
            Register Laborer
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Active Workforce
          </div>
          <div className="text-2xl font-bold font-mono text-factory-paper mt-1">
            {totalLaborers}
          </div>
          <div className="text-xs text-factory-muted mt-1">Machine operators & floor crew</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Monthly Base Payroll
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {totalPayrollBaseline.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
          </div>
          <div className="text-xs text-factory-muted mt-1">Before attendance deductions & OT</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Average Base Wage
          </div>
          <div className="text-2xl font-bold font-mono text-factory-amber mt-1">
            {(totalLaborers > 0 ? totalPayrollBaseline / totalLaborers : 0).toFixed(2)} ETB
          </div>
          <div className="text-xs text-factory-muted mt-1">Standard factory monthly baseline</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-factory-muted" />
        <input
          type="text"
          placeholder="Search laborer name, ID, or room..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-factory-darkCard border border-factory-darkBorder rounded-lg text-xs text-factory-paper placeholder-factory-muted focus:outline-none focus:border-factory-amber"
        />
      </div>

      {/* Employees Table */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-factory-dark/60 text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono border-b border-factory-darkBorder">
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Gender / Age</th>
                <th className="py-3 px-4">Work Room / Section</th>
                <th className="py-3 px-4">Base Wage (ETB)</th>
                <th className="py-3 px-4">Performance Score</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-darkBorder/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-factory-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-factory-amber" />
                    Loading workforce directory...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-factory-muted">
                    No employees found matching the search.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-factory-darkBorder/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-factory-amber">
                      {emp.employee_id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-factory-paper">
                      {emp.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-factory-muted text-[11px]">
                      {emp.gender} {emp.age ? `• ${emp.age} yrs` : ''}
                    </td>
                    <td className="py-3.5 px-4 text-factory-paper">
                      {emp.work_room || 'Shop Floor'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {parseFloat(emp.base_salary).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded bg-factory-dark border border-factory-darkBorder text-factory-paper">
                        {parseFloat(emp.performance_score || '80').toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {emp.employment_status || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Register Laborer */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                <Users className="w-4 h-4 text-factory-amber" />
                Register Laborer / Operator
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-factory-muted hover:text-factory-paper text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
              <div>
                <label className="block text-factory-muted mb-1 font-medium">Employee ID (e.g. LAB-028)</label>
                <input
                  type="text"
                  value={newEmployee.employee_id}
                  onChange={(e) => setNewEmployee({ ...newEmployee, employee_id: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Gender</label>
                  <select
                    value={newEmployee.gender}
                    onChange={(e) => setNewEmployee({ ...newEmployee, gender: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  >
                    <option value="F">Female</option>
                    <option value="M">Male</option>
                  </select>
                </div>
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Age</label>
                  <input
                    type="number"
                    value={newEmployee.age}
                    onChange={(e) => setNewEmployee({ ...newEmployee, age: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Base Monthly Wage (ETB)</label>
                  <input
                    type="number"
                    step="50"
                    value={newEmployee.base_salary}
                    onChange={(e) => setNewEmployee({ ...newEmployee, base_salary: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Work Room</label>
                  <input
                    type="text"
                    value={newEmployee.work_room}
                    onChange={(e) => setNewEmployee({ ...newEmployee, work_room: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg font-semibold flex items-center gap-2"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Register Laborer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
