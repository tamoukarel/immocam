-- Schéma ImmoCam — à exécuter dans l'éditeur SQL de Supabase
-- (Project > SQL Editor > New query) une fois le projet Supabase créé.
--
-- Auth : téléphone + OTP (Supabase Auth, provider "Phone"). Nécessite un
-- fournisseur SMS configuré côté projet Supabase (Twilio ou équivalent) —
-- voir Project Settings > Authentication > Phone Auth.
--
-- Si ce schéma a déjà été exécuté une première fois sur ce projet Supabase,
-- relance-le tel quel : les `create table`/`create policy` déjà en place
-- renverront une erreur "already exists" à ignorer, mais les sections
-- modifiées (policies `profils`, `annonces`, nouvelle table `profils_prive`
-- et `signalements`) doivent être rejouées pour appliquer les correctifs.
-- Si `profils` contient déjà des données, migre la colonne `telephone`
-- avant de la supprimer :
--   insert into profils_prive (id, telephone) select id, telephone from profils;
--   alter table profils drop column telephone;
-- Si `annonces` existe déjà sans avance_mois/caution_mois :
--   alter table annonces add column if not exists avance_mois integer, add column if not exists caution_mois integer;
--   alter table annonces add constraint avance_mois_positif check (avance_mois is null or avance_mois > 0);
--   alter table annonces add constraint caution_mois_positif check (caution_mois is null or caution_mois > 0);
-- Si `annonces` existe déjà sans vues/niveau/distance_route/video, ou
-- `profils` sans `photo`/`est_admin`, ou sans la fonction increment_vues,
-- rejoue simplement les blocs correspondants plus bas dans ce fichier
-- (colonnes en `add column if not exists`, fonction en `create or replace`,
-- bucket en `on conflict do update`). Pense aussi à activer un compte admin :
--   update profils set est_admin = true where id = '...';

create type type_annonce as enum ('location', 'vente');
create type statut_annonce as enum ('dispo', 'loue');

-- Un profil par utilisateur connecté (propriétaire et/ou locataire — les
-- deux rôles se recoupent, pas de distinction stricte comme dans EcoleConnect).
-- Ne contient que des données non sensibles : la lecture est publique
-- (nécessaire pour l'annuaire coloc et les jointures). Le téléphone vit à
-- part, dans `profils_prive`, en lecture restreinte (voir plus bas).
create table profils (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text,
  -- Chemin d'objet dans le bucket "annonces" (même bucket/policies que les
  -- photos d'annonces, sous {user_id}/...).
  photo text,
  -- Donne accès à la page /profil/signalements (le seul usage pour
  -- l'instant). Pas d'interface d'admin pour changer ça : à activer
  -- manuellement via `update profils set est_admin = true where id = ...`.
  est_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Numéro de téléphone, séparé de `profils` pour ne jamais l'exposer en
-- lecture publique. Dupliqué depuis auth.users.phone pour pouvoir l'afficher
-- côté client sans appel admin ; source de vérité = auth.users.
create table profils_prive (
  id uuid primary key references profils(id) on delete cascade,
  telephone text not null
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
  -- Nombre de mois de loyer demandés d'avance / en caution à la signature
  -- (sans objet pour les annonces de type 'vente' — laissés null).
  avance_mois integer check (avance_mois is null or avance_mois > 0),
  caution_mois integer check (caution_mois is null or caution_mois > 0),
  -- 'rdc' ou 'etage' ; sans objet pour un terrain, laissé null.
  niveau text,
  -- Distance au goudron le plus proche, en langage courant camerounais
  -- ('Sur le goudron', '< 100m', '150F de moto'…) plutôt qu'en mètres exacts.
  distance_route text,
  vues integer not null default 0,
  -- Chemin d'objet dans le bucket "annonces" (même bucket que les photos,
  -- limité à 15 Mo en écriture — voir storage.buckets.file_size_limit plus
  -- bas — pour couvrir la limite de 10 Mo appliquée côté client).
  video text,
  created_at timestamptz not null default now()
);

-- Incrémentation atomique du compteur de vues, appelée depuis la fiche
-- détail. SECURITY DEFINER + portée volontairement étroite (un seul id,
-- une seule colonne) car un visiteur anonyme n'a pas le droit de modifier
-- une annonce via la policy "modifier ses propres annonces" — cette
-- fonction est la seule porte dérobée, et elle ne touche que `vues`.
create or replace function increment_vues(p_annonce_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update annonces set vues = vues + 1 where id = p_annonce_id;
$$;

grant execute on function increment_vues(uuid) to anon, authenticated;

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

-- Signalement d'une annonce (arnaque, fausse annonce, déjà louée…). Pas de
-- back-office pour l'instant : Karel consulte la table directement depuis
-- le dashboard Supabase (Table Editor) pour modérer manuellement.
create table signalements (
  id uuid primary key default gen_random_uuid(),
  annonce_id uuid not null references annonces(id) on delete cascade,
  expediteur_id uuid references profils(id) on delete set null,
  motif text not null,
  created_at timestamptz not null default now()
);

-- Index de recherche : les pages Annonces/Budget filtrent systématiquement
-- par ville + type puis trient par prix ou date.
create index idx_annonces_ville on annonces (ville);
create index idx_annonces_type_prix on annonces (type, prix);
create index idx_annonces_proprietaire on annonces (proprietaire_id);
create index idx_annonces_statut on annonces (statut);
create index idx_signalements_annonce on signalements (annonce_id);

alter table profils enable row level security;
alter table profils_prive enable row level security;
alter table annonces enable row level security;
alter table favoris enable row level security;
alter table demandes_contact enable row level security;
alter table alertes_prix enable row level security;
alter table profils_coloc enable row level security;
alter table signalements enable row level security;

-- Lecture publique du nom (uniquement) : sert aux jointures depuis
-- profils_coloc (annuaire coloc) et demandes_contact. Aucune donnée
-- sensible dans cette table, donc `using (true)` est sans risque ici.
create policy "lecture publique des profils" on profils
  for select using (true);
create policy "creer son propre profil" on profils
  for insert with check (id = auth.uid());
create policy "modifier son propre profil" on profils
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Téléphone : jamais public. Visible seulement par son propriétaire, et par
-- le propriétaire d'une annonce à qui ce profil a envoyé une demande de
-- contact (pour qu'il puisse rappeler depuis "Messages reçus").
create policy "voir son propre telephone" on profils_prive
  for select using (
    id = auth.uid()
    or exists (
      select 1 from demandes_contact d
      where d.expediteur_id = profils_prive.id
        and d.proprietaire_id = auth.uid()
    )
  );
create policy "creer son propre telephone" on profils_prive
  for insert with check (id = auth.uid());
create policy "modifier son propre telephone" on profils_prive
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Annonces publiques en lecture (pas besoin de compte pour parcourir/chercher
-- un logement, seulement pour publier ou contacter).
create policy "lecture publique des annonces" on annonces
  for select using (true);
create policy "creer ses propres annonces" on annonces
  for insert with check (proprietaire_id = auth.uid());
create policy "modifier ses propres annonces" on annonces
  for update using (proprietaire_id = auth.uid()) with check (proprietaire_id = auth.uid());
create policy "supprimer ses propres annonces" on annonces
  for delete using (proprietaire_id = auth.uid());
-- Modération : un admin (voir profils.est_admin) peut retirer n'importe
-- quelle annonce signalée, pas seulement les siennes.
create policy "admin supprime nimporte quelle annonce" on annonces
  for delete using (exists (select 1 from profils p where p.id = auth.uid() and p.est_admin));

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
  for update using (utilisateur_id = auth.uid()) with check (utilisateur_id = auth.uid());
create policy "supprimer son profil coloc" on profils_coloc
  for delete using (utilisateur_id = auth.uid());

-- Signalements : n'importe qui peut signaler une annonce (même sans compte,
-- pour ne pas dissuader de signaler une arnaque) ; seul un compte admin
-- (profils.est_admin) peut relire la liste, depuis /profil/signalements.
create policy "signaler une annonce" on signalements
  for insert with check (true);
create policy "admin voit tous les signalements" on signalements
  for select using (exists (select 1 from profils p where p.id = auth.uid() and p.est_admin));
create policy "admin supprime les signalements traites" on signalements
  for delete using (exists (select 1 from profils p where p.id = auth.uid() and p.est_admin));

-- Storage : bucket "annonces" pour les photos (public en lecture, écriture
-- restreinte au propriétaire dans son propre dossier {user_id}/...).
insert into storage.buckets (id, name, public, file_size_limit) values ('annonces', 'annonces', true, 15728640)
on conflict (id) do update set file_size_limit = 15728640;

create policy "lecture publique des photos d'annonces" on storage.objects
  for select using (bucket_id = 'annonces');
create policy "upload de ses propres photos" on storage.objects
  for insert with check (bucket_id = 'annonces' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "suppression de ses propres photos" on storage.objects
  for delete using (bucket_id = 'annonces' and (storage.foldername(name))[1] = auth.uid()::text);
