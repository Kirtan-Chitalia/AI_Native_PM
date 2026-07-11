'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'
import Skeleton from '@/components/Skeleton'
import AnimatedNumber from '@/components/AnimatedNumber'
import StatusDonutChart, { DonutSlice } from '@/components/StatusDonutChart'
import { useTheme } from '@/hooks/useTheme'
import { STATUS_STYLES, STATUS_LABELS, PRIORITY_DOT } from '@/lib/badges'

// Fixed status tokens — same hues as badges elsewhere, snapped for chart context.
const STATUS_CHART_COLORS: Record<string, { light: string; dark: string }> = {
  todo: { light: '#A8A8A8', dark: '#A8A8A8' },
  in_progress: { light: '#525252', dark: '#D4D4D4' },
  in_review: { light: '#fab219', dark: '#fab219' },
  done: { light: '#0ca30c', dark: '#0ca30c' },
  cancelled: { light: '#d03b3b', dark: '#d03b3b' },
}
const STATUS_ORDER = ['todo', 'in_progress', 'in_review', 'done', 'cancelled']

type ProfileRole = 'admin' | 'project_manager' | 'developer'

interface UserData {
  id: string
  email: string
  verified: boolean
  createdAt: string
  role: string
  profileRole: ProfileRole
  mustChangePassword: boolean
}

interface Project {
  id: string
  name: string
  status: string
  priority: string
  task_count: string
  done_task_count: string
  member_count: string
  created_at: string
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  project_id: string
  project_name: string
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border shadow-sm p-5 transition-all duration-150 hover:-translate-y-0.5 ${
      accent
        ? 'bg-[#E5002B] border-[#cc0025] text-white hover:shadow-[0_4px_16px_rgba(229,0,43,0.3)]'
        : 'bg-white dark:bg-[#1A1A1A] border-[#E5E7EB] dark:border-[#2A2A2A] hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)]'
    }`}>
      <p className={`text-xs mb-1 ${accent ? 'text-white/70' : 'text-[#9CA3AF]'}`}>{label}</p>
      <p className={`text-2xl font-semibold ${accent ? 'text-white' : 'text-[#0A0A0A] dark:text-white'}`}>
        <AnimatedNumber value={value} />
      </p>
    </div>
  )
}

function RoleBanner({ profileRole }: { profileRole: ProfileRole }) {
  const config = {
    admin: {
      bg: 'bg-gradient-to-r from-[#E5002B]/10 to-transparent dark:from-[#E5002B]/20',
      border: 'border-[#E5002B]/30',
      dot: 'bg-[#E5002B]',
      label: 'Administrator',
      sublabel: 'Full organisation access',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E5002B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
    },
    project_manager: {
      bg: 'bg-gradient-to-r from-[#F59E0B]/10 to-transparent dark:from-[#F59E0B]/15',
      border: 'border-[#F59E0B]/30',
      dot: 'bg-[#F59E0B]',
      label: 'Project Manager',
      sublabel: 'Manage your projects and teams',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    developer: {
      bg: 'bg-gradient-to-r from-[#22C55E]/10 to-transparent dark:from-[#22C55E]/15',
      border: 'border-[#22C55E]/30',
      dot: 'bg-[#22C55E]',
      label: 'Developer',
      sublabel: 'Work on tasks across your projects',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      ),
    },
  }
  const c = config[profileRole]
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${c.bg} ${c.border} mb-8`}>
      <div className="shrink-0">{c.icon}</div>
      <div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
          <span className="text-[13px] font-semibold text-[#0A0A0A] dark:text-white">{c.label}</span>
        </div>
        <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">{c.sublabel}</p>
      </div>
    </div>
  )
}

// ─── ADMIN DASHBOARD ────────────────────────────────────────────────────────

function AdminDashboard({
  user, projects, myTasks, memberCount, loading,
  onNewProject,
}: {
  user: UserData; projects: Project[]; myTasks: Task[]; memberCount: number; loading: boolean; onNewProject: () => void
}) {
  const { theme } = useTheme()
  const totalTasks = projects.reduce((s, p) => s + Number(p.task_count), 0)
  const doneTasks = projects.reduce((s, p) => s + Number(p.done_task_count), 0)
  const statusSlices: DonutSlice[] = STATUS_ORDER.map((status) => ({
    key: status,
    label: STATUS_LABELS[status] || status,
    count: myTasks.filter((t) => t.status === status).length,
    color: theme === 'dark' ? STATUS_CHART_COLORS[status].dark : STATUS_CHART_COLORS[status].light,
  }))

  return (
    <>
      <RoleBanner profileRole="admin" />

      {/* Quick actions */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onNewProject}
          className="flex items-center gap-2 px-4 py-2 bg-[#E5002B] hover:bg-[#CC0025] active:scale-[0.98] text-white text-[13px] font-medium rounded-lg transition-all duration-150 shadow-[0_4px_12px_rgba(229,0,43,0.2)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Project
        </button>
        <Link href="/settings/users"
          className="flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] dark:border-[#2A2A2A] text-[#0A0A0A] dark:text-white text-[13px] font-medium rounded-lg hover:border-[#0A0A0A] dark:hover:border-[#525252] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Manage Users
        </Link>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[0,1,2,3].map((i) => <Skeleton key={i} className="h-[86px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Projects" value={projects.length} accent />
          <StatCard label="Org Members" value={memberCount} />
          <StatCard label="Total Tasks" value={totalTasks} />
          <StatCard label="Completed Tasks" value={doneTasks} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* All projects */}
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-sm p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] transition-all duration-150">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#0A0A0A] dark:text-white">All Projects</h2>
            <Link href="/projects" className="text-xs text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white transition-colors">View all</Link>
          </div>
          {loading ? <div className="space-y-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-8" />)}</div>
            : projects.length === 0 ? <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">No projects yet. Create one to get started.</p>
            : (
              <div className="space-y-1">
                {projects.slice(0, 6).map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg border-l-2 border-transparent hover:border-[#E5002B] hover:bg-[#F8F8F8] dark:hover:bg-[#242424] transition-all duration-150">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[p.priority]}`} />
                      <span className="text-[13px] text-[#0A0A0A] dark:text-white truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[11px] text-[#9CA3AF]">{p.member_count} members</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLES[p.status]}`}>
                        {STATUS_LABELS[p.status] || p.status.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </div>

        {/* Task distribution chart */}
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-sm p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] transition-all duration-150">
          <h2 className="text-sm font-semibold text-[#0A0A0A] dark:text-white mb-4">My tasks by status</h2>
          {loading ? <div className="flex items-center gap-6"><Skeleton className="w-[168px] h-[168px] rounded-full shrink-0" /><div className="flex-1 space-y-2">{[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-5" />)}</div></div>
            : myTasks.length === 0 ? <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">No tasks assigned to you yet.</p>
            : <StatusDonutChart slices={statusSlices} />}
        </div>
      </div>

      {!loading && totalTasks > 0 && (
        <p className="text-xs text-[#9CA3AF]">{doneTasks} of {totalTasks} tasks completed across all projects</p>
      )}
    </>
  )
}

// ─── PROJECT MANAGER DASHBOARD ───────────────────────────────────────────────

function ProjectManagerDashboard({
  user, projects, myTasks, memberCount, loading, onNewProject,
}: {
  user: UserData; projects: Project[]; myTasks: Task[]; memberCount: number; loading: boolean; onNewProject: () => void
}) {
  const { theme } = useTheme()
  const openMyTasks = myTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled')
  const completedMyTasks = myTasks.filter((t) => t.status === 'done')
  const statusSlices: DonutSlice[] = STATUS_ORDER.map((status) => ({
    key: status,
    label: STATUS_LABELS[status] || status,
    count: myTasks.filter((t) => t.status === status).length,
    color: theme === 'dark' ? STATUS_CHART_COLORS[status].dark : STATUS_CHART_COLORS[status].light,
  }))

  return (
    <>
      <RoleBanner profileRole="project_manager" />

      <div className="flex items-center justify-between mb-8">
        <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">
          You are managing <span className="font-medium text-[#0A0A0A] dark:text-white">{projects.length}</span> project{projects.length !== 1 ? 's' : ''}
        </p>
        <button onClick={onNewProject}
          className="flex items-center gap-2 px-4 py-2 bg-[#E5002B] hover:bg-[#CC0025] active:scale-[0.98] text-white text-[13px] font-medium rounded-lg transition-all duration-150">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Project
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[0,1,2,3].map((i) => <Skeleton key={i} className="h-[86px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="My Projects" value={projects.length} accent />
          <StatCard label="Team Members" value={memberCount} />
          <StatCard label="My Open Tasks" value={openMyTasks.length} />
          <StatCard label="My Completed" value={completedMyTasks.length} />
        </div>
      )}

      {/* Projects I manage — with progress bars */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-sm p-6 mb-4 hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] transition-all duration-150">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#0A0A0A] dark:text-white">Projects I Manage</h2>
          <Link href="/projects" className="text-xs text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white transition-colors">View all</Link>
        </div>
        {loading ? <div className="space-y-3">{[0,1,2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          : projects.length === 0 ? (
            <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">No projects yet. Create your first one!</p>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 5).map((p) => {
                const total = Number(p.task_count)
                const done = Number(p.done_task_count)
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                return (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="block p-3 rounded-lg border border-transparent hover:border-[#E5E7EB] dark:hover:border-[#2A2A2A] hover:bg-[#F8F8F8] dark:hover:bg-[#1F1F1F] transition-all duration-150">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[p.priority]}`} />
                        <span className="text-[13px] font-medium text-[#0A0A0A] dark:text-white truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-[11px] text-[#9CA3AF]">{p.member_count} members</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLES[p.status]}`}>
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#F3F4F6] dark:bg-[#2A2A2A] rounded-full overflow-hidden">
                        <div className="h-full bg-[#22C55E] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-[#9CA3AF] shrink-0">{done}/{total} tasks</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
      </div>

      {/* My assigned tasks + chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-sm p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] transition-all duration-150">
          <h2 className="text-sm font-semibold text-[#0A0A0A] dark:text-white mb-4">My Assigned Tasks</h2>
          {loading ? <div className="space-y-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-8" />)}</div>
            : myTasks.length === 0 ? <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">No tasks assigned to you yet.</p>
            : (
              <div className="space-y-1">
                {myTasks.slice(0, 5).map((t) => (
                  <Link key={t.id} href={`/projects/${t.project_id}`}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg border-l-2 border-transparent hover:border-[#E5002B] hover:bg-[#F8F8F8] dark:hover:bg-[#242424] transition-all duration-150">
                    <div className="min-w-0">
                      <p className="text-[13px] text-[#0A0A0A] dark:text-white truncate">{t.title}</p>
                      <p className="text-xs text-[#9CA3AF] truncate">{t.project_name}</p>
                    </div>
                    <span className={`shrink-0 ml-2 px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLES[t.status]}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
        </div>

        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-sm p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] transition-all duration-150">
          <h2 className="text-sm font-semibold text-[#0A0A0A] dark:text-white mb-4">My tasks by status</h2>
          {loading ? <div className="flex items-center gap-6"><Skeleton className="w-[168px] h-[168px] rounded-full shrink-0" /><div className="flex-1 space-y-2">{[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-5" />)}</div></div>
            : myTasks.length === 0 ? <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">No tasks assigned to you yet.</p>
            : <StatusDonutChart slices={statusSlices} />}
        </div>
      </div>
    </>
  )
}

// ─── DEVELOPER DASHBOARD ─────────────────────────────────────────────────────

function DeveloperDashboard({
  user, projects, myTasks, loading,
}: {
  user: UserData; projects: Project[]; myTasks: Task[]; loading: boolean
}) {
  const { theme } = useTheme()
  const openTasks = myTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled')
  const completedTasks = myTasks.filter((t) => t.status === 'done')
  const now = new Date()
  const dueSoonTasks = myTasks.filter((t) => {
    if (!t.due_date || t.status === 'done' || t.status === 'cancelled') return false
    const due = new Date(t.due_date)
    const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 3
  })
  const statusSlices: DonutSlice[] = STATUS_ORDER.map((status) => ({
    key: status,
    label: STATUS_LABELS[status] || status,
    count: myTasks.filter((t) => t.status === status).length,
    color: theme === 'dark' ? STATUS_CHART_COLORS[status].dark : STATUS_CHART_COLORS[status].light,
  }))

  return (
    <>
      <RoleBanner profileRole="developer" />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[0,1,2,3].map((i) => <Skeleton key={i} className="h-[86px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active Projects" value={projects.length} accent />
          <StatCard label="My Open Tasks" value={openTasks.length} />
          <StatCard label="My Completed" value={completedTasks.length} />
          <StatCard label="Due in 3 Days" value={dueSoonTasks.length} />
        </div>
      )}

      {/* My tasks — hero section */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-sm p-6 mb-4 hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] transition-all duration-150">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#0A0A0A] dark:text-white">My Assigned Tasks</h2>
            <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">{openTasks.length} open · {completedTasks.length} done</p>
          </div>
        </div>
        {loading ? <div className="space-y-2">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          : myTasks.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[#F3F4F6] dark:bg-[#242424] flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">No tasks assigned to you yet.</p>
              <p className="text-[12px] text-[#9CA3AF] mt-1">Contact your project manager to get started.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {myTasks.map((t) => (
                <Link key={t.id} href={`/projects/${t.project_id}`}
                  className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg border-l-2 border-transparent hover:border-[#22C55E] hover:bg-[#F0FDF4] dark:hover:bg-[#0f2a17] transition-all duration-150">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-[#0A0A0A] dark:text-white truncate">{t.title}</p>
                    <p className="text-xs text-[#9CA3AF] truncate">{t.project_name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {t.due_date && new Date(t.due_date).getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000 && new Date(t.due_date) > now && (
                      <span className="text-[11px] font-medium text-[#F59E0B]">Due soon</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLES[t.status]}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
      </div>

      {/* My projects (secondary) + status chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-sm p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] transition-all duration-150">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#0A0A0A] dark:text-white">My Projects</h2>
            <Link href="/projects" className="text-xs text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white transition-colors">View all</Link>
          </div>
          {loading ? <div className="space-y-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-8" />)}</div>
            : projects.length === 0 ? (
              <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">You haven&apos;t been added to any projects yet.</p>
            ) : (
              <div className="space-y-1">
                {projects.slice(0, 5).map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg border-l-2 border-transparent hover:border-[#22C55E] hover:bg-[#F8F8F8] dark:hover:bg-[#242424] transition-all duration-150">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[p.priority]}`} />
                      <span className="text-[13px] text-[#0A0A0A] dark:text-white truncate">{p.name}</span>
                    </div>
                    <span className={`shrink-0 ml-2 px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLES[p.status]}`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
        </div>

        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-sm p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] transition-all duration-150">
          <h2 className="text-sm font-semibold text-[#0A0A0A] dark:text-white mb-4">My tasks by status</h2>
          {loading ? <div className="flex items-center gap-6"><Skeleton className="w-[168px] h-[168px] rounded-full shrink-0" /><div className="flex-1 space-y-2">{[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-5" />)}</div></div>
            : myTasks.length === 0 ? <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">No tasks yet — nothing to chart.</p>
            : <StatusDonutChart slices={statusSlices} />}
        </div>
      </div>
    </>
  )
}

// ─── ROOT DASHBOARD PAGE ─────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [memberCount, setMemberCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => {
        if (!r.ok) throw new Error('Unauthorized')
        return r.json()
      })
      .then((data) => {
        if (data.user?.mustChangePassword) {
          router.push('/login?mode=change-password')
          return
        }
        setUser(data.user)
      })
      .catch(() => router.push('/login'))
  }, [router])

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/tasks').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ]).then(([projectsData, tasksData, usersData]) => {
      setProjects(projectsData.projects || [])
      setMyTasks(tasksData.tasks || [])
      setMemberCount(usersData.count || 0)
    }).finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleCreate = async () => {
    setError('')
    if (!name.trim()) { setError('Project name is required'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, priority }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      toast.success('Project created')
      router.push(`/projects/${data.project.id}`)
    } catch { setError('Network error. Please try again.'); toast.error('Failed to create project') }
    finally { setCreating(false) }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] dark:bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-full max-w-md px-6 space-y-3">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-24" />
        </div>
      </div>
    )
  }

  const profileRole: ProfileRole = user.profileRole ?? (user.role === 'admin' ? 'admin' : 'developer')

  const dashboardContent = () => {
    if (profileRole === 'admin') {
      return (
        <AdminDashboard
          user={user} projects={projects} myTasks={myTasks}
          memberCount={memberCount} loading={loading}
          onNewProject={() => setShowModal(true)}
        />
      )
    }
    if (profileRole === 'project_manager') {
      return (
        <ProjectManagerDashboard
          user={user} projects={projects} myTasks={myTasks}
          memberCount={memberCount} loading={loading}
          onNewProject={() => setShowModal(true)}
        />
      )
    }
    return (
      <DeveloperDashboard
        user={user} projects={projects} myTasks={myTasks} loading={loading}
      />
    )
  }

  return (
    <AppShell active="dashboard" pageTitle="Dashboard" email={user.email} onLogout={handleLogout}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {dashboardContent()}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-sm p-6 w-full max-w-md">
            <h2 className="text-base font-semibold text-[#0A0A0A] dark:text-white mb-4">New Project</h2>
            {error && (
              <div className="mb-4 px-4 py-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg">
                <p className="text-[#b91c1c] text-[13px]">{error}</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#0A0A0A] dark:text-white mb-1.5">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mobile App Revamp"
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg text-[#0A0A0A] dark:text-white placeholder-[#9CA3AF] text-[13px] focus:outline-none focus:border-[#E5002B] transition-colors" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0A0A0A] dark:text-white mb-1.5">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  placeholder="What is this project about?"
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg text-[#0A0A0A] dark:text-white placeholder-[#9CA3AF] text-[13px] focus:outline-none focus:border-[#E5002B] transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0A0A0A] dark:text-white mb-1.5">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg text-[#0A0A0A] dark:text-white text-[13px] hover:border-[#0A0A0A] dark:hover:border-[#525252] focus:outline-none focus:border-[#E5002B] transition-colors">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowModal(false); setError('') }}
                className="flex-1 py-2.5 border border-[#E5E7EB] dark:border-[#2A2A2A] text-[#0A0A0A] dark:text-white text-[13px] font-medium rounded-lg hover:border-[#0A0A0A] dark:hover:border-[#525252] transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating}
                className="flex-1 py-2.5 bg-[#E5002B] hover:bg-[#CC0025] active:scale-[0.98] disabled:opacity-50 text-white text-[13px] font-medium rounded-lg transition-all duration-150">
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
