-- 010: Tenant-aware CMS tables for dataroom content

-- Deals table for multi-company / multi-dataroom tenancy
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Content sections per deal (e.g. opening-letter, deal-memo)
CREATE TABLE public.content_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id, slug)
);

-- Content blocks within each section (rich text, FAQ JSON, structured tables/lists)
CREATE TABLE public.content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.content_sections(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  type TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '""'::jsonb,
  display_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(section_id, key)
);

-- Admin-visible content changelog
CREATE TABLE public.content_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  block_id UUID REFERENCES public.content_blocks(id) ON DELETE SET NULL,
  section_slug TEXT NOT NULL,
  section_title TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  previous_content JSONB,
  new_content JSONB,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_sections_deal_order ON public.content_sections(deal_id, display_order);
CREATE INDEX idx_content_blocks_deal_section ON public.content_blocks(deal_id, section_id);
CREATE INDEX idx_changelog_deal_time ON public.content_changelog(deal_id, changed_at DESC);
CREATE INDEX idx_changelog_deal_section_time ON public.content_changelog(deal_id, section_slug, changed_at DESC);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_changelog ENABLE ROW LEVEL SECURITY;

-- Keep access pattern consistent with existing private admin tables.
CREATE POLICY "Deny anon access" ON public.deals
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON public.deals
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon access" ON public.content_sections
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON public.content_sections
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon access" ON public.content_blocks
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON public.content_blocks
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon access" ON public.content_changelog
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON public.content_changelog
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

