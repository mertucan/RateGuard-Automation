alter table contracts
  add column if not exists inflation_data_source text not null default 'tcmb_evds',
  add column if not exists inflation_source_name text not null default 'TCMB EVDS',
  add column if not exists inflation_source_institution text not null default 'Central Bank of the Republic of Turkiye (TCMB)',
  add column if not exists inflation_source_method text not null default 'Official EVDS API';
