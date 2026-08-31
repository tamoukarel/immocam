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
-- Si `profils` existe déjà sans `est_verifie`, ou `alertes_prix` sans
-- `derniere_vue_at` :
--   alter table profils add column if not exists est_verifie boolean not null default false;
--   alter table alertes_prix add column if not exists derniere_vue_at timestamptz not null default now();
--   revoke update (est_admin, est_verifie, est_premium_gestion) on table profils from authenticated, anon;
-- Si le panneau admin /profil/verification-profils n'a pas encore été
-- déployé sur ce projet (policy "admin lit tous les telephones" et
-- fonction verifier_profil absentes), rejoue les blocs correspondants plus
-- bas dans ce fichier.
-- Si la gestion locative a été déployée avec l'ancienne limite freemium
-- (1 bien gratuit) plutôt que la nouvelle (3 locataires gratuits) :
--   drop policy if exists "creer un bien selon limite freemium" on biens_geres;
--   drop policy if exists "gerer les locataires de ses propres biens" on locataires_geres;
--   -- puis rejouer les policies biens_geres/locataires_geres plus bas dans ce fichier.
-- Si la policy "creer un locataire selon limite freemium" existe déjà mais
-- interroge encore locataires_geres directement (bug de récursion infinie,
-- corrigé le 2026-08-29) :
--   drop policy if exists "creer un locataire selon limite freemium" on locataires_geres;
--   -- puis rejouer la fonction nb_locataires_actifs et la policy plus bas.

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
  -- Badge "profil vérifié" affiché sur les annonces. Posé manuellement par
  -- Karel via le Table Editor Supabase après vérification (pièce d'identité
  -- + justificatif de propriété envoyés par WhatsApp), jamais automatique.
  est_verifie boolean not null default false,
  -- Débloque la gestion illimitée de biens (module "Gestion locative",
  -- 1000 FCFA/mois). Gratuit jusqu'à 1 bien géré (voir policy d'insertion
  -- sur biens_geres). Activé manuellement par Karel après paiement Mobile
  -- Money, via le panneau /profil/verification-profils (même mécanisme
  -- que est_verifie) — jamais par le propriétaire lui-même.
  est_premium_gestion boolean not null default false,
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

-- Bascule le badge "profil vérifié". Le revoke sur profils.est_verifie
-- (voir plus haut) empêche toute écriture directe depuis le client, même
-- par un admin : la fonction s'exécute avec les privilèges de son
-- propriétaire (security definer), et fait elle-même le contrôle est_admin
-- sur l'appelant avant d'écrire. Utilisée par /profil/verification-profils.
create or replace function verifier_profil(p_profil_id uuid, p_verifie boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profils where id = auth.uid() and est_admin) then
    raise exception 'Non autorisé';
  end if;
  update profils set est_verifie = p_verifie where id = p_profil_id;
end;
$$;

grant execute on function verifier_profil(uuid, boolean) to authenticated;

-- Bascule l'accès premium au module "Gestion locative", même principe que
-- verifier_profil : le revoke sur profils.est_premium_gestion empêche
-- toute écriture directe, même par un admin ; la fonction fait le contrôle
-- est_admin elle-même. Karel l'appelle après réception du paiement Mobile
-- Money (1000 FCFA/mois), depuis /profil/verification-profils.
create or replace function activer_gestion_premium(p_profil_id uuid, p_actif boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profils where id = auth.uid() and est_admin) then
    raise exception 'Non autorisé';
  end if;
  update profils set est_premium_gestion = p_actif where id = p_profil_id;
end;
$$;

grant execute on function activer_gestion_premium(uuid, boolean) to authenticated;

-- Compte les locataires actifs d'un propriétaire, en contournant RLS. Une
-- policy d'insertion sur locataires_geres ne peut pas interroger
-- locataires_geres elle-même directement (Postgres détecte une récursion
-- infinie, la policy de lecture se redéclenchant sur la sous-requête) ; ce
-- security definer casse le cycle. Utilisée par la limite freemium.
create or replace function nb_locataires_actifs(p_proprietaire_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer from locataires_geres l
  join biens_geres b on b.id = l.bien_id
  where b.proprietaire_id = p_proprietaire_id and l.actif;
$$;

grant execute on function nb_locataires_actifs(uuid) to authenticated;

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
  created_at timestamptz not null default now(),
  -- Horodatage de la dernière fois où l'utilisateur a cliqué "Voir" sur
  -- cette alerte. Sert à compter les correspondances "nouvelles depuis ta
  -- dernière visite" (created_at > derniere_vue_at), distinct du total.
  derniere_vue_at timestamptz not null default now()
);

-- Module "Gestion locative" (payant au-delà d'1 bien, voir
-- profils.est_premium_gestion) : suivi manuel des loyers par le
-- propriétaire lui-même, aucun paiement réel n'est traité par l'app.
create table biens_geres (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null references profils(id) on delete cascade,
  nom text not null,
  adresse text not null default '',
  loyer_mensuel integer not null check (loyer_mensuel > 0),
  -- Jour du mois où le loyer est attendu (1-28, pour éviter les soucis de
  -- mois courts) ; sert au calcul des rappels d'échéance.
  jour_echeance integer not null check (jour_echeance between 1 and 28),
  created_at timestamptz not null default now()
);

-- Un locataire n'a pas besoin d'avoir de compte ImmoCam : c'est une simple
-- fiche que le propriétaire renseigne lui-même.
create table locataires_geres (
  id uuid primary key default gen_random_uuid(),
  bien_id uuid not null references biens_geres(id) on delete cascade,
  nom text not null,
  telephone text not null default '',
  date_debut_bail date,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Un enregistrement par locataire par mois, coché manuellement par le
-- propriétaire quand il a reçu le paiement (pas de traitement de paiement
-- réel — voir la note sur le module plus haut).
create table paiements_loyer (
  id uuid primary key default gen_random_uuid(),
  locataire_id uuid not null references locataires_geres(id) on delete cascade,
  -- Premier jour du mois concerné (ex: 2026-09-01), pas la date de paiement.
  mois date not null,
  loyer_nu integer not null check (loyer_nu >= 0),
  charges integer not null default 0 check (charges >= 0),
  date_paiement date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (locataire_id, mois)
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
alter table biens_geres enable row level security;
alter table locataires_geres enable row level security;
alter table paiements_loyer enable row level security;
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

-- Sécurité : la policy ci-dessus est volontairement large en row-level
-- (l'utilisateur doit pouvoir modifier nom/photo lui-même), mais RLS ne
-- restreint pas les colonnes modifiables au sein d'une ligne autorisée.
-- Sans ceci, n'importe quel utilisateur connecté pourrait s'auto-promouvoir
-- admin via `update profils set est_admin = true where id = auth.uid()`.
-- Ces colonnes ne sont modifiables que par le rôle "service_role"
-- (dashboard Supabase / futur back-office), jamais par l'utilisateur lui-même.
revoke update (est_admin, est_verifie, est_premium_gestion) on table profils from authenticated, anon;

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
-- Un admin peut voir le téléphone de n'importe quel profil, pour retrouver
-- la bonne personne quand elle envoie sa pièce d'identité par WhatsApp
-- (panneau /profil/verification-profils).
create policy "admin lit tous les telephones" on profils_prive
  for select using (exists (select 1 from profils p where p.id = auth.uid() and p.est_admin));
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

-- Gestion locative : entièrement privé, un propriétaire ne voit et ne gère
-- que ses propres biens/locataires/paiements. Créer un bien est toujours
-- libre (ça ne coûte rien en soi) ; la limite freemium (3 locataires actifs
-- gratuits au total, illimité si est_premium_gestion) porte sur le nombre
-- de LOCATAIRES suivis, pas de biens — c'est le vrai facteur de charge
-- pour le propriétaire, et ça laisse un propriétaire multi-biens ressentir
-- la valeur du tableau de bord avant de payer.
create policy "voir ses propres biens" on biens_geres
  for select using (proprietaire_id = auth.uid());
create policy "creer ses propres biens" on biens_geres
  for insert with check (proprietaire_id = auth.uid());
create policy "modifier ses propres biens" on biens_geres
  for update using (proprietaire_id = auth.uid());
create policy "supprimer ses propres biens" on biens_geres
  for delete using (proprietaire_id = auth.uid());

create policy "voir les locataires de ses propres biens" on locataires_geres
  for select using (
    exists (select 1 from biens_geres b where b.id = bien_id and b.proprietaire_id = auth.uid())
  );
create policy "creer un locataire selon limite freemium" on locataires_geres
  for insert with check (
    exists (select 1 from biens_geres b where b.id = bien_id and b.proprietaire_id = auth.uid())
    and (
      (select est_premium_gestion from profils where id = auth.uid())
      or nb_locataires_actifs(auth.uid()) < 3
    )
  );
create policy "modifier les locataires de ses propres biens" on locataires_geres
  for update using (
    exists (select 1 from biens_geres b where b.id = bien_id and b.proprietaire_id = auth.uid())
  );
create policy "supprimer les locataires de ses propres biens" on locataires_geres
  for delete using (
    exists (select 1 from biens_geres b where b.id = bien_id and b.proprietaire_id = auth.uid())
  );

create policy "gerer les paiements de ses propres locataires" on paiements_loyer
  for all using (
    exists (
      select 1 from locataires_geres l
      join biens_geres b on b.id = l.bien_id
      where l.id = locataire_id and b.proprietaire_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from locataires_geres l
      join biens_geres b on b.id = l.bien_id
      where l.id = locataire_id and b.proprietaire_id = auth.uid()
    )
  );

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
