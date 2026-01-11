-- ===========================================
-- Arc Planner - Example Database Schema
-- ===========================================
-- This is an example schema to demonstrate the features of Arc Planner.
-- Replace this with your own database schema files (.sql)
--
-- Supported features:
-- - CREATE TABLE statements
-- - PRIMARY KEY constraints
-- - FOREIGN KEY relationships
-- - Row Level Security (RLS) policies
-- - CHECK constraints
-- - DEFAULT values
-- - UNIQUE constraints

-- ===========================================
-- Users Table (Core)
-- ===========================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ===========================================
-- Organizations Table (Multi-tenancy)
-- ===========================================
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- Organization Members (Junction Table)
-- ===========================================
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Members can view their organization memberships
CREATE POLICY "Members can view org memberships" ON public.organization_members
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- ===========================================
-- Projects Table
-- ===========================================
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Organization members can view projects
CREATE POLICY "Org members can view projects" ON public.projects
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = projects.organization_id
            AND user_id = auth.uid()
        )
    );

-- ===========================================
-- Tasks Table
-- ===========================================
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
    priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 4),
    assigned_to UUID REFERENCES public.users(id),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Project members can manage tasks
CREATE POLICY "Project members can manage tasks" ON public.tasks
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE p.id = tasks.project_id
            AND om.user_id = auth.uid()
        )
    );

-- ===========================================
-- Comments Table
-- ===========================================
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Task viewers can read comments
CREATE POLICY "Task viewers can read comments" ON public.comments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.projects p ON p.id = t.project_id
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE t.id = comments.task_id
            AND om.user_id = auth.uid()
        )
    );

-- Users can create comments on accessible tasks
CREATE POLICY "Users can create comments" ON public.comments
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.projects p ON p.id = t.project_id
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE t.id = task_id
            AND om.user_id = auth.uid()
        )
    );

-- ===========================================
-- Audit Log Table (No RLS - Admin only)
-- ===========================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- Indexes for Performance
-- ===========================================
CREATE INDEX idx_organization_members_user ON public.organization_members(user_id);
CREATE INDEX idx_organization_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_projects_org ON public.projects(organization_id);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_comments_task ON public.comments(task_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
