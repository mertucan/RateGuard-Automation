create table if not exists public.internal_chat_conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null references public.companies(id) on delete cascade,
  title text null,
  is_group boolean not null default false,
  created_by_user_id uuid null references public.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.internal_chat_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.internal_chat_conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamp with time zone not null default now(),
  last_read_at timestamp with time zone null,
  unique (conversation_id, user_id)
);

create table if not exists public.internal_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.internal_chat_conversations(id) on delete cascade,
  sender_user_id uuid null references public.users(id) on delete set null,
  message_text text not null,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_internal_chat_conversations_company_id
  on public.internal_chat_conversations(company_id, updated_at desc);

create index if not exists idx_internal_chat_participants_user_id
  on public.internal_chat_participants(user_id);

create index if not exists idx_internal_chat_participants_conversation_id
  on public.internal_chat_participants(conversation_id);

create index if not exists idx_internal_chat_messages_conversation_id
  on public.internal_chat_messages(conversation_id, created_at asc);
