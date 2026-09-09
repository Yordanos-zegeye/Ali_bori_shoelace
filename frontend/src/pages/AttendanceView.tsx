import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, Search, CheckCircle2, XCircle, Clock, 
  RefreshCw, AlertTriangle, Calendar, UserCheck, Check, Save
} from 'lucide-react';
import { api } from '../api/client';
import { Employee, AttendanceRecord } from '../types';

export const AttendanceView: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local state for recording attendance for all laborers on the selected date
  const [attendanceState, setAttendanceState] = useState<Record<string, {
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
    overtime_hours: string;
    is_saturday: boolean;
    record_id?: string;
  }>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, attRes] = await Promise.all([
        api.get<any>('/workforce/employees/'),
        api.get<any>(`/workforce/attendance/?date=${selectedDate}`)
      ]);
      const empList: Employee[] = empRes.results || empRes;
      const attList: AttendanceRecord[] = attRes.results || attRes;
      setEmployees(empList);
      setRecords(attList);

      // Build mapping
      const stateMap: Record<string, any> = {};
      empList.forEach((emp) => {
        const found = attList.find((a) => a.employee === emp.id || (a as any).employee_id === emp.id);
        if (found) {
          stateMap[emp.id] = {
            status: found.status,
            overtime_hours: found.overtime_hours || '0.00',
            is_saturday: found.is_saturday,
            record_id: found.id
          };
        } else {
          stateMap[emp.id] = {
            status: 'PRESENT',
            overtime_hours: '0.00',
            is_saturday: new Date(selectedDate).getDay() === 6,
          };
        }
      });
      setAttendanceState(stateMap);
    } catch (err) {
      console.error('Failed to load attendance', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const handleStatusChange = (empId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE') => {
    setAttendanceState((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        status
      }
    }));
  };

  const handleOvertimeChange = (empId: string, overtime_hours: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        overtime_hours
      }
    }));
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);

      // Save each employee's attendance record
      const promises = employees.map(async (emp) => {
        const st = attendanceState[emp.id];
        if (!st) return;
        if (st.record_id) {
          // Update existing
          return api.patch(`/workforce/attendance/${st.record_id}/`, {
            status: st.status,
            overtime_hours: st.overtime_hours,
            is_saturday: st.is_saturday
          });
        } else {
          // Create new with duplicate prevention
          return api.post('/workforce/attendance/', {
            employee: emp.id,
            date: selectedDate,
            status: st.status,
            overtime_hours: st.overtime_hours,
            is_saturday: st.is_saturday
          });
        }
      });

      await Promise.all(promises);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to save attendance records');
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = () => {
    setAttendanceState((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        next[id] = { ...next[id], status: 'PRESENT' };
      });
      return next;
    });
  };

  const filteredEmployees = employees.filter((emp) => {
    const term = searchTerm.toLowerCase();
    return (
      emp.name.toLowerCase().includes(term) ||
      emp.employee_id.toLowerCase().includes(term) ||
      (emp.work_room && emp.work_room.toLowerCase().includes(term))
    );
  });

  const presentCount = Object.values(attendanceState).filter((s) => s.status === 'PRESENT').length;
  const absentCount = Object.values(attendanceState).filter((s) => s.status === 'ABSENT').length;
  const lateCount = Object.values(attendanceState).filter((s) => s.status === 'LATE').length;
  const totalOvertime = Object.values(attendanceState).reduce(
    (sum, s) => sum + parseFloat(s.overtime_hours || '0'),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-factory-amber/10 text-factory-amber">
              <CalendarCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              Daily Worker Attendance
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Mark worker presence, absences, and overtime hours. Automatically updates monthly salary and pay sheets.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-xs text-factory-paper focus:outline-none focus:border-factory-amber cursor-pointer"
          />
          <button
            onClick={fetchData}
            className="p-2.5 rounded-lg border border-factory-darkBorder text-factory-muted hover:text-factory-paper hover:bg-factory-darkBorder/40 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow shadow-emerald-600/20 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saveSuccess ? 'Saved Successfully!' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Present Today
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {presentCount} <span className="text-xs font-normal text-factory-muted">/ {employees.length}</span>
          </div>
          <div className="text-xs text-factory-muted mt-1">Working in the factory</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Absent Today
          </div>
          <div className="text-2xl font-bold text-factory-crimson mt-1">
            {absentCount}
          </div>
          <div className="text-xs text-factory-muted mt-1">Unexcused missed shifts</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Late or Half Day
          </div>
          <div className="text-2xl font-bold text-factory-amber mt-1">
            {lateCount}
          </div>
          <div className="text-xs text-factory-muted mt-1">Partial shift recorded</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider">
            Total Overtime
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {totalOvertime.toFixed(1)} <span className="text-xs font-normal text-factory-muted">Hours</span>
          </div>
          <div className="text-xs text-factory-muted mt-1">Extra shift time today</div>
        </div>
      </div>

      {/* Quick Actions & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-factory-muted" />
          <input
            type="text"
            placeholder="Search laborer name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-factory-darkCard border border-factory-darkBorder rounded-lg text-xs text-factory-paper placeholder-factory-muted focus:outline-none focus:border-factory-amber"
          />
        </div>

        <button
          onClick={markAllPresent}
          className="px-3 py-1.5 bg-factory-darkCard border border-factory-darkBorder hover:border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Mark All Present Today
        </button>
      </div>

      {/* Attendance Grid Table */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-factory-dark/60 text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono border-b border-factory-darkBorder">
                <th className="py-3 px-4">Laborer</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Daily Attendance Status</th>
                <th className="py-3 px-4">Overtime (Hours)</th>
                <th className="py-3 px-4 text-right">Saturday Shift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-darkBorder/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-factory-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-factory-amber" />
                    Loading daily attendance...
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const state = attendanceState[emp.id] || {
                    status: 'PRESENT',
                    overtime_hours: '0.00',
                    is_saturday: false
                  };
                  return (
                    <tr key={emp.id} className="hover:bg-factory-darkBorder/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-factory-paper">{emp.name}</div>
                        <div className="font-mono text-[10px] text-factory-amber">{emp.employee_id}</div>
                      </td>
                      <td className="py-3 px-4 text-factory-muted text-[11px]">
                        {emp.work_room || 'Shop Floor'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'] as const).map((st) => {
                            const isSelected = state.status === st;
                            return (
                              <button
                                key={st}
                                onClick={() => handleStatusChange(emp.id, st)}
                                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                                  isSelected
                                    ? st === 'PRESENT'
                                      ? 'bg-emerald-600 text-white shadow'
                                      : st === 'ABSENT'
                                      ? 'bg-factory-crimson text-white shadow'
                                      : 'bg-factory-amber text-factory-dark font-black shadow'
                                    : 'bg-factory-dark border border-factory-darkBorder text-factory-muted hover:text-factory-paper'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="8"
                            value={state.overtime_hours}
                            onChange={(e) => handleOvertimeChange(emp.id, e.target.value)}
                            className="w-16 bg-factory-dark border border-factory-darkBorder rounded px-2 py-1 text-center font-mono text-factory-paper text-xs focus:outline-none focus:border-factory-amber"
                          />
                          <span className="text-[10px] text-factory-muted font-mono">hrs</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-factory-muted">
                          <input
                            type="checkbox"
                            checked={state.is_saturday}
                            onChange={(e) => {
                              setAttendanceState((prev) => ({
                                ...prev,
                                [emp.id]: {
                                  ...prev[emp.id],
                                  is_saturday: e.target.checked
                                }
                              }));
                            }}
                            className="accent-factory-rust rounded"
                          />
                          <span>Saturday</span>
                        </label>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
