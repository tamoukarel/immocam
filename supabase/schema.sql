-- Schéma ImmoCam — à exécuter dans l'éditeur SQL de Supabase
-- (Project > SQL Editor > New query) une fois le projet Supabase créé.
--
-- Auth : téléphone + OTP (Supabase Auth, provider "Phone"). Nécessite un
-- fournisseur SMS configuré côté projet Supabase (Twilio ou équivalent) —
-- voir Project Settings > Authentication > Phone Auth.

create type type_annonce as enum ('location', 'vente');
create type statut_annonce as enum ('dispo', 'loue');

-- Un profil par utilisateur connecté (propriétaire et/ou locataire — les
-- deux rôles se recoupent, pas de distinction stricte comme dans EcoleConnect).
create table profils (
  id uuid primary key references auth.users(id) on delete cascade,
  -- Dupliqué depuis auth.users.phone pour pouvoir l'afficher/l'utiliser
  -- côté client sans appel admin ; source de vérité = auth.users.
  telephone text not null,
  nom text,
  created_at timestamptz not null default now()
);

create table annonces (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null references profils(id) on delete cascade,
  type type_annonce not null,
  ville text not null,
  quartier text not null,
  pieces text not null,
  prix integer not null check (prix > 0),
  -- '/mois', '/nuit' (courte durée) ou '' (vente) — affiché tel quel après le prix.
  unite text not null default '',
  description text not null default '',
  -- Contact direct : pas de messagerie interne, la mise en relation se fait
  -- sur WhatsApp (voir demandes_contact pour la trace côté propriétaire).
  whatsapp text not null,
  -- Jusqu'à 5 chemins d'objets dans le bucket Storage "annonces" (pas des
  -- URLs complètes, pour pouvoir régénérer des URLs signées si le bucket
  -- passe un jour en privé).
  photos text[] not null default '{}',
  statut statut_annonce not null default 'dispo',
  est_courte_duree boolean not null default false,
  created_at timestamptz not null default now()
);

create table favoris (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references profils(id) on delete cascade,
  annonce_id uuid not null references annonces(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (utilisateur_id, annonce_id)
);

-- Trace un clic "Contacter sur WhatsApp" : la conversation elle-même a lieu
-- sur WhatsApp (hors Supabase), mais le propriétaire voit qui s'est montré
-- intéressé depuis "Mon Profil > Messages reçus".
create table demandes_contact (
  id uuid primary key default gen_random_uuid(),
  annonce_id uuid not null references annonces(id) on delete cascade,
  proprietaire_id uuid not null references profils(id) on delete cascade,
  expediteur_id uuid references profils(id) on delete set null,
  created_at timestamptz not null default now()
);

create table alertes_prix (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references profils(id) on delete cascade,
  ville text not null,
  budget_max integer not null check (budget_max > 0),
  type type_annonce not null,
  created_at timestamptz not null default now()
);

-- Annuaire public "je cherche un·e coloc" (module Colocation étudiants) —
-- un profil par utilisateur, visible par tous pour permettre le contact.
create table profils_coloc (
  utilisateur_id uuid primary key references profils(id) on delete cascade,
  universite text not null,
  filiere text not null,
  budget integer not null check (budget > 0),
  created_at timestamptz not null default now()
);

-- Index de recherche : les pages Annonces/Budget filtrent systématiquement
-- par ville + type puis trient par prix ou date.
create index idx_annonces_ville on annonces (ville);
create index idx_annonces_type_prix on annonces (type, prix);
create index idx_annonces_proprietaire on annonces (proprietaire_id);

alter table profils enable row level security;
alter table annonces enable row level security;
alter table favoris enable row level security;
alter table demandes_contact enable row level security;
alter table alertes_prix enable row level security;
alter table profils_coloc enable row level security;

-- Lecture publique (comme annonces.whatsapp, déjà visible de tous) : sert
-- aux jointures depuis profils_coloc (annuaire coloc) et demandes_contact
-- (le propriétaire voit le nom/téléphone de qui l'a contacté).
create policy "lecture publique des profils" on profils
  for select using (true);
create policy "creer son propre profil" on profils
  for insert with check (id = auth.uid());
create policy "modifier son propre profil" on profils
  for update using (id = auth.uid());

-- Annonces publiques en lecture (pas besoin de compte pour parcourir/chercher
-- un logement, seulement pour publier ou contacter).
create policy "lecture publique des annonces" on annonces
  for select using (true);
create policy "creer ses propres annonces" on annonces
  for insert with check (proprietaire_id = auth.uid());
create policy "modifier ses propres annonces" on annonces
  for update using (proprietaire_id = auth.uid());
create policy "supprimer ses propres annonces" on annonces
  for delete using (proprietaire_id = auth.uid());

create policy "voir ses propres favoris" on favoris
  for select using (utilisateur_id = auth.uid());
create policy "ajouter ses propres favoris" on favoris
  for insert with check (utilisateur_id = auth.uid());
create policy "retirer ses propres favoris" on favoris
  for delete using (utilisateur_id = auth.uid());

-- N'importe quel utilisateur connecté peut signaler un contact (c'est lui
-- l'expéditeur) ; seul le propriétaire de l'annonce visée peut consulter
-- la liste ensuite.
create policy "signaler une demande de contact" on demandes_contact
  for insert with check (expediteur_id = auth.uid());
create policy "voir les demandes sur ses annonces" on demandes_contact
  for select using (proprietaire_id = auth.uid());

create policy "gerer ses propres alertes" on alertes_prix
  for all using (utilisateur_id = auth.uid()) with check (utilisateur_id = auth.uid());

-- Annuaire coloc public en lecture (comme les annonces), écriture limitée
-- à son propre profil.
create policy "lecture publique des profils coloc" on profils_coloc
  for select using (true);
create policy "creer son profil coloc" on profils_coloc
  for insert with check (utilisateur_id = auth.uid());
create policy "modifier son profil coloc" on profils_coloc
  for update using (utilisateur_id = auth.uid());
create policy "supprimer son profil coloc" on profils_coloc
  for delete using (utilisateur_id = auth.uid());

-- Storage : bucket "annonces" pour les photos (public en lecture, écriture
-- restreinte au propriétaire dans son propre dossier {user_id}/...).
insert into storage.buckets (id, name, public) values ('annonces', 'annonces', true)
on conflict (id) do nothing;

create policy "lecture publique des photos d'annonces" on storage.objects
  for select using (bucket_id = 'annonces');
create policy "upload de ses propres photos" on storage.objects
  for insert with check (bucket_id = 'annonces' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "suppression de ses propres photos" on storage.objects
  for delete using (bucket_id = 'annonces' and (storage.foldername(name))[1] = auth.uid()::text);
