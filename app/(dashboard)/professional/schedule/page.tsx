"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "@/hooks/useToast";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface ScheduleSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface Leave {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}

const DEFAULT_SCHEDULE: ScheduleSlot[] = DAYS.map((_, i) => ({
  dayOfWeek: i,
  startTime: "09:00",
  endTime: "18:00",
  isAvailable: i !== 0, // Sunday off by default
}));

export default function ProfessionalSchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleSlot[]>(DEFAULT_SCHEDULE);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Leave form
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [addingLeave, setAddingLeave] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/professional/schedule", { credentials: "include" });
    const data = await res.json();
    if (res.ok) {
      const fetched: ScheduleSlot[] = data.data.schedule;
      // Merge with defaults for missing days
      const merged = DEFAULT_SCHEDULE.map((def) => {
        const found = fetched.find((s) => s.dayOfWeek === def.dayOfWeek);
        return found ?? def;
      });
      setSchedule(merged);
      setLeaves(data.data.leaves ?? []);
      setIsAvailable(data.data.isAvailable ?? true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggleDay = (dayOfWeek: number) => {
    setSchedule((prev) =>
      prev.map((s) => s.dayOfWeek === dayOfWeek ? { ...s, isAvailable: !s.isAvailable } : s)
    );
  };

  const handleTimeChange = (dayOfWeek: number, field: "startTime" | "endTime", value: string) => {
    setSchedule((prev) =>
      prev.map((s) => s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s)
    );
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/professional/schedule", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ variant: "success", title: "Schedule saved" });
    } catch {
      toast({ variant: "destructive", title: "Failed to save schedule" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    try {
      await fetch("/api/professional/schedule", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: next }),
      });
      toast({ variant: "success", title: next ? "You're now available" : "You're now unavailable" });
    } catch {
      setIsAvailable(!next);
      toast({ variant: "destructive", title: "Failed to update availability" });
    }
  };

  const handleAddLeave = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate) {
      toast({ variant: "destructive", title: "Start and end date required" });
      return;
    }
    setAddingLeave(true);
    try {
      const res = await fetch("/api/professional/schedule", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leaveForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setLeaves((prev) => [...prev, data.data]);
      setLeaveForm({ startDate: "", endDate: "", reason: "" });
      setShowLeaveForm(false);
      toast({ variant: "success", title: "Off dates added" });
    } catch (err) {
      toast({ variant: "destructive", title: (err as Error).message });
    } finally {
      setAddingLeave(false);
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    try {
      const res = await fetch(`/api/professional/schedule?leaveId=${leaveId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      setLeaves((prev) => prev.filter((l) => l.id !== leaveId));
      toast({ variant: "success", title: "Off dates removed" });
    } catch {
      toast({ variant: "destructive", title: "Failed to remove" });
    }
  };

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-200 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Schedule</h1>
        <p className="text-muted-foreground">Set your weekly availability and off dates</p>
      </div>

      {/* Availability Toggle */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${isAvailable ? "bg-green-500" : "bg-gray-400"}`} />
              <div>
                <p className="font-medium">Currently {isAvailable ? "Available" : "Unavailable"} for new jobs</p>
                <p className="text-sm text-muted-foreground">Toggle to pause or resume booking requests</p>
              </div>
            </div>
            <button onClick={handleToggleAvailability} className="text-brand-600">
              {isAvailable
                ? <ToggleRight className="h-8 w-8 text-brand-600" />
                : <ToggleLeft className="h-8 w-8 text-gray-400" />
              }
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Weekly Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {schedule.map((slot) => (
            <div key={slot.dayOfWeek} className="flex items-center gap-3 rounded-xl border p-3">
              <button
                onClick={() => handleToggleDay(slot.dayOfWeek)}
                className="flex items-center gap-2 w-28 shrink-0"
              >
                <div className={`w-2 h-2 rounded-full ${slot.isAvailable ? "bg-green-500" : "bg-gray-300"}`} />
                <span className={`text-sm font-medium ${slot.isAvailable ? "" : "text-muted-foreground"}`}>
                  {DAYS[slot.dayOfWeek]}
                </span>
              </button>

              {slot.isAvailable ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => handleTimeChange(slot.dayOfWeek, "startTime", e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => handleTimeChange(slot.dayOfWeek, "endTime", e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground flex-1">Day off</span>
              )}

              <Badge variant={slot.isAvailable ? "success" : "secondary"} className="shrink-0">
                {slot.isAvailable ? "Open" : "Off"}
              </Badge>
            </div>
          ))}

          <Button onClick={handleSaveSchedule} loading={saving} className="w-full mt-2">
            Save Weekly Schedule
          </Button>
        </CardContent>
      </Card>

      {/* Off Dates / Leave */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Off Dates
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowLeaveForm((v) => !v)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showLeaveForm && (
            <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">End Date</label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Reason (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Festival, Vacation"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddLeave} loading={addingLeave} className="flex-1">
                  Save Off Dates
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowLeaveForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {leaves.length === 0 && !showLeaveForm ? (
            <p className="text-sm text-muted-foreground text-center py-4">No off dates scheduled</p>
          ) : (
            leaves.map((leave) => (
              <div key={leave.id} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <p className="text-sm font-medium">
                    {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                  </p>
                  {leave.reason && <p className="text-xs text-muted-foreground">{leave.reason}</p>}
                </div>
                <button
                  onClick={() => handleDeleteLeave(leave.id)}
                  className="text-red-400 hover:text-red-600 transition-colors p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
