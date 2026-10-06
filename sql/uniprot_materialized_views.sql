-- ============================================================================
-- Materialized Views for UniProtKB Database (Swiss-Prot / TrEMBL)
-- ============================================================================
-- These views flatten the normalized hierarchical XML schema into fast,
-- query-optimized materialized views for GraphQL APIs, search, and MCP tools.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS uniprot;
SET search_path = uniprot, public;

-- ----------------------------------------------------------------------------
-- 1. Main Entry Overview View
-- ----------------------------------------------------------------------------
-- Combines entry metadata, primary accession, entry name, protein name,
-- primary gene name, organism taxonomy, and sequence length.
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_uniprot_entry_overview AS
WITH primary_acc AS (
    SELECT DISTINCT ON (uniprot_entry_id)
        uniprot_entry_id,
        value AS primary_accession
    FROM uniprot_entry_accession
    ORDER BY uniprot_entry_id, id
),
primary_name AS (
    SELECT DISTINCT ON (uniprot_entry_id)
        uniprot_entry_id,
        value AS entry_name
    FROM uniprot_entry_name
    ORDER BY uniprot_entry_id, id
),
primary_protein AS (
    SELECT DISTINCT ON (p.uniprot_entry_id)
        p.uniprot_entry_id,
        COALESCE(rec.fullname, sub.fullname) AS protein_name
    FROM uniprot_entry_protein p
    LEFT JOIN uniprot_entry_protein_rec_name rec ON rec.uniprot_entry_protein_id = p.id
    LEFT JOIN uniprot_entry_protein_sub_name sub ON sub.uniprot_entry_protein_id = p.id
    ORDER BY p.uniprot_entry_id, p.id
),
primary_gene AS (
    SELECT 
        g.uniprot_entry_id,
        string_agg(DISTINCT gn.value, ', ' ORDER BY gn.value) AS gene_names
    FROM uniprot_entry_gene g
    JOIN uniprot_entry_gene_name gn ON gn.uniprot_entry_gene_id = g.id
    GROUP BY g.uniprot_entry_id
),
primary_organism AS (
    SELECT DISTINCT ON (org.uniprot_entry_id)
        org.uniprot_entry_id,
        orgn.value AS organism_name,
        tax.id_value AS taxid
    FROM uniprot_entry_organism org
    LEFT JOIN uniprot_entry_organism_name orgn ON orgn.uniprot_entry_organism_id = org.id
    LEFT JOIN uniprot_entry_organism_dbreference tax 
        ON tax.uniprot_entry_organism_id = org.id AND tax.type = 'NCBI Taxonomy'
    ORDER BY org.uniprot_entry_id, org.id, orgn.id
)
SELECT
    e.id AS entry_id,
    acc.primary_accession,
    n.entry_name,
    e.dataset,
    prot.protein_name,
    g.gene_names,
    org.organism_name,
    org.taxid,
    LENGTH(e.sequence) AS sequence_length,
    e.sequence,
    e.version,
    e.created,
    e.modified,
    e._xml_hash
FROM uniprot_entry e
LEFT JOIN primary_acc acc ON acc.uniprot_entry_id = e.id
LEFT JOIN primary_name n ON n.uniprot_entry_id = e.id
LEFT JOIN primary_protein prot ON prot.uniprot_entry_id = e.id
LEFT JOIN primary_gene g ON g.uniprot_entry_id = e.id
LEFT JOIN primary_organism org ON org.uniprot_entry_id = e.id
WITH DATA;

-- Indexes on Main Entry Overview
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_uniprot_entry_overview_id 
    ON mv_uniprot_entry_overview(entry_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_uniprot_entry_overview_acc 
    ON mv_uniprot_entry_overview(primary_accession);
CREATE INDEX IF NOT EXISTS idx_mv_uniprot_entry_overview_name 
    ON mv_uniprot_entry_overview(entry_name);
CREATE INDEX IF NOT EXISTS idx_mv_uniprot_entry_overview_prot 
    ON mv_uniprot_entry_overview(protein_name);
CREATE INDEX IF NOT EXISTS idx_mv_uniprot_entry_overview_gene 
    ON mv_uniprot_entry_overview(gene_names);
CREATE INDEX IF NOT EXISTS idx_mv_uniprot_entry_overview_org 
    ON mv_uniprot_entry_overview(organism_name);
CREATE INDEX IF NOT EXISTS idx_mv_uniprot_entry_overview_taxid 
    ON mv_uniprot_entry_overview(taxid);
CREATE INDEX IF NOT EXISTS idx_mv_uniprot_entry_overview_dataset 
    ON mv_uniprot_entry_overview(dataset);


-- ----------------------------------------------------------------------------
-- 2. Secondary & Alternative Accessions View
-- ----------------------------------------------------------------------------
-- Maps all accession numbers (primary and secondary) to the entry.
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_uniprot_accessions AS
SELECT
    acc.uniprot_entry_id AS entry_id,
    acc.value AS accession,
    acc.id AS accession_id
FROM uniprot_entry_accession acc
WITH DATA;

CREATE INDEX IF NOT EXISTS idx_mv_uniprot_acc_entry_id 
    ON mv_uniprot_accessions(entry_id);
CREATE INDEX IF NOT EXISTS idx_mv_uniprot_acc_accession 
    ON mv_uniprot_accessions(accession);


-- ----------------------------------------------------------------------------
-- 3. External Database Cross-References View
-- ----------------------------------------------------------------------------
-- Flattens cross-references (PDB, RefSeq, Ensembl, EMBL, AlphaFold, GO, etc.)
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_uniprot_cross_references AS
SELECT
    db.uniprot_entry_id AS entry_id,
    db.type AS database_type,
    db.id_value AS database_id,
    db.id AS dbreference_id
FROM uniprot_entry_dbreference db
WITH DATA;

CREATE INDEX IF NOT EXISTS idx_mv_uniprot_xref_entry_id 
    ON mv_uniprot_cross_references(entry_id);
CREATE INDEX IF NOT EXISTS idx_mv_uniprot_xref_type 
    ON mv_uniprot_cross_references(database_type);
CREATE INDEX IF NOT EXISTS idx_mv_uniprot_xref_db_id 
    ON mv_uniprot_cross_references(database_id);
CREATE INDEX IF NOT EXISTS idx_mv_uniprot_xref_type_id 
    ON mv_uniprot_cross_references(database_type, database_id);


-- ----------------------------------------------------------------------------
-- 4. Functional & Structural Comments View
-- ----------------------------------------------------------------------------
-- Flattens functional annotations, subcellular locations, catalytic activities,
-- disease associations, and pathway descriptions.
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_uniprot_comments AS
SELECT
    c.uniprot_entry_id AS entry_id,
    c.type AS comment_type,
    ct.value AS comment_text,
    c.id AS comment_id
FROM uniprot_entry_comment c
LEFT JOIN uniprot_entry_comment_text ct ON ct.uniprot_entry_comment_id = c.id
WITH DATA;

CREATE INDEX IF NOT EXISTS idx_mv_uniprot_comment_entry_id 
    ON mv_uniprot_comments(entry_id);
CREATE INDEX IF NOT EXISTS idx_mv_uniprot_comment_type 
    ON mv_uniprot_comments(comment_type);


-- ----------------------------------------------------------------------------
-- 5. Keywords View
-- ----------------------------------------------------------------------------
-- Flattens UniProt controlled vocabulary keywords per entry.
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_uniprot_keywords AS
SELECT
    k.uniprot_entry_id AS entry_id,
    k.value AS keyword,
    k.id AS keyword_id
FROM uniprot_entry_keyword k
WITH DATA;

CREATE INDEX IF NOT EXISTS idx_mv_uniprot_kw_entry_id 
    ON mv_uniprot_keywords(entry_id);
CREATE INDEX IF NOT EXISTS idx_mv_uniprot_kw_keyword 
    ON mv_uniprot_keywords(keyword);


-- ----------------------------------------------------------------------------
-- 6. Sequence Features & Mutations View
-- ----------------------------------------------------------------------------
-- Flattens sequence features (active sites, binding sites, domains, mutations).
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_uniprot_features AS
SELECT
    f.uniprot_entry_id AS entry_id,
    f.type AS feature_type,
    f.id_value AS feature_id,
    f.description,
    f.id AS feature_row_id
FROM uniprot_entry_feature f
WITH DATA;

CREATE INDEX IF NOT EXISTS idx_mv_uniprot_feat_entry_id 
    ON mv_uniprot_features(entry_id);
CREATE INDEX IF NOT EXISTS idx_mv_uniprot_feat_type 
    ON mv_uniprot_features(feature_type);
CREATE INDEX IF NOT EXISTS idx_mv_uniprot_feat_id_value 
    ON mv_uniprot_features(feature_id);
