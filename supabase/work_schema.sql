-- =====================================================================
-- MỤC "CÔNG VIỆC": Linh kiện · Mật khẩu máy · Lịch năm
-- Cách chạy: Supabase → SQL Editor → New query → dán TOÀN BỘ file này → Run.
-- Chạy SAU file schema.sql. Chạy lại nhiều lần vẫn an toàn, KHÔNG xóa dữ liệu.
--
-- Điểm khác bản cũ:
--  * Linh kiện dùng BẢNG MỚI tên wk_parts (bảng cũ "components" nếu có vẫn giữ nguyên, web không còn dùng).
--  * Với cả 3 bảng, file này gỡ mọi quy tắc bảo mật cũ/lệch rồi tạo lại đúng một quy tắc:
--    "mỗi người chỉ đọc / thêm / sửa / xóa dữ liệu của chính mình".
-- =====================================================================

-- 1) Linh kiện (bảng mới) ---------------------------------------------------
create table if not exists public.wk_parts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  grp            text not null default 'Khác' check (char_length(grp) <= 80),            -- nhóm: Diode, BJT, MOSFET…
  name           text not null check (char_length(name) between 1 and 200),              -- tên linh kiện
  code           text not null default '' check (char_length(code) <= 200),              -- mã linh kiện
  images         jsonb not null default '[]',                                           -- [{p:"ảnh lớn", t:"ảnh nhỏ"}]
  datasheet_path text not null default '',                                              -- file datasheet đã tải lên
  datasheet_name text not null default '',
  datasheet_url  text not null default '' check (char_length(datasheet_url) <= 1000),   -- hoặc link datasheet
  function_text  text not null default '' check (char_length(function_text) <= 20000),  -- chức năng
  repair_text    text not null default '' check (char_length(repair_text) <= 40000),    -- ghi chú cách sửa
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists wk_parts_user_idx on public.wk_parts (user_id, name);

-- 2) Mật khẩu máy (giữ nguyên dữ liệu nếu đã có) ------------------------------------
create table if not exists public.machine_passwords (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 200),
  passwords  jsonb not null default '[]',                                               -- [{l:"nhãn (không bắt buộc)", v:"mật khẩu"}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists machine_passwords_user_idx on public.machine_passwords (user_id, name);

-- 3) Lịch năm (giữ nguyên dữ liệu nếu đã có) ---------------------------------------
create table if not exists public.cal_days (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day        date not null,
  mark       text not null default '' check (mark in ('', 'red', 'blue', 'green', 'amber', 'purple')),
  note       text not null default '' check (char_length(note) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- 4) Bảo đảm cột user_id tự điền tài khoản đang đăng nhập và đủ cột (phòng bảng tạo từ phiên bản cũ) ----
alter table public.wk_parts          alter column user_id set default auth.uid();
alter table public.machine_passwords alter column user_id set default auth.uid();
alter table public.cal_days          alter column user_id set default auth.uid();

alter table public.machine_passwords add column if not exists passwords  jsonb       not null default '[]';
alter table public.machine_passwords add column if not exists created_at timestamptz not null default now();
alter table public.machine_passwords add column if not exists updated_at timestamptz not null default now();
alter table public.cal_days          add column if not exists mark       text        not null default '';
alter table public.cal_days          add column if not exists note       text        not null default '';
alter table public.cal_days          add column if not exists updated_at timestamptz not null default now();

-- 5) Bảo mật theo dòng: gỡ MỌI quy tắc hiện có trên 3 bảng rồi tạo lại đúng một quy tắc ---------------
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('wk_parts', 'machine_passwords', 'cal_days')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.wk_parts          enable row level security;
alter table public.machine_passwords enable row level security;
alter table public.cal_days          enable row level security;

create policy "wk_parts: chủ sở hữu"          on public.wk_parts          for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "machine_passwords: chủ sở hữu" on public.machine_passwords for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "cal_days: chủ sở hữu"          on public.cal_days          for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.wk_parts, public.machine_passwords, public.cal_days from anon;
grant select, insert, update, delete on public.wk_parts, public.machine_passwords, public.cal_days to authenticated;

-- 6) Kho chứa ảnh linh kiện và file datasheet: bucket riêng tư "work-files" (mỗi người một thư mục theo user id, tối đa 50 MB/file) --
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

-- 7) Báo cho Supabase đọc lại cấu trúc bảng ngay -----------------------------------
notify pgrst, 'reload schema';

-- (Tùy chọn, KHÔNG tự chạy) Dọn các bảng của những phiên bản cũ nếu bạn không cần dữ liệu trong đó:
--   drop table if exists public.components;
--   drop table if exists public.tech_notes, public.vault_items, public.vault_meta, public.documents, public.calendar_notes;
--   drop function if exists public.vault_rekey(jsonb, jsonb);

-- 8) Kết quả: phải thấy 3 dòng (mỗi bảng một quy tắc, ap_dung_cho = ALL) ---------------------
select tablename as bang, policyname as quy_tac, cmd as ap_dung_cho
from pg_policies
where schemaname = 'public' and tablename in ('wk_parts', 'machine_passwords', 'cal_days')
order by tablename;
