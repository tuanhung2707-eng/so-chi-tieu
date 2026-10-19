-- =====================================================================
-- MỤC "CÔNG VIỆC" – bản đơn giản: Linh kiện · Mật khẩu máy · Lịch năm
-- Chạy SAU file schema.sql: Supabase → SQL Editor → New query → dán toàn bộ file này → Run.
-- Chạy lại nhiều lần vẫn an toàn (không mất dữ liệu).
-- =====================================================================

-- 1) Linh kiện ----------------------------------------------------------------
create table if not exists public.components (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  grp            text not null default 'Khác' check (char_length(grp) <= 80),          -- nhóm: Diode, BJT, MOSFET…
  name           text not null check (char_length(name) between 1 and 200),            -- tên linh kiện
  code           text not null default '' check (char_length(code) <= 200),            -- mã / ký hiệu
  images         jsonb not null default '[]',                                         -- [{p:"ảnh lớn", t:"ảnh nhỏ"}]
  datasheet_path text not null default '',                                            -- file datasheet đã tải lên (nếu có)
  datasheet_name text not null default '',
  datasheet_url  text not null default '' check (char_length(datasheet_url) <= 1000), -- hoặc đường link datasheet
  function_text  text not null default '' check (char_length(function_text) <= 20000), -- chức năng
  repair_text    text not null default '' check (char_length(repair_text) <= 40000),   -- ghi chú cách sửa
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists components_user_idx on public.components (user_id, name);

-- 2) Mật khẩu máy: mỗi máy có nhiều mật khẩu (không mã hóa, chỉ cần đăng nhập mới xem được) -------------
create table if not exists public.machine_passwords (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 200),               -- tên / loại máy
  passwords  jsonb not null default '[]',                                             -- [{l:"nhãn (không bắt buộc)", v:"mật khẩu"}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists machine_passwords_user_idx on public.machine_passwords (user_id, name);

-- 3) Lịch năm: mỗi ngày một dòng (màu đánh dấu + ghi chú) --------------------------------
create table if not exists public.cal_days (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day        date not null,
  mark       text not null default '' check (mark in ('', 'red', 'blue', 'green', 'amber', 'purple')),
  note       text not null default '' check (char_length(note) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- 4) Bảo mật: mỗi người chỉ thấy dữ liệu của chính mình (RLS) ---------------------------------
alter table public.components        enable row level security;
alter table public.machine_passwords enable row level security;
alter table public.cal_days          enable row level security;

drop policy if exists "components: chủ sở hữu"        on public.components;
drop policy if exists "machine_passwords: chủ sở hữu" on public.machine_passwords;
drop policy if exists "cal_days: chủ sở hữu"          on public.cal_days;

create policy "components: chủ sở hữu"        on public.components        for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "machine_passwords: chủ sở hữu" on public.machine_passwords for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "cal_days: chủ sở hữu"          on public.cal_days          for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.components, public.machine_passwords, public.cal_days from anon;
grant select, insert, update, delete on public.components, public.machine_passwords, public.cal_days to authenticated;

-- 5) Kho chứa ảnh linh kiện và file datasheet: bucket riêng tư "work-files" ---------------------
--    (mỗi người một thư mục theo user id; file tối đa 50 MB)
insert into storage.buckets (id, name, public, file_size_limit)
values ('work-files', 'work-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "work-files: xem file của mình"        on storage.objects;
drop policy if exists "work-files: tải lên thư mục của mình" on storage.objects;
drop policy if exists "work-files: sửa file của mình"        on storage.objects;
drop policy if exists "work-files: xóa file của mình"        on storage.objects;

create policy "work-files: xem file của mình" on storage.objects for select to authenticated
  using (bucket_id = 'work-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "work-files: tải lên thư mục của mình" on storage.objects for insert to authenticated
  with check (bucket_id = 'work-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "work-files: sửa file của mình" on storage.objects for update to authenticated
  using (bucket_id = 'work-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "work-files: xóa file của mình" on storage.objects for delete to authenticated
  using (bucket_id = 'work-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
