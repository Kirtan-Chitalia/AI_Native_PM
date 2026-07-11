'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'
import Skeleton from '@/components/Skeleton'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileRole = 'admin' | 'project_manager' | 'developer'

interface Member {
  user_id: string
  email: string
  display_name: string
  role: 'project_manager' | 'developer'
  joined_at: string
}

interface ProjectWithMembers {
  id: string
  name: string
  status: string
  priority: string
  members: Member[]
  membersLoaded: boolean
}

interface OrgUser {
  id: string
  email: string
  display_name: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  project_manager: {
    label: 'Project Manager',
    cls: 'bg-[#FEFCE8] dark:bg-[#2a1f00] text-[#b45309] dark:text-[#fbbf24] border-[#fde68a] dark:border-[#92400e]',
    dot: 'bg-[#F59E0B]',
  },
  developer: {
    label: 'Developer',
    cls: 'bg-[#F0FDF4] dark:bg-[#0f2a17] text-[#15803D] dark:text-[#4ade80] border-[#bbf7d0] dark:border-[#166534]',
    dot: 'bg-[#22C55E]',
  },
  admin: {
    label: 'Admin',
    cls: 'bg-[#FEF2F2] dark:bg-[#2a1010] text-[#E5002B] dark:text-[#f87171] border-[#fecaca] dark:border-[#991b1b]',
    dot: 'bg-[#E5002B]',
  },
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_BADGE[role] ?? ROLE_BADGE.developer
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  const colors = [
    'bg-[#E5002B]', 'bg-[#7C3AED]', 'bg-[#0EA5E9]',
    'bg-[#10B981]', 'bg-[#F59E0B]', 'bg-[#EC4899]',
  ]
  const color = colors[(name.charCodeAt(0) || 0) % colors.length]
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} text-white text-xs font-medium flex items-center justify-center shrink-0`}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

// ─── Add Member inline form ───────────────────────────────────────────────────

function AddMemberForm({
  projectId,
  orgUsers,
  existingMemberIds,
  onAdded,
  onCancel,
}: {
  projectId: string
  orgUsers: OrgUser[]
  existingMemberIds: Set<string>
  onAdded: (member: Member) => void
  onCancel: () => void
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'project_manager' | 'developer'>('developer')
  const [busy, setBusy] = useState(false)
  const [suggestions, setSuggestions] = useState<OrgUser[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleEmailChange = (val: string) => {
    setEmail(val)
    if (val.length >= 1) {
      const matches = orgUsers.filter(
        (u) =>
          !existingMemberIds.has(u.id) &&
          (u.email.toLowerCase().includes(val.toLowerCase()) ||
            u.display_name.toLowerCase().includes(val.toLowerCase()))
      )
      setSuggestions(matches.slice(0, 6))
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  const selectUser = (u: OrgUser) => {
    setEmail(u.email)
    setShowSuggestions(false)
  }

  const handleAdd = async () => {
    if (!email.trim()) { toast.error('Email is required'); return }
    setBusy(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      // Find user info from orgUsers
      const found = orgUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
      onAdded({
        user_id: data.member.user_id,
        email: email.trim().toLowerCase(),
        display_name: found?.display_name ?? email.split('@')[0],
        role,
        joined_at: new Date().toISOString(),
      })
      toast.success('Member added')
      setEmail('')
    } catch { toast.error('Network error') }
    finally { setBusy(false) }
  }

  return (
    <div className="mt-4 pt-4 border-t border-[#F3F4F6] dark:border-[#2A2A2A]">
      <p className="text-[12px] font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-2">Add member</p>
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            onFocus={() => email && setShowSuggestions(suggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Search by email or name..."
            className="w-full px-3 py-2 bg-white dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg text-[#0A0A0A] dark:text-white placeholder-[#9CA3AF] text-[13px] focus:outline-none focus:border-[#E5002B] transition-colors"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg shadow-lg z-20 overflow-hidden">
              {suggestions.map((u) => (
                <button
                  key={u.id}
                  onMouseDown={() => selectUser(u)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#F8F8F8] dark:hover:bg-[#242424] transition-colors text-left"
                >
                  <Avatar name={u.display_name || u.email} size={7} />
                  <div className="min-w-0">
                    <p className="text-[13px] text-[#0A0A0A] dark:text-white truncate">{u.display_name}</p>
                    <p className="text-[11px] text-[#9CA3AF] truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'project_manager' | 'developer')}
          className="px-3 py-2 bg-white dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg text-[#0A0A0A] dark:text-white text-[13px] focus:outline-none focus:border-[#E5002B] transition-colors"
        >
          <option value="developer">Developer</option>
          <option value="project_manager">Project Manager</option>
        </select>

        <button
          onClick={handleAdd}
          disabled={busy}
          className="px-4 py-2 bg-[#E5002B] hover:bg-[#CC0025] active:scale-[0.98] disabled:opacity-50 text-white text-[13px] font-medium rounded-lg transition-all duration-150"
        >
          {busy ? 'Adding...' : 'Add'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-[#E5E7EB] dark:border-[#2A2A2A] text-[#6B7280] dark:text-[#9CA3AF] text-[13px] font-medium rounded-lg hover:border-[#0A0A0A] dark:hover:border-[#525252] hover:text-[#0A0A0A] dark:hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  currentUserId,
  canManage,  // true if admin or PM of this project
  orgUsers,
  onMembersChange,
}: {
  project: ProjectWithMembers
  currentUserId: string
  canManage: boolean
  orgUsers: OrgUser[]
  onMembersChange: (projectId: string, members: Member[]) => void
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [changingRole, setChangingRole] = useState<string | null>(null) // user_id being changed
  const [removingId, setRemovingId] = useState<string | null>(null)

  const existingMemberIds = new Set(project.members.map((m) => m.user_id))

  const handleRoleChange = async (member: Member, newRole: 'project_manager' | 'developer') => {
    if (newRole === member.role) return
    setChangingRole(member.user_id)
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: member.email, role: newRole }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return }
      const updated = project.members.map((m) =>
        m.user_id === member.user_id ? { ...m, role: newRole } : m
      )
      onMembersChange(project.id, updated)
      toast.success('Role updated')
    } catch { toast.error('Network error') }
    finally { setChangingRole(null) }
  }

  const handleRemove = async (member: Member) => {
    if (!confirm(`Remove ${member.display_name || member.email} from "${project.name}"?`)) return
    setRemovingId(member.user_id)
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.user_id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      onMembersChange(project.id, project.members.filter((m) => m.user_id !== member.user_id))
      toast.success('Member removed')
    } catch { toast.error('Network error') }
    finally { setRemovingId(null) }
  }

  const handleMemberAdded = (member: Member) => {
    onMembersChange(project.id, [...project.members, member])
    setShowAddForm(false)
  }

  return (
    <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-sm overflow-hidden">
      {/* Project header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F3F4F6] dark:border-[#2A2A2A]">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#0A0A0A] dark:text-white truncate">{project.name}</h3>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">
            {project.members.length} {project.members.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        {canManage && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white border border-[#E5E7EB] dark:border-[#2A2A2A] hover:border-[#0A0A0A] dark:hover:border-[#525252] rounded-lg transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add member
          </button>
        )}
      </div>

      {/* Members list */}
      <div className="divide-y divide-[#F9F9F9] dark:divide-[#222]">
        {!project.membersLoaded ? (
          <div className="p-5 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : project.members.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">No members yet</p>
          </div>
        ) : (
          project.members.map((member) => {
            const isCurrentUser = member.user_id === currentUserId
            const isChanging = changingRole === member.user_id
            const isRemoving = removingId === member.user_id

            return (
              <div
                key={member.user_id}
                className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                  isCurrentUser ? 'bg-[#F8F8F8] dark:bg-[#1F1F1F]' : 'hover:bg-[#FAFAFA] dark:hover:bg-[#1E1E1E]'
                }`}
              >
                {/* Avatar */}
                <Avatar name={member.display_name || member.email} size={9} />

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-[#0A0A0A] dark:text-white truncate">
                      {member.display_name || member.email.split('@')[0]}
                    </p>
                    {isCurrentUser && (
                      <span className="text-[10px] font-medium text-[#9CA3AF] bg-[#F3F4F6] dark:bg-[#2A2A2A] px-1.5 py-0.5 rounded-full">you</span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#9CA3AF] truncate">{member.email}</p>
                </div>

                {/* Role — editable for PM/Admin, read-only for developer */}
                <div className="shrink-0">
                  {canManage ? (
                    <select
                      value={member.role}
                      disabled={isChanging || isRemoving}
                      onChange={(e) => handleRoleChange(member, e.target.value as 'project_manager' | 'developer')}
                      className="text-[11px] font-medium px-2 py-1 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A2A] bg-white dark:bg-[#141414] text-[#0A0A0A] dark:text-white focus:outline-none focus:border-[#E5002B] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <option value="developer">Developer</option>
                      <option value="project_manager">Project Manager</option>
                    </select>
                  ) : (
                    <RoleBadge role={member.role} />
                  )}
                </div>

                {/* Remove button — PM/Admin only, can't remove yourself if last PM */}
                {canManage && (
                  <button
                    onClick={() => handleRemove(member)}
                    disabled={isRemoving || isChanging}
                    title={`Remove ${member.display_name || member.email}`}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#E5002B] hover:bg-[#FEF2F2] dark:hover:bg-[#2a1010] transition-colors disabled:opacity-40"
                  >
                    {isRemoving ? (
                      <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                      </svg>
                    )}
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add member form */}
      {showAddForm && (
        <div className="px-5 pb-5">
          <AddMemberForm
            projectId={project.id}
            orgUsers={orgUsers}
            existingMemberIds={existingMemberIds}
            onAdded={handleMemberAdded}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [profileRole, setProfileRole] = useState<ProfileRole>('developer')
  const [orgRole, setOrgRole] = useState<'admin' | 'user'>('user')
  const [projects, setProjects] = useState<ProjectWithMembers[]>([])
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)

  const loadTeamData = useCallback(async (userId: string, role: string) => {
    try {
      const [projectsRes, usersRes] = await Promise.all([
        fetch('/api/projects').then((r) => r.json()),
        fetch('/api/users').then((r) => r.json()),
      ])

      const rawProjects: { id: string; name: string; status: string; priority: string }[] =
        projectsRes.projects || []
      setOrgUsers(usersRes.users || [])

      // Initialise with empty members, then load them in parallel
      const initialProjects: ProjectWithMembers[] = rawProjects.map((p) => ({
        ...p,
        members: [],
        membersLoaded: false,
      }))
      setProjects(initialProjects)
      setLoading(false)

      // Load members for all projects in parallel
      await Promise.all(
        rawProjects.map(async (p) => {
          try {
            const res = await fetch(`/api/projects/${p.id}/members`)
            const data = await res.json()
            if (res.ok) {
              setProjects((prev) =>
                prev.map((pp) =>
                  pp.id === p.id
                    ? { ...pp, members: data.members || [], membersLoaded: true }
                    : pp
                )
              )
            }
          } catch {
            setProjects((prev) =>
              prev.map((pp) => (pp.id === p.id ? { ...pp, membersLoaded: true } : pp))
            )
          }
        })
      )
    } catch {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        setEmail(data.user.email)
        setCurrentUserId(data.user.id)
        setProfileRole(data.user.profileRole ?? (data.user.role === 'admin' ? 'admin' : 'developer'))
        setOrgRole(data.user.role)
        loadTeamData(data.user.id, data.user.role)
      })
      .catch(() => router.push('/login'))
  }, [router, loadTeamData])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleMembersChange = (projectId: string, members: Member[]) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, members } : p))
    )
  }

  // Determine if user can manage a given project
  const canManageProject = (project: ProjectWithMembers): boolean => {
    if (orgRole === 'admin') return true
    if (profileRole === 'project_manager') {
      return project.members.some(
        (m) => m.user_id === currentUserId && m.role === 'project_manager'
      )
    }
    return false
  }

  const roleBannerConfig = {
    admin: {
      icon: '🔴',
      label: 'Administrator',
      sub: 'Full access — manage all projects and members',
      border: 'border-[#E5002B]/30',
      bg: 'bg-gradient-to-r from-[#E5002B]/10 to-transparent dark:from-[#E5002B]/20',
    },
    project_manager: {
      icon: '🟡',
      label: 'Project Manager',
      sub: 'Manage members across your projects',
      border: 'border-[#F59E0B]/30',
      bg: 'bg-gradient-to-r from-[#F59E0B]/10 to-transparent dark:from-[#F59E0B]/15',
    },
    developer: {
      icon: '🟢',
      label: 'Developer',
      sub: 'View your projects and teammates',
      border: 'border-[#22C55E]/30',
      bg: 'bg-gradient-to-r from-[#22C55E]/10 to-transparent dark:from-[#22C55E]/15',
    },
  }
  const bannerCfg = roleBannerConfig[profileRole]

  return (
    <AppShell active="team" pageTitle="Team" email={email} onLogout={handleLogout}>
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#0A0A0A] dark:text-white">Team</h1>
            <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
              {loading
                ? 'Loading...'
                : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Role banner */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bannerCfg.bg} ${bannerCfg.border} mb-8`}>
          <span className="text-lg">{bannerCfg.icon}</span>
          <div>
            <p className="text-[13px] font-semibold text-[#0A0A0A] dark:text-white">{bannerCfg.label}</p>
            <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">{bannerCfg.sub}</p>
          </div>
        </div>

        {/* Project cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl p-5 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                {[0, 1, 2].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F3F4F6] dark:bg-[#242424] flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p className="text-[13px] font-medium text-[#0A0A0A] dark:text-white mb-1">No projects yet</p>
            <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">
              {profileRole === 'developer'
                ? 'You haven\'t been added to any projects yet. Contact your project manager.'
                : 'Create a project to start building your team.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                currentUserId={currentUserId}
                canManage={canManageProject(project)}
                orgUsers={orgUsers}
                onMembersChange={handleMembersChange}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
