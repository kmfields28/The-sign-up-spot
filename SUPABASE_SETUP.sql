-- Run this in your Supabase SQL Editor to set up the database

create table activities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  address text,
  phone text,
  website text,
  rating numeric(3,1) default 0,
  review_count integer default 0,
  price text,
  description text,
  hours text,
  age_range text,
  tags text[],
  activity_type text default 'recreational',
  featured boolean default false,
  featured_tier text,
  created_at timestamp default now()
);

create table reviews (
  id uuid default gen_random_uuid() primary key,
  activity_id uuid references activities(id) on delete cascade,
  author text not null,
  rating integer not null check (rating between 1 and 5),
  text text not null,
  created_at timestamp default now()
);

-- Allow public read access
alter table activities enable row level security;
alter table reviews enable row level security;

create policy "Public read activities" on activities for select using (true);
create policy "Public read reviews" on reviews for select using (true);
create policy "Public insert reviews" on reviews for insert with check (true);

-- Allow admins to insert/update activities
create policy "Admin manage activities" on activities for all using (true);
