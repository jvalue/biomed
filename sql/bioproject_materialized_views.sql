-- ============================================================================
-- Materialized Views for NCBI BioProject Database
-- ============================================================================
-- These views flatten the deeply normalized hierarchical XML schema
-- into fast, query-optimized views for downstream analytical workloads,
-- search APIs, and MCP services.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS bioproject;
SET search_path = bioproject, public;

-- ----------------------------------------------------------------------------
-- 1. Main Project Overview View
-- ----------------------------------------------------------------------------
-- Combines project accession, archive ID, metadata description, organism
-- taxonomy, and aggregated counts of publications and external links.
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_bioproject_overview AS
SELECT
    arch.accession,
    arch.archive,
    arch.id_value AS archive_project_id,
    TRIM(REGEXP_REPLACE(REGEXP_REPLACE(descr.name, '<[^>]+>', '', 'g'), '\s+', ' ', 'g')) AS project_name,
    TRIM(REGEXP_REPLACE(REGEXP_REPLACE(descr.title, '<[^>]+>', '', 'g'), '\s+', ' ', 'g')) AS project_title,
    TRIM(REGEXP_REPLACE(REGEXP_REPLACE(descr.description, '<[^>]+>', '', 'g'), '\s+', ' ', 'g')) AS project_description,
    descr.description AS project_description_raw,
    -- Organism taxonomy (coalesced between Single Organism & Admin types)
    COALESCE(org_single.taxid, org_admin.taxid) AS taxid,
    COALESCE(org_single.species, org_admin.species) AS species_taxid,
    COALESCE(org_single.organismname, org_admin.organismname) AS organism_name,
    COALESCE(org_single.strain, org_admin.strain) AS strain,
    COALESCE(org_single.isolatename, org_admin.isolatename) AS isolate_name,
    COALESCE(org_single.supergroup, org_admin.supergroup) AS supergroup,
    -- Project Type Classification
    CASE
        WHEN org_single.id IS NOT NULL THEN 'SingleOrganism'
        WHEN org_admin.id IS NOT NULL THEN 'Admin'
        ELSE 'Other'
    END AS project_type,
    -- Counts
    COALESCE(pub_counts.pub_count, 0) AS publication_count,
    COALESCE(link_counts.link_count, 0) AS external_link_count,
    -- Root IDs
    pkg.id AS package_id,
    prj_core.id AS project_core_id
FROM set_pkg pkg
JOIN set_pkg_prj prj 
    ON prj.set_pkg_id = pkg.id
JOIN set_pkg_prj_core prj_core 
    ON prj_core.set_pkg_prj_id = prj.id
-- Archive Accession / ID
LEFT JOIN set_pkg_prj_core_id prj_id 
    ON prj_id.set_pkg_prj_core_id = prj_core.id
LEFT JOIN set_pkg_prj_core_id_archive arch 
    ON arch.set_pkg_prj_core_id_id = prj_id.id
-- Project Description & Titles
LEFT JOIN set_pkg_prj_core_descr descr 
    ON descr.set_pkg_prj_core_id = prj_core.id
-- Organism (Single Organism Branch)
LEFT JOIN set_pkg_prj_core_type prj_type 
    ON prj_type.set_pkg_prj_core_id = prj_core.id
LEFT JOIN set_pkg_prj_core_type_single type_single 
    ON type_single.set_pkg_prj_core_type_id = prj_type.id
LEFT JOIN set_pkg_prj_core_type_single_org org_single 
    ON org_single.set_pkg_prj_core_type_single_id = type_single.id
-- Organism (Admin Branch)
LEFT JOIN set_pkg_prj_core_type_admin type_admin 
    ON type_admin.set_pkg_prj_core_type_id = prj_type.id
LEFT JOIN set_pkg_prj_core_type_admin_org org_admin 
    ON org_admin.set_pkg_prj_core_type_admin_id = type_admin.id
-- Publication Aggregate Subquery
LEFT JOIN (
    SELECT 
        d.set_pkg_prj_core_id, 
        COUNT(p.id) AS pub_count
    FROM set_pkg_prj_core_descr d
    JOIN set_pkg_prj_core_descr_pub p 
        ON p.set_pkg_prj_core_descr_id = d.id
    GROUP BY d.set_pkg_prj_core_id
) pub_counts ON pub_counts.set_pkg_prj_core_id = prj_core.id
-- External Link Aggregate Subquery
LEFT JOIN (
    SELECT 
        d.set_pkg_prj_core_id, 
        COUNT(l.id) AS link_count
    FROM set_pkg_prj_core_descr d
    JOIN set_pkg_prj_core_descr_link l 
        ON l.set_pkg_prj_core_descr_id = d.id
    GROUP BY d.set_pkg_prj_core_id
) link_counts ON link_counts.set_pkg_prj_core_id = prj_core.id
WITH DATA;

-- Indexes for Fast Lookups on Project Overview
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_bioproject_overview_accession 
    ON mv_bioproject_overview(accession);
CREATE INDEX IF NOT EXISTS idx_mv_bioproject_overview_taxid 
    ON mv_bioproject_overview(taxid);
CREATE INDEX IF NOT EXISTS idx_mv_bioproject_overview_organism_name 
    ON mv_bioproject_overview(organism_name);
CREATE INDEX IF NOT EXISTS idx_mv_bioproject_overview_supergroup 
    ON mv_bioproject_overview(supergroup);


-- ----------------------------------------------------------------------------
-- 2. Publications & Citations View
-- ----------------------------------------------------------------------------
-- Flattens PubMed references, journal citations, and author lists per project.
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_bioproject_publications AS
SELECT
    arch.accession,
    pub.id_value AS pubmed_id,
    pub.date AS publication_date,
    pub.status AS publication_status,
    pub.dbtype AS db_type,
    TRIM(REGEXP_REPLACE(REGEXP_REPLACE(cite.title, '<[^>]+>', '', 'g'), '\s+', ' ', 'g')) AS article_title,
    j.journaltitle AS journal_title,
    j.year AS publication_year,
    j.volume,
    j.issue,
    j.pagesfrom AS pages_from,
    j.pagesto AS pages_to,
    -- Aggregated list of authors: "First Last" or "Consortium"
    (
        SELECT string_agg(
            COALESCE(
                NULLIF(TRIM(CONCAT_WS(' ', an.first, an.middle, an.last, an.suffix)), ''),
                a.consortium
            ),
            '; ' ORDER BY a.id
        )
        FROM set_pkg_prj_core_descr_pub_cite_auth_author a
        JOIN set_pkg_prj_core_descr_pub_cite_auth auth 
            ON auth.id = a.set_pkg_prj_core_descr_pub_cite_auth_id
        LEFT JOIN set_pkg_prj_core_descr_pub_cite_auth_author_name an 
            ON an.set_pkg_prj_core_descr_pub_cite_auth_author_id = a.id
        WHERE auth.set_pkg_prj_core_descr_pub_cite_id = cite.id
    ) AS authors,
    pub.id AS publication_row_id
FROM set_pkg_prj_core_descr_pub pub
JOIN set_pkg_prj_core_descr descr 
    ON descr.id = pub.set_pkg_prj_core_descr_id
JOIN set_pkg_prj_core prj_core 
    ON prj_core.id = descr.set_pkg_prj_core_id
LEFT JOIN set_pkg_prj_core_id prj_id 
    ON prj_id.set_pkg_prj_core_id = prj_core.id
LEFT JOIN set_pkg_prj_core_id_archive arch 
    ON arch.set_pkg_prj_core_id_id = prj_id.id
LEFT JOIN set_pkg_prj_core_descr_pub_cite cite 
    ON cite.set_pkg_prj_core_descr_pub_id = pub.id
LEFT JOIN set_pkg_prj_core_descr_pub_cite_journal j 
    ON j.set_pkg_prj_core_descr_pub_cite_id = cite.id
WITH DATA;

-- Indexes for Fast Publication Searches
CREATE INDEX IF NOT EXISTS idx_mv_bioproject_pub_accession 
    ON mv_bioproject_publications(accession);
CREATE INDEX IF NOT EXISTS idx_mv_bioproject_pub_pubmed_id 
    ON mv_bioproject_publications(pubmed_id);
CREATE INDEX IF NOT EXISTS idx_mv_bioproject_pub_year 
    ON mv_bioproject_publications(publication_year);


-- ----------------------------------------------------------------------------
-- 3. Biological & Environmental Properties View
-- ----------------------------------------------------------------------------
-- Denormalizes environment, morphology, phenotype, and replicon metrics.
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_bioproject_biological_properties AS
SELECT
    arch.accession,
    org.taxid,
    org.organismname AS organism_name,
    org.strain,
    -- Environmental Properties
    env.habitat,
    env.salinity,
    env.oxygenreq AS oxygen_requirement,
    env.optimumtemperature AS optimum_temperature,
    env.temperaturerange AS temperature_range,
    -- Morphology
    morph.gram AS gram_stain,
    morph.enveloped,
    morph.endospores,
    morph.motility,
    shape.value AS shape,
    -- Phenotype & Disease
    pheno.bioticrelationship AS biotic_relationship,
    pheno.trophiclevel AS trophic_level,
    pheno.disease,
    -- Biological Sample
    sample.culturesample AS culture_sample,
    sample.cellsample AS cell_sample,
    sample.tissuesample AS tissue_sample,
    -- Replicons Summary
    reps.ploidy,
    reps_cnt.value AS replicon_count
FROM set_pkg_prj_core_type_single_org org
JOIN set_pkg_prj_core_type_single type_single 
    ON type_single.id = org.set_pkg_prj_core_type_single_id
JOIN set_pkg_prj_core_type prj_type 
    ON prj_type.id = type_single.set_pkg_prj_core_type_id
JOIN set_pkg_prj_core prj_core 
    ON prj_core.id = prj_type.set_pkg_prj_core_id
LEFT JOIN set_pkg_prj_core_id prj_id 
    ON prj_id.set_pkg_prj_core_id = prj_core.id
LEFT JOIN set_pkg_prj_core_id_archive arch 
    ON arch.set_pkg_prj_core_id_id = prj_id.id
-- Biological Properties
LEFT JOIN set_pkg_prj_core_type_single_org_bio bio 
    ON bio.set_pkg_prj_core_type_single_org_id = org.id
LEFT JOIN set_pkg_prj_core_type_single_org_bio_env env 
    ON env.set_pkg_prj_core_type_single_org_bio_id = bio.id
LEFT JOIN set_pkg_prj_core_type_single_org_bio_morph morph 
    ON morph.set_pkg_prj_core_type_single_org_bio_id = bio.id
LEFT JOIN set_pkg_prj_core_type_single_org_bio_morph_shape shape 
    ON shape.set_pkg_prj_core_type_single_org_bio_morph_id = morph.id
LEFT JOIN set_pkg_prj_core_type_single_org_bio_pheno pheno 
    ON pheno.set_pkg_prj_core_type_single_org_bio_id = bio.id
LEFT JOIN set_pkg_prj_core_type_single_org_bio_sample sample 
    ON sample.set_pkg_prj_core_type_single_org_bio_id = bio.id
LEFT JOIN set_pkg_prj_core_type_single_org_reps reps 
    ON reps.set_pkg_prj_core_type_single_org_id = org.id
LEFT JOIN set_pkg_prj_core_type_single_org_reps_count reps_cnt 
    ON reps_cnt.set_pkg_prj_core_type_single_org_reps_id = reps.id
WITH DATA;

CREATE INDEX IF NOT EXISTS idx_mv_bioproject_bio_accession 
    ON mv_bioproject_biological_properties(accession);
CREATE INDEX IF NOT EXISTS idx_mv_bioproject_bio_disease 
    ON mv_bioproject_biological_properties(disease);
CREATE INDEX IF NOT EXISTS idx_mv_bioproject_bio_habitat 
    ON mv_bioproject_biological_properties(habitat);


-- ----------------------------------------------------------------------------
-- 4. External Links & Cross References View
-- ----------------------------------------------------------------------------
-- Flattens external project resource links and URLs.
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_bioproject_external_links AS
SELECT
    arch.accession,
    link.category,
    link.label,
    link.url,
    link.id AS link_row_id
FROM set_pkg_prj_core_descr_link link
JOIN set_pkg_prj_core_descr descr 
    ON descr.id = link.set_pkg_prj_core_descr_id
JOIN set_pkg_prj_core prj_core 
    ON prj_core.id = descr.set_pkg_prj_core_id
LEFT JOIN set_pkg_prj_core_id prj_id 
    ON prj_id.set_pkg_prj_core_id = prj_core.id
LEFT JOIN set_pkg_prj_core_id_archive arch 
    ON arch.set_pkg_prj_core_id_id = prj_id.id
WITH DATA;

CREATE INDEX IF NOT EXISTS idx_mv_bioproject_links_accession 
    ON mv_bioproject_external_links(accession);
CREATE INDEX IF NOT EXISTS idx_mv_bioproject_links_category 
    ON mv_bioproject_external_links(category);
